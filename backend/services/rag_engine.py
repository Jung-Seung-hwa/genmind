# backend/services/rag_engine.py
import os
from typing import List, Tuple
from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import FAISS
from langchain.chat_models import ChatOpenAI
from langchain.chains import RetrievalQA

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
FAISS_DIR = os.path.join(os.path.dirname(__file__), "..", "db", "vector_store", "faiss_langchain")

_vstore = None
_chain = None

def _load():
    global _vstore, _chain
    if _chain: return
    embeddings = OpenAIEmbeddings(openai_api_key=OPENAI_API_KEY)
    _vstore = FAISS.load_local(FAISS_DIR, embeddings, allow_dangerous_deserialization=True)
    retriever = _vstore.as_retriever(search_kwargs={"k": 5})
    llm = ChatOpenAI(model_name=os.getenv("OPENAI_MODEL", "gpt-4o-mini"), temperature=0.2,
                     openai_api_key=OPENAI_API_KEY)
    _chain = RetrievalQA.from_chain_type(llm=llm, retriever=retriever)

def ask(question: str) -> Tuple[str, List[dict]]:
    _load()
    out = _chain({"query": question})
    answer = out.get("result") or out.get("answer") or ""
    docs = out.get("source_documents") or []
    sources = []
    for d in docs:
        title = d.metadata.get("source") or d.metadata.get("title") or "출처"
        url = d.metadata.get("url")
        sources.append({"title": str(title), "url": str(url) if url else None})
    # 중복 제거 및 상한
    seen, uniq = set(), []
    for s in sources:
        key = (s["title"], s.get("url") or "")
        if key in seen: continue
        seen.add(key); uniq.append(s)
    return answer.strip(), uniq[:5]
