# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api import chat  # chat 라우터 가져오기

app = FastAPI()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 개발 중 전체 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(chat.router)

@app.get("/")
def root():
    return {"message": "✅ FastAPI 서버 정상 작동 중"}
