# backend/api/chat.py
from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
import anyio

# ⬇️ 변경: 기존 db.qa_faiss_store 대신 services.rag_engine 사용
# from db.qa_faiss_store import qa  # (삭제)
from services.rag_engine import ask as rag_ask  # (추가)

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
        # rag_engine.ask 는 동기 함수이므로 스레드로 실행(이벤트 루프 블로킹 방지)
        answer, sources = await anyio.to_thread.run_sync(rag_ask, q)
        return AskResp(answer=answer or "응답이 비어 있습니다.", sources=sources or [])
    except Exception:
        # 내부 에러 상세는 서버 로그로 남기고, 사용자에겐 일반 메시지
        return AskResp(answer="죄송합니다. 답변을 생성할 수 없습니다.", sources=[])
