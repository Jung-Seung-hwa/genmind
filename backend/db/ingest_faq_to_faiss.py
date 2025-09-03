# backend/db/ingest_faq_to_faiss.py
"""
comp_faq → FAISS 색인 유틸
- CLI 배치: 전체 재생성(rebuild) / 전체 추가(upsert)
- 프로그램 호출: 특정 faq_ids만 업서트(upsert_faqs_to_faiss)

필수 .env (backend/.env):
  EMBED_MODEL=BM-K/KoSimCSE-roberta
  VSTORE_DIR=backend/db/vector_store/faiss_langchain
"""

import os
import argparse
from typing import Iterable, List, Optional

from dotenv import load_dotenv
from sqlalchemy.orm import Session

from db.session import SessionLocal
# ⚠️ 중복 import 제거: 실제 테이블은 models.faq.CompFAQ 사용
from models.faq import CompFAQ

from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

# ---------------------------------------------------------------------
# Env & Embeddings
# ---------------------------------------------------------------------

def load_env():
    """Load backend/.env"""
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    load_dotenv(env_path)

_EMB = None
def get_embeddings():
    """Singleton embeddings"""
    global _EMB
    if _EMB is None:
        model_name = os.getenv("EMBED_MODEL", "BM-K/KoSimCSE-roberta")
        _EMB = HuggingFaceEmbeddings(model_name=model_name)
    return _EMB

def get_vstore_dir() -> str:
    return os.getenv("VSTORE_DIR", "backend/db/vector_store/faiss_langchain")

# ---------------------------------------------------------------------
# DB fetch
# ---------------------------------------------------------------------

def fetch_faqs(limit: Optional[int] = None,
               ids: Optional[Iterable[int]] = None,
               comp_domain: Optional[str] = None) -> List[CompFAQ]:
    """comp_faq에서 행을 조회"""
    db: Session = SessionLocal()
    try:
        q = db.query(CompFAQ)
        if ids:
            q = q.filter(CompFAQ.qa_id.in_(list(ids)))
        if comp_domain:
            q = q.filter(CompFAQ.comp_domain == comp_domain)
        if limit:
            q = q.limit(limit)
        rows = q.all()
        return rows
    finally:
        db.close()

# ---------------------------------------------------------------------
# Build FAISS inputs
# ---------------------------------------------------------------------

def build_texts_metas_ids(rows: List[CompFAQ]):
    """LangChain-FAISS에 넣을 texts/metas/ids 생성 (ids = qa_id 고정)"""
    texts, metas, ids = [], [], []
    for r in rows:
        texts.append(f"Q: {r.question}\nA: {r.answer}")
        metas.append({
            "qa_id": r.qa_id,
            "question": r.question,
            "sc_file": r.sc_file,
            "ref_article": r.ref_article,
            "comp_domain": r.comp_domain,
        })
        ids.append(str(r.qa_id))
    return texts, metas, ids

# ---------------------------------------------------------------------
# Vector store helpers
# ---------------------------------------------------------------------

def _load_vs():
    """기존 인덱스 로드 (없으면 빈 인덱스 생성)"""
    vstore_dir = get_vstore_dir()
    os.makedirs(vstore_dir, exist_ok=True)
    emb = get_embeddings()
    try:
        vs = FAISS.load_local(vstore_dir, emb, allow_dangerous_deserialization=True)
    except Exception:
        # 빈 인덱스 생성
        vs = FAISS.from_texts(texts=[], embedding=emb, metadatas=[])
    return vs

def _save_vs(vs):
    vstore_dir = get_vstore_dir()
    vs.save_local(vstore_dir)

def _delete_ids(vs, ids: Iterable[str]):
    if hasattr(vs, "docstore") and hasattr(vs.docstore, "delete"):
        for _id in ids:
            try:
                vs.docstore.delete(_id)
            except Exception:
                # 존재하지 않으면 무시
                pass

# ---------------------------------------------------------------------
# Public functions
# ---------------------------------------------------------------------

def rebuild_all(limit: Optional[int] = None,
                comp_domain: Optional[str] = None) -> int:
    """
    전체 재색인 (index.faiss를 새로 구성)
    """
    rows = fetch_faqs(limit=limit, comp_domain=comp_domain)
    if not rows:
        raise RuntimeError("comp_faq 테이블에서 가져온 FAQ가 없습니다.")

    texts, metas, ids = build_texts_metas_ids(rows)
    emb = get_embeddings()

    # 완전 재생성
    vs = FAISS.from_texts(texts=texts, metadatas=metas, embedding=emb, ids=ids)
    _save_vs(vs)
    return len(texts)

def upsert_all(limit: Optional[int] = None,
               comp_domain: Optional[str] = None) -> int:
    """
    기존 인덱스에 전체 추가(있는 id는 제거 후 재추가)
    """
    rows = fetch_faqs(limit=limit, comp_domain=comp_domain)
    if not rows:
        raise RuntimeError("comp_faq 테이블에서 가져온 FAQ가 없습니다.")

    texts, metas, ids = build_texts_metas_ids(rows)
    vs = _load_vs()

    # 동일 id 제거 후 추가
    _delete_ids(vs, ids)
    vs.add_texts(texts=texts, metadatas=metas, ids=ids, embedding=get_embeddings())
    _save_vs(vs)
    return len(texts)

def upsert_faqs_to_faiss(comp_domain: Optional[str],
                         faq_ids: Iterable[int]) -> int:
    """
    ✅ 프로그램에서 호출하는 업서트 함수 (API에서 BackgroundTasks로 사용)
    - comp_domain는 필터용(선택), faq_ids로 필요한 항목만 업서트
    """
    ids_list = list(faq_ids)
    if not ids_list:
        return 0

    rows = fetch_faqs(ids=ids_list, comp_domain=comp_domain)
    if not rows:
        return 0

    texts, metas, ids = build_texts_metas_ids(rows)
    vs = _load_vs()

    # 동일 id 제거 후 추가
    _delete_ids(vs, ids)
    vs.add_texts(texts=texts, metadatas=metas, ids=ids, embedding=get_embeddings())
    _save_vs(vs)
    return len(texts)

def rebuild_faiss_index(db: Session):
    """
    DB 전체 CompFAQ를 다시 임베딩해서 FAISS 인덱스를 새로 만듦.
    """
    faqs = db.query(CompFAQ).all()
    if not faqs:
        return

    vstore_dir = get_vstore_dir()
    if os.path.exists(vstore_dir):
        import shutil
        shutil.rmtree(vstore_dir)  # 디렉토리 전체 삭제

    # ✅ 완전 새로 만들기
    texts, metas, ids = build_texts_metas_ids(faqs)
    emb = get_embeddings()
    vs = FAISS.from_texts(texts=texts, metadatas=metas, embedding=emb, ids=ids)
    _save_vs(vs)
# ---------------------------------------------------------------------
# CLI entry
# ---------------------------------------------------------------------

def main():
    load_env()

    parser = argparse.ArgumentParser(description="Ingest comp_faq -> FAISS")
    parser.add_argument("--limit", type=int, default=None, help="Rows limit for testing")
    parser.add_argument("--mode", choices=["rebuild", "upsert"], default="rebuild",
                        help="rebuild: 새로 생성, upsert: 기존 인덱스에 추가/교체")
    parser.add_argument("--domain", type=str, default=None, help="특정 회사 도메인만 색인")
    args = parser.parse_args()

    if args.mode == "rebuild":
        print("[INFO] Rebuild index ...")
        count = rebuild_all(limit=args.limit, comp_domain=args.domain)
        print(f"[DONE] rebuild 완료. 저장 문서 수: {count}")
    else:
        print("[INFO] Upsert into existing index ...")
        count = upsert_all(limit=args.limit, comp_domain=args.domain)
        print(f"[DONE] upsert 완료. 반영 문서 수: {count}")

if __name__ == "__main__":
    main()
