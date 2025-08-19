# backend/api/auth.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field, AliasChoices
from sqlalchemy.orm import Session
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from passlib.context import CryptContext

from db.session import get_db
from models.user import User
from models.company import Company  # ⬅️ 회사 모델 임포트

router = APIRouter(prefix="/auth", tags=["auth"])
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

class JoinIn(BaseModel):
    # 구버전 키(invite, empNo, mgrNo)도 허용하고 싶으면 AliasChoices 그대로 두세요.
    serial:   str = Field(min_length=1, strip_whitespace=True,
                          validation_alias=AliasChoices("serial", "invite"))
    name:     str = Field(min_length=1, strip_whitespace=True,
                          validation_alias=AliasChoices("name", "empNo"))
    position: str = Field(min_length=1, strip_whitespace=True,
                          validation_alias=AliasChoices("position", "mgrNo"))
    email:    EmailStr
    password: str = Field(min_length=6)

class JoinOut(BaseModel):
    ok: bool
    userId: int | None = None
    message: str

@router.post("/join", response_model=JoinOut, status_code=201)
def join(payload: JoinIn, db: Session = Depends(get_db)):
    # 1) 회사 조회: payload.serial 로 t_company 찾기
    filters = []
    # 회사 모델에 어떤 컬럼이 있는지에 따라 유연하게 시도
    if hasattr(Company, "serial"):      filters.append(Company.serial == payload.serial)
    if hasattr(Company, "serial_no"):   filters.append(Company.serial_no == payload.serial)
    if hasattr(Company, "code"):        filters.append(Company.code == payload.serial)
    if hasattr(Company, "company_code"):filters.append(Company.company_code == payload.serial)

    if not filters:
        raise HTTPException(status_code=500, detail="회사 식별 컬럼을 Company 모델에서 찾을 수 없습니다.")

    company = db.query(Company).filter(or_(*filters)).first()
    if not company:
        raise HTTPException(status_code=400, detail="유효하지 않은 시리얼입니다.")

    comp_idx = getattr(company, "idx", None) or getattr(company, "id", None)
    if comp_idx is None:
        raise HTTPException(status_code=500, detail="Company PK(idx/id)를 찾을 수 없습니다.")

    # 2) 이메일 중복
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=409, detail="이미 존재하는 이메일입니다.")

    # 3) 비밀번호 해시 및 user_type 매핑
    hashed = pwd_ctx.hash(payload.password)
    user_type = "ADMIN" if payload.position.strip().lower() in ("admin", "관리자") else "USER"

    user = User(
        email=payload.email,
        passwd=hashed,     # t_user.passwd
        name=payload.name,
        user_type=user_type,
        comp_idx=comp_idx, # ⬅️ NOT NULL 충족
    )

    try:
        db.add(user)
        db.commit()
        db.refresh(user)
    except IntegrityError as e:
        db.rollback()
        # 다른 제약 위반도 409로 정리
        raise HTTPException(status_code=409, detail="제약 조건 위반(중복 또는 FK 불일치)") from e

    uid = getattr(user, "idx", None) or getattr(user, "id", None)
    return JoinOut(ok=True, userId=uid, message="가입 완료")
