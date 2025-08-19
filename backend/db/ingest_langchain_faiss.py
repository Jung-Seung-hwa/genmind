from pathlib import Path
from dotenv import load_dotenv
import os
import argparse

# ---------- 경로/환경 ----------
HERE    = Path(__file__).resolve().parent            # .../backend/db
BACKEND = HERE.parent                                # .../backend
load_dotenv(BACKEND / ".env", override=True, encoding="utf-8")  # backend/.env 고정 로드

# 기본 경로(인자 없을 때 사용)
DEFAULT_PDF_DIR   = HERE / "vector_store" / "data" / "laws"      # PDF 기본 폴더
DEFAULT_STORE_DIR = HERE / "vector_store" / "faiss_langchain"    # 벡터 저장 폴더

# ---------- LangChain ----------
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader
from langchain_community.vectorstores import FAISS

def load_pdfs(pdf_dir: Path):
    # 대소문자 상관없이 찾기 + 하위폴더까지 탐색
    pats = ["*.pdf", "*.PDF", "*.Pdf"]
    files = []
    for pat in pats:
        files += list(pdf_dir.rglob(pat))
    print(f"[INFO] Found {len(files)} PDF(s): {[p.name for p in files]}")
    return files

def main():
    parser = argparse.ArgumentParser(description="Index PDFs to FAISS (LangChain + OpenAIEmbeddings)")
    parser.add_argument("--pdf-dir", type=str, default=str(DEFAULT_PDF_DIR),
                        help="PDF 폴더 경로 (지정하지 않으면 기본 경로 사용)")
    parser.add_argument("--store-dir", type=str, default=str(DEFAULT_STORE_DIR),
                        help="벡터 인덱스 저장 경로 (index.faiss / index.pkl)")
    parser.add_argument("--chunk-size", type=int, default=500, help="청크 최대 문자수")
    parser.add_argument("--chunk-overlap", type=int, default=50, help="청크 겹침 문자수")
    args = parser.parse_args()

    pdf_dir   = Path(args.pdf_dir)
    store_dir = Path(args.store_dir)
    store_dir.mkdir(parents=True, exist_ok=True)

    print(f"[INFO] PDF_DIR   = {pdf_dir}")
    print(f"[INFO] STORE_DIR = {store_dir}")

    # API 키 체크 (로드 실패시 친절 메시지)
    if not (os.getenv("OPENAI_API_KEY") or "").strip():
        raise RuntimeError(
            "OPENAI_API_KEY가 로드되지 않았습니다.\n"
            f"- .env 위치: {BACKEND / '.env'}\n"
            "- 내용 예: OPENAI_API_KEY=sk-xxxx\n"
        )

    # 1) 문서 로드
    pdf_files = load_pdfs(pdf_dir)
    if not pdf_files:
        raise RuntimeError(
            "No PDFs found.\n"
            f"- 현재 찾는 경로: {pdf_dir}\n"
            "- PDF를 이 경로로 옮기거나, --pdf-dir 로 실제 경로를 지정하세요.\n"
            "  예) python db/ingest_langchain_faiss.py --pdf-dir \"D:\\자료\\법령PDF\""
        )

    raw_docs = []
    for p in pdf_files:
        loader = PyPDFLoader(str(p))
        raw_docs.extend(loader.load())  # 페이지 단위로 로드

    # 2) 청킹(문서 조각내기)
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=args.chunk_size,
        chunk_overlap=args.chunk_overlap,
        separators=["\n\n", "\n", " ", ""],
        length_function=len
    )
    docs = splitter.split_documents(raw_docs)
    print(f"[INFO] Split into {len(docs)} chunks (size={args.chunk_size}, overlap={args.chunk_overlap})")

    # 3) 임베딩
    embeddings = OpenAIEmbeddings(model="text-embedding-3-large")

    # 4) 벡터스토어 저장
    vs = FAISS.from_documents(docs, embeddings)
    vs.save_local(str(store_dir))  # index.faiss + index.pkl 생성
    print(f"✅ Saved -> {store_dir / 'index.faiss'}")
    print(f"✅ Saved -> {store_dir / 'index.pkl'}")

if __name__ == "__main__":
    main()
