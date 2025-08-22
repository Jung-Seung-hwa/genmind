from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
import anyio

from db.qa_faiss_store import qa  # RetrievalQA 체인

router = APIRouter(prefix="/api/chat", tags=["chat"])

class AskReq(BaseModel):
    question: str = Field(..., min_length=1)

class AskResp(BaseModel):
    answer: str
    sources: Optional[List[Dict]] = None  # [{ "title": "...", "url": "..." }]

@router.post("/ask", response_model=AskResp)
async def ask(req: AskReq) -> AskResp:
    q = req.question.strip()
    if not q:
        return AskResp(answer="질문이 비어 있어요.", sources=[])

    try:
        # qa.run이 동기라면 스레드로 실행(이벤트루프 블로킹 방지)
        answer = await anyio.to_thread.run_sync(qa.run, q)
        return AskResp(answer=answer or "응답이 비어 있습니다.", sources=None)
    except Exception:
        return AskResp(answer="죄송합니다. 답변을 생성할 수 없습니다.", sources=None)
