from fastapi import APIRouter
from pydantic import BaseModel
from db.qa_faiss_store import qa  # 이미 RetrievalQA 체인 생성됨

router = APIRouter(prefix="/api/chat", tags=["chat"])

class AskReq(BaseModel):
    question: str

class AskResp(BaseModel):
    answer: str
    sources: list[dict] | None = None  # [{ "title": "...", "url": "..." }]

@router.post("/ask", response_model=AskResp)
def ask(req: AskReq):
    q = (req.question or "").strip()
    if not q:
        return AskResp(answer="질문이 비어 있어요.", sources=[])
    # 실제 RAG 호출부: qa.run만 사용 (sources는 None)
    try:
        answer = qa.run(q)
        return AskResp(answer=answer or "응답이 비어 있습니다.", sources=None)
    except Exception:
        return AskResp(answer="죄송합니다. 답변을 생성할 수 없습니다.", sources=None)

@router.post("/chat/ask")
async def ask_question(payload: AskReq):
    q = (payload.question or "").strip()
    if not q:
        return {"answer": "질문이 비어 있어요."}
    try:
        answer = qa.run(q)
        return {"answer": answer or "응답이 비어 있습니다."}
    except Exception:
        return {"answer": "죄송합니다. 답변을 생성할 수 없습니다."}