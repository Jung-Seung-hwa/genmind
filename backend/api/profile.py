# backend/api/profile.py
from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from db.session import get_db
from models.user import User as UserModel

router = APIRouter(prefix="/api/profile", tags=["profile"])
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

class ProfileOut(BaseModel):
  email: EmailStr
  name: str
  user_type: str
  comp_domain: str | None = None

@router.get("/me", response_model=ProfileOut)
def get_me(email: EmailStr = Query(...), db: Session = Depends(get_db)):
  user = db.query(UserModel).filter(UserModel.user_email == str(email)).first()
  if not user:
    raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
  return ProfileOut(
    email=user.user_email, name=user.name,
    user_type=user.user_type, comp_domain=user.comp_domain
  )

class UpdateIn(BaseModel):
  email: EmailStr
  name: str = Field(..., min_length=1, max_length=50)

@router.post("/update", response_model=ProfileOut)
def update_profile(payload: UpdateIn, db: Session = Depends(get_db)):
  user = db.query(UserModel).filter(UserModel.user_email == str(payload.email)).first()
  if not user:
    raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
  user.name = payload.name.strip()
  db.commit()
  db.refresh(user)
  return ProfileOut(
    email=user.user_email, name=user.name,
    user_type=user.user_type, comp_domain=user.comp_domain
  )

class ChangePwIn(BaseModel):
  email: EmailStr
  current_password: str = Field(..., min_length=1)
  new_password: str = Field(..., min_length=8)

@router.post("/change-password")
def change_password(payload: ChangePwIn, db: Session = Depends(get_db)):
  user = db.query(UserModel).filter(UserModel.user_email == str(payload.email)).first()
  if not user:
    raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

  # 현재 PW 확인
  if not pwd_ctx.verify(payload.current_password, user.passwd):
    raise HTTPException(status_code=400, detail="현재 비밀번호가 올바르지 않습니다.")

  # 해시 업데이트
  user.passwd = pwd_ctx.hash(payload.new_password)
  db.commit()
  return {"ok": True}
