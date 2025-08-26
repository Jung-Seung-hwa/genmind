# backend/main.py
from __future__ import annotations

import os
import traceback
from typing import List, Optional

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

# .env 로드 (backend/.env)
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# DB 연결, 모델 임포트
from db.session import Base, engine, SessionLocal  # SessionLocal이 있다면 가져와서 헬스체크에 사용
from models import company, user  # noqa: F401 (테이블 선언 보장)
from api import chat  # 기존 라우터 (prefix 가 /api/chat 인지 확인)
from api import auth

# ------------------------------------------------------------------------------
# FastAPI 앱 생성
# ------------------------------------------------------------------------------
app = FastAPI(
    title="Genmind Backend",
    description="RAG + FastAPI + MySQL",
    version=os.getenv("APP_VERSION", "0.1.0"),
)

# ------------------------------------------------------------------------------
# CORS 설정
# - 개발 중엔 '*' 허용, 운영/테스트에선 환경변수 ALLOW_ORIGINS 로 제한 가능
#   예: ALLOW_ORIGINS=http://localhost:8081,http://10.0.2.2:8081,http://192.168.0.10:8081
# ------------------------------------------------------------------------------
_env_origins = os.getenv("ALLOW_ORIGINS")
allow_origins: List[str] = (
    [o.strip() for o in _env_origins.split(",")] if _env_origins else ["*"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------------------
# ★ 개발 단계에서 테이블 자동 생성
# ------------------------------------------------------------------------------
Base.metadata.create_all(bind=engine)

# ------------------------------------------------------------------------------
# 라우터 등록
# - chat.router: 보통 prefix="/api/chat"
# - auth.router: 인증 관련
# ------------------------------------------------------------------------------
app.include_router(chat.router)
app.include_router(auth.router)

# ------------------------------------------------------------------------------
# 기본/헬스체크/버전 엔드포인트
# ------------------------------------------------------------------------------
@app.get("/", tags=["system"])
def root():
    return {"message": "✅ FastAPI 서버 + MySQL 연결 준비 완료"}

@app.get("/health", tags=["system"])
def health():
    """
    DB 연결 간단 헬스체크.
    """
    try:
        # 연결 테스트 (필요 시 간단 쿼리 수행)
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        db_ok = True
    except Exception as e:
        db_ok = False
        return {
            "status": "unhealthy",
            "db": db_ok,
            "error": type(e).__name__,
            "detail": str(e),
        }
    return {"status": "ok", "db": db_ok}

@app.get("/version", tags=["system"])
def version():
    return {"version": os.getenv("APP_VERSION", "0.1.0")}

@app.get("/api/ping", tags=["system"])
def ping():
    return {"pong": True}

# ------------------------------------------------------------------------------
# 전역 예외 처리기 (디버깅 편의)
# ------------------------------------------------------------------------------
@app.exception_handler(Exception)
async def all_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "error": type(exc).__name__,
            "detail": str(exc),
            "trace": traceback.format_exc(),
        },
    )
