# api/chat.py
from fastapi import APIRouter

router = APIRouter()

@router.get("/chat")
def get_chat_response(q: str):
    return {
        "question": q,
        "answer": f"'{q}'에 대한 응답입니다. (여기에 GPT 연동 예정)"
        
        
    }
