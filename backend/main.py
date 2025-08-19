from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# .env 파일 로드 (backend/.env)
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# DB 연결, 모델 임포트
from db.session import Base, engine
from models import company, user, document, gpt, unanswered  # 테이블 정의 파일
from api import chat  # 기존 라우터
from api import auth

app = FastAPI()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 개발 중 전체 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ★ 개발 단계에서 테이블 자동 생성 ---
Base.metadata.create_all(bind=engine)

# 라우터 등록
app.include_router(chat.router)
app.include_router(auth.router) 

@app.get("/")
def root():
    return {"message": "✅ FastAPI 서버 + MySQL 연결 준비 완료"}
