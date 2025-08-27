import os
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr, Field, AliasChoices
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from passlib.context import CryptContext
from jose import jwt, JWTError

from db.session import get_db
from models.company import Company as CompanyModel
from models.user import User as UserModel

print("[AUTH LOADED]", __file__)

router = APIRouter(prefix="/auth", tags=["auth"])
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ==== JWT 설정 ====
SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey")  # 반드시 .env에 넣어 관리
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


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


# ==== 회원가입 ====
@router.post("/join", response_model=JoinOut, status_code=201)
def join(payload: JoinIn, db: Session = Depends(get_db)):
    # 1) 회사 존재 확인
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


# ==== 로그인 ====
class LoginIn(BaseModel):
    email: EmailStr
    password: str


class LoginOut(BaseModel):
    ok: bool
    email: EmailStr
    name: str
    user_type: str
    comp_domain: str
    access_token: str
    token_type: str = "bearer"


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

    # 3) 필요 시 비밀번호 재해시
    if pwd_ctx.needs_update(user.passwd):
        user.passwd = pwd_ctx.hash(payload.password)
        db.commit()

    # 4) JWT 발급
    access_token = create_access_token(data={"sub": user.user_email})

    return LoginOut(
        ok=True,
        email=user.user_email,
        name=user.name,
        user_type=user.user_type,
        comp_domain=user.comp_domain,
        access_token=access_token,
    )


# ==== 내 정보 확인 (/auth/me) ====
class MeOut(BaseModel):
    email: EmailStr
    name: str
    user_type: str
    comp_domain: str

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")
    except JWTError:
        raise HTTPException(status_code=401, detail="토큰이 만료되었거나 올바르지 않습니다.")

    user = db.query(UserModel).filter(UserModel.user_email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    return user

@router.get("/me", response_model=MeOut)
def read_me(current_user: UserModel = Depends(get_current_user)):
    return MeOut(
        email=current_user.user_email,
        name=current_user.name,
        user_type=current_user.user_type,
        comp_domain=current_user.comp_domain,
    )
