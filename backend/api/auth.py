# backend/api/auth.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field, AliasChoices
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from passlib.context import CryptContext
from typing import Optional
from api import admin_auth

from db.session import get_db
from models.company import Company as CompanyModel
from models.user import User as UserModel


print("[AUTH LOADED]", __file__)

router = APIRouter(prefix="/auth", tags=["auth"])
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ==== Pydantic Schemas ====
class JoinIn(BaseModel):
    # serial == comp_idx (문자열/숫자 상관없이 문자열로 받아 정수 변환)
    serial: str = Field(min_length=1, strip_whitespace=True,
                        validation_alias=AliasChoices("serial", "invite"))
    name: str = Field(min_length=1, strip_whitespace=True,
                      validation_alias=AliasChoices("name", "empNo"))
    # position == user_type
    position: str = Field(min_length=1, strip_whitespace=True,
                          validation_alias=AliasChoices("position", "user_type", "mgrNo"))
    email: EmailStr
    password: str = Field(min_length=6)


class JoinOut(BaseModel):
    ok: bool
    email: EmailStr
    comp_idx: int
    user_type: str
    message: str


# ==== Router ====
@router.post("/join", response_model=JoinOut, status_code=201)
def join(payload: JoinIn, db: Session = Depends(get_db)):
    # 1) serial → comp_idx 정수화
    try:
        comp_idx = int(payload.serial)
    except Exception:
        raise HTTPException(status_code=422, detail="serial(comp_idx)는 정수 또는 정수 문자열이어야 합니다.")

    # 2) 회사 존재 확인 (t_company.comp_idx)
    company = db.query(CompanyModel).filter(CompanyModel.comp_idx == comp_idx).first()
    if not company:
        raise HTTPException(status_code=404, detail="회사 시리얼 넘버를 찾을 수 없습니다.")

    # 3) 이메일 중복 확인 (t_user.email PK)
    exists = db.query(UserModel).filter(UserModel.email == payload.email).first()
    if exists:
        raise HTTPException(status_code=409, detail="이미 가입된 이메일입니다.")

    # 4) 비밀번호 해시 + user_type 정규화
    hashed = pwd_ctx.hash(payload.password)
    role = payload.position.strip().lower()  # ex) "user" | "manager" | "admin" | 한국어 입력도 소문자 비교용

    # 5) 사용자 생성
    user = UserModel(
        email=payload.email,
        passwd=hashed,
        name=payload.name,
        user_type=role,       # position 값을 그대로 user_type으로 저장
        comp_idx=comp_idx,    # FK
    )

    try:
        db.add(user)
        db.commit()
        # email이 PK라 refresh는 생략 가능하지만 혹시 몰라 유지
        db.refresh(user)
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=409, detail="제약 조건 위반(중복 또는 FK 불일치)") from e

    return JoinOut(
        ok=True,
        email=user.email,
        comp_idx=comp_idx,
        user_type=role,
        message="가입 완료",
    )
    
class LoginIn(BaseModel):
    email: EmailStr
    password: str

class LoginOut(BaseModel):
    ok: bool
    email: EmailStr
    name: str
    user_type: str
    comp_idx: int

@router.post("/login", response_model=LoginOut, status_code=200)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    # 1) 사용자 조회
    user = db.query(UserModel).filter(UserModel.email == payload.email).first()
    if not user:
        # 이메일 존재 안함
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다.")

    # 2) 비밀번호 검증 (bcrypt)
    try:
        ok = pwd_ctx.verify(payload.password, user.passwd)
    except Exception:
        # 해시 포맷이 예상과 다를 때 대비
        raise HTTPException(status_code=500, detail="비밀번호 검증 중 오류가 발생했습니다.")

    if not ok:
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다.")

    # (선택) 해시 업그레이드가 필요하면 재해시
    if pwd_ctx.needs_update(user.passwd):
        user.passwd = pwd_ctx.hash(payload.password)
        db.commit()

    # 3) 성공 응답 (필요 시 토큰 추가 가능)
    return LoginOut(
        ok=True,
        email=user.email,
        name=user.name,
        user_type=user.user_type,
        comp_idx=user.comp_idx,
    )