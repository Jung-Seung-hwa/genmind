# backend/api/auth.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field, AliasChoices
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from passlib.context import CryptContext

from db.session import get_db
from models.company import Company as CompanyModel
from models.user import User as UserModel

print("[AUTH LOADED]", __file__)

router = APIRouter(prefix="/auth", tags=["auth"])
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ==== Pydantic Schemas ====
class JoinIn(BaseModel):
    domain: str = Field(min_length=1, strip_whitespace=True,
                        validation_alias=AliasChoices("domain", "serial", "invite"))
    name: str = Field(min_length=1, strip_whitespace=True,
                      validation_alias=AliasChoices("name", "empNo"))
    position: str = Field(min_length=1, strip_whitespace=True,
                          validation_alias=AliasChoices("position", "user_type", "mgrNo"))
    email: EmailStr
    password: str = Field(min_length=6)


class JoinOut(BaseModel):
    ok: bool
    email: EmailStr
    comp_domain: str
    user_type: str
    message: str


# ==== Router ====
@router.post("/join", response_model=JoinOut, status_code=201)
def join(payload: JoinIn, db: Session = Depends(get_db)):
    # 1) 회사 존재 확인 (t_company.comp_domain으로 조회)
    company = db.query(CompanyModel).filter(CompanyModel.comp_domain == payload.domain).first()
    if not company:
        raise HTTPException(status_code=404, detail="회사 도메인을 찾을 수 없습니다.")

    comp_domain = company.comp_domain

    # 2) 이메일 중복 확인
    exists = db.query(UserModel).filter(UserModel.user_email == payload.email).first()
    if exists:
        raise HTTPException(status_code=409, detail="이미 가입된 이메일입니다.")

    # 3) 비밀번호 해시 + user_type 정규화
    hashed = pwd_ctx.hash(payload.password)
    role = payload.position.strip().lower()

    # 4) 사용자 생성
    user = UserModel(
        user_email=payload.email,
        passwd=hashed,
        name=payload.name,
        user_type=role,
        comp_domain=comp_domain,
    )

    try:
        db.add(user)
        db.commit()
        db.refresh(user)
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=409, detail="제약 조건 위반(중복 또는 FK 불일치)") from e

    return JoinOut(
        ok=True,
        email=user.user_email,
        comp_domain=comp_domain,
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
    comp_domain: str


@router.post("/login", response_model=LoginOut, status_code=200)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    # 1) 사용자 조회
    user = db.query(UserModel).filter(UserModel.user_email == payload.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다.")

    # 2) 비밀번호 검증
    try:
        ok = pwd_ctx.verify(payload.password, user.passwd)
    except Exception:
        raise HTTPException(status_code=500, detail="비밀번호 검증 중 오류가 발생했습니다.")

    if not ok:
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다.")

    if pwd_ctx.needs_update(user.passwd):
        user.passwd = pwd_ctx.hash(payload.password)
        db.commit()

    return LoginOut(
        ok=True,
        email=user.user_email,
        name=user.name,
        user_type=user.user_type,
        comp_domain=user.comp_domain,
    )
