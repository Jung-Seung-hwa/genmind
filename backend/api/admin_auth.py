# backend/api/admin_auth.py
from fastapi import APIRouter, Depends, HTTPException, Response, Request
from fastapi.responses import JSONResponse
from jose import jwt, JWTError
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta, timezone
import os

# ===== 환경 =====
SECRET = os.getenv("ADMIN_JWT_SECRET", "dev_change_me")
ALG = "HS256"
COOKIE = "access"                 # 쿠키 이름
ACCESS_MIN = int(os.getenv("ADMIN_ACCESS_MIN", "15"))

router = APIRouter()
admin_api = APIRouter(prefix="/api/admin")

# ===== DB 헬퍼(당신 프로젝트에 맞게 import 경로만 바꿔주세요) =====
# 예: from backend.db.session import SessionLocal
#     from backend.models.user import TUser  # 테이블 t_user 매핑
from backend.db.session import SessionLocal
from backend.models.user import TUser

def find_user(comp_idx: int, email: str):
    db = SessionLocal()
    try:
        # user_type 컬럼: 'OWNER'|'ADMIN'|'USER'
        return db.query(TUser).filter(
            TUser.comp_idx == comp_idx, TUser.email == email
        ).first()
    finally:
        db.close()

# 비밀번호 검증(프로젝트에 쓰는 해시 함수로 교체)
from passlib.hash import bcrypt
def verify_password(plain: str, hashed: str):
    try:
        return bcrypt.verify(plain, hashed)
    except Exception:
        return False

# ===== JWT & 가드 =====
def sign(uid: str, role: str, comp_idx: int):
    now = datetime.now(timezone.utc)
    payload = {
        "sub": uid,
        "role": role,
        "comp": comp_idx,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=ACCESS_MIN)).timestamp()),
    }
    return jwt.encode(payload, SECRET, algorithm=ALG)

def require_auth(req: Request):
    tok = req.cookies.get(COOKIE)
    if not tok:
        raise HTTPException(401, "no_cookie")
    try:
        return jwt.decode(tok, SECRET, algorithms=[ALG])
    except JWTError:
        raise HTTPException(401, "bad_token")

def require_admin(payload=Depends(require_auth)):
    role = payload.get("role")
    if role not in ("ADMIN", "OWNER"):
        raise HTTPException(403, "forbidden")
    return payload

# ===== 스키마 =====
class LoginIn(BaseModel):
    email: EmailStr
    password: str
    comp_idx: int  # 회사 선택(서브도메인에서 가져와도 됨)

# ===== 엔드포인트 =====
@router.post("/login")
def login(body: LoginIn, res: Response):
    u = find_user(body.comp_idx, body.email.lower())
    if not u or not verify_password(body.password, u.passwd):
        raise HTTPException(401, "bad_credentials")

    role = (u.user_type or "USER").upper()
    token = sign(uid=str(u.email), role=role, comp_idx=int(u.comp_idx))

    secure_flag = os.getenv("ENV", "dev") != "dev"  # 배포(https)면 True
    res.set_cookie(
        key=COOKIE, value=token, httponly=True, samesite="strict",
        secure=secure_flag, max_age=ACCESS_MIN * 60, path="/"
    )

    redirect = "/admin" if role in ("ADMIN", "OWNER") else "/home"
    return {"ok": True, "redirect": redirect, "role": role}

@router.post("/logout")
def logout(res: Response):
    res.delete_cookie(COOKIE, path="/")
    return {"ok": True}

@router.get("/me")
def me(p=Depends(require_auth)):
    return {"email": p["sub"], "role": p["role"], "comp_idx": p["comp"]}

@admin_api.get("/me", dependencies=[Depends(require_admin)])
def admin_me():
    return {"ok": True}
