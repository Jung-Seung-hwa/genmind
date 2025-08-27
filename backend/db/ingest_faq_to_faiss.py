# backend/db/ingest_faq_to_faiss.py
import os
import argparse
from dotenv import load_dotenv

from db.session import SessionLocal
from models.gpt import CompFAQ

from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.docstore.document import Document

def load_env():
    # backend/.env
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    load_dotenv(env_path)

def get_embeddings():
    model_name = os.getenv("EMBED_MODEL", "BM-K/KoSimCSE-roberta")
    return HuggingFaceEmbeddings(model_name=model_name)

def fetch_faqs(limit=None):
    db = SessionLocal()
    try:
        q = db.query(CompFAQ)
        if limit:
            q = q.limit(limit)
        rows = q.all()
        return rows
    finally:
        db.close()

def to_documents(rows):
    docs = []
    for r in rows:
        # 페이지 컨텐츠에 Q/A를 함께 넣어 검색 recall↑
        content = f"Q: {r.question}\nA: {r.answer}\n출처파일: {r.sc_file or ''}\n관련조문: {r.ref_article or ''}"
        meta = {
            "qa_id": r.qa_id,
            "comp_domain": r.comp_domain,
            "sc_file": r.sc_file,
            "ref_article": r.ref_article,
        }
        docs.append(Document(page_content=content, metadata=meta))
    return docs

def save_faiss(docs, embeddings, vstore_dir, mode="rebuild"):
    os.makedirs(vstore_dir, exist_ok=True)

    index_path = vstore_dir
    exists = os.path.exists(os.path.join(index_path, "index.faiss"))

    if mode == "rebuild" or not exists:
        vs = FAISS.from_documents(docs, embeddings)
        vs.save_local(index_path)
        return len(docs), "rebuild"
    else:
        # upsert 모드: 기존 로드 후 추가
        vs = FAISS.load_local(index_path, embeddings, allow_dangerous_deserialization=True)
        vs.add_documents(docs)
        vs.save_local(index_path)
        return len(docs), "upsert"

def main():
    load_env()

    parser = argparse.ArgumentParser(description="Ingest comp_faq -> FAISS")
    parser.add_argument("--limit", type=int, default=None, help="Rows limit for testing")
    parser.add_argument("--mode", choices=["rebuild", "upsert"], default="rebuild",
                        help="rebuild: 새로 생성, upsert: 기존 인덱스에 추가")
    args = parser.parse_args()

    vstore_dir = os.getenv("VSTORE_DIR", "backend/db/vector_store/faiss_langchain")

    print("[INFO] Loading FAQs from DB ...")
    rows = fetch_faqs(limit=args.limit)
    if not rows:
        raise RuntimeError("comp_faq 테이블에서 가져온 FAQ가 없습니다.")

    print(f"[INFO] Rows fetched: {len(rows)}")
    print("[INFO] Building documents ...")
    docs = to_documents(rows)

    print("[INFO] Loading embeddings ...")
    embeddings = get_embeddings()

    print(f"[INFO] Saving to FAISS at: {vstore_dir} (mode={args.mode})")
    count, mode_used = save_faiss(docs, embeddings, vstore_dir, mode=args.mode)

    print(f"[DONE] {mode_used} 완료. 저장 문서 수: {count}")

if __name__ == "__main__":
    main()
