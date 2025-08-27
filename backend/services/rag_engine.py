# backend/services/rag_engine.py
import os
from typing import List, Tuple

from dotenv import load_dotenv

# 임베딩/벡터스토어: KoSimCSE + FAISS (langchain 분리 패키지)
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

# OpenAI LLM (분리 패키지 우선 사용, 없으면 구버전 fallback)
try:
    from langchain_openai import ChatOpenAI  # pip install langchain-openai
    _OPENAI_KIND = "new"
except Exception:
    # 구버전 호환 (가능하면 위 패키지 설치 권장)
    from langchain.chat_models import ChatOpenAI  # deprecated 경로
    _OPENAI_KIND = "legacy"

from langchain.chains import RetrievalQA

# --- ✅ [추가] DB 관련 임포트 ---
from sqlalchemy import update, select
from db.session import SessionLocal
from models.faq import CompFAQ

# --- .env 로드 (backend/.env) ---
_ENV_LOADED = False
def _ensure_env():
    global _ENV_LOADED
    if _ENV_LOADED:
        return
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    if os.path.exists(env_path):
        load_dotenv(env_path)
    _ENV_LOADED = True

# --- 환경 변수 / 경로 ---
def _get_cfg():
    _ensure_env()
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    EMBED_MODEL = os.getenv("EMBED_MODEL", "BM-K/KoSimCSE-roberta")
    # 인덱스 기본 경로: backend/db/vector_store/faiss_langchain
    VSTORE_DIR = os.getenv(
        "VSTORE_DIR",
        os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "db", "vector_store", "faiss_langchain"
        ),
    )
    return OPENAI_API_KEY, OPENAI_MODEL, EMBED_MODEL, VSTORE_DIR

_vstore = None
_chain = None

def _load():
    """싱글톤 초기화: KoSimCSE 임베딩으로 만든 FAISS 인덱스를 로드하고 Retriever+LLM 체인 구성."""
    global _vstore, _chain
    if _chain:
        return

    OPENAI_API_KEY, OPENAI_MODEL, EMBED_MODEL, VSTORE_DIR = _get_cfg()

    # ✅ 인덱스 생성에 사용한 것과 동일한 임베딩 모델 사용 (KoSimCSE)
    embeddings = HuggingFaceEmbeddings(model_name=EMBED_MODEL)

    # FAISS 인덱스 로드 (allow_dangerous_deserialization=True 필요)
    _vstore = FAISS.load_local(
        VSTORE_DIR,
        embeddings,
        allow_dangerous_deserialization=True,
    )

    retriever = _vstore.as_retriever(search_kwargs={"k": 5})

    # OpenAI LLM 준비 (환경변수 사용; 키 인자는 생략해도 됨)
    if _OPENAI_KIND == "new":
        # langchain_openai.ChatOpenAI: model 파라미터 사용
        llm = ChatOpenAI(model=OPENAI_MODEL, temperature=0.2)
    else:
        # 구버전 경로(가능하면 langchain-openai 설치 권장)
        llm = ChatOpenAI(model_name=OPENAI_MODEL, temperature=0.2, openai_api_key=OPENAI_API_KEY)

    # source_documents를 반환하도록 설정
    _chain = RetrievalQA.from_chain_type(
        llm=llm,
        retriever=retriever,
        return_source_documents=True,
        chain_type="stuff",
    )

# --- ✅ [추가] 조회수 증가 유틸 ---
def increment_view_by_qa_id(qa_id: int) -> bool:
    """qa_id로 comp_faq.views 를 +1한다. 성공 시 True."""
    try:
        with SessionLocal() as db:
            stmt = (
                update(CompFAQ)
                .where(CompFAQ.qa_id == qa_id)
                .values(views=CompFAQ.views + 1)
            )
            res = db.execute(stmt)
            db.commit()
            return res.rowcount > 0
    except Exception:
        # 조회수 업데이트 실패해도 서비스 흐름은 깨지지 않게
        return False

def increment_view_by_question_exact(question: str) -> bool:
    """메타데이터에 qa_id가 없는 옛 인덱스를 대비한 fallback."""
    try:
        with SessionLocal() as db:
            row = db.execute(
                select(CompFAQ.qa_id).where(CompFAQ.question == question)
            ).first()
            if not row:
                return False
            return increment_view_by_qa_id(int(row[0]))
    except Exception:
        return False

def ask(question: str) -> Tuple[str, List[dict]]:
    _load()
    out = _chain({"query": question})
    answer = out.get("result") or out.get("answer") or ""
    docs = out.get("source_documents") or []

    # --- ✅ [추가] 매칭된 문서 기반으로 조회수 1회 증가 ---
    # 가장 유사한 1건만 카운트 (원하면 전체 문서에 대해 set으로 중복 제거 후 반복 가능)
    try:
        if docs:
            md = getattr(docs[0], "metadata", {}) or {}
            qa_id = md.get("qa_id")
            if qa_id is not None:
                increment_view_by_qa_id(int(qa_id))
            else:
                qtext = md.get("question")
                if qtext:
                    increment_view_by_question_exact(qtext)
    except Exception:
        # 조회수 로깅 실패는 무시 (메인 답변 흐름 보장)
        pass

    sources = []
    for d in docs:
        # 저장 시 넣어둔 메타데이터 키를 최대한 활용
        md = getattr(d, "metadata", {}) or {}
        title = md.get("source") or md.get("title") or md.get("sc_file") or "출처"
        url = md.get("url")
        sources.append({"title": str(title), "url": str(url) if url else None})

    # 중복 제거 및 상한
    seen, uniq = set(), []
    for s in sources:
        key = (s["title"], s.get("url") or "")
        if key in seen:
            continue
        seen.add(key)
        uniq.append(s)
    return answer.strip(), uniq[:5]
