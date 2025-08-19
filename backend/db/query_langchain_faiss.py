from pathlib import Path
from dotenv import load_dotenv
import os

HERE    = Path(__file__).resolve().parent
BACKEND = HERE.parent
load_dotenv(BACKEND / ".env", override=True, encoding="utf-8")

from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS

STORE_DIR = HERE / "vector_store" / "faiss_langchain"

def search(query: str, k: int = 5):
    if not (STORE_DIR / "index.faiss").exists():
        raise FileNotFoundError(
            f"벡터 인덱스가 없습니다: {STORE_DIR / 'index.faiss'}\n"
            "먼저 `python db/ingest_langchain_faiss.py`로 인덱싱을 실행하세요."
        )
    emb = OpenAIEmbeddings(model="text-embedding-3-large")
    vs  = FAISS.load_local(str(STORE_DIR), emb, allow_dangerous_deserialization=True)
    return vs.similarity_search(query, k=k)

if __name__ == "__main__":
    import sys
    q = " ".join(sys.argv[1:]) or "연차휴가 일수와 사용촉진"
    for i, doc in enumerate(search(q, k=5), 1):
        meta = doc.metadata
        print(f"\n[{i}] {meta.get('source')} (page={meta.get('page')})")
        print(doc.page_content[:300], "...")
