from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from db.session import get_db
from models.checklist import Checklist
from models.user import User
from api.auth import get_current_user   # ✅ auth.py에서 가져옴 (JWT 인증)

router = APIRouter(prefix="/checklist", tags=["checklist"])

# ===== Pydantic Schemas =====
class ChecklistCreate(BaseModel):
    to_user: Optional[str] = None
    item: str
    deadline: Optional[datetime] = None

class ChecklistUpdate(BaseModel):
    item: Optional[str] = None
    deadline: Optional[datetime] = None
    is_done: Optional[bool] = None

class ChecklistOut(BaseModel):
    item_id: int
    to_user: Optional[str]
    from_user: str
    item: str
    deadline: Optional[datetime]
    is_done: bool
    created_at: datetime

    class Config:
        orm_mode = True


# ===== API Routes =====

# ✅ 체크리스트 목록 조회 (내가 받은/보낸 것 모두)
@router.get("/", response_model=List[ChecklistOut])
def list_checklists(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    checklists = db.query(Checklist).filter(
        (Checklist.to_user == current_user.user_email) |
        (Checklist.from_user == current_user.user_email)
    ).order_by(Checklist.created_at.desc()).all()
    return checklists


# ✅ 체크리스트 생성
@router.post("/", response_model=ChecklistOut)
def create_checklist(
    payload: ChecklistCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    checklist = Checklist(
        to_user=payload.to_user,
        from_user=current_user.user_email,
        item=payload.item,
        deadline=payload.deadline,
        is_done=False
    )
    db.add(checklist)
    db.commit()
    db.refresh(checklist)
    return checklist


# ✅ 체크리스트 수정 (내용/마감일/완료여부)
@router.put("/{item_id}", response_model=ChecklistOut)
def update_checklist(
    item_id: int,
    payload: ChecklistUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    checklist = db.query(Checklist).filter(Checklist.item_id == item_id).first()
    if not checklist:
        raise HTTPException(status_code=404, detail="체크리스트를 찾을 수 없습니다.")

    # 본인이 생성자거나 할당된 대상일 때만 수정 가능
    if checklist.from_user != current_user.user_email and checklist.to_user != current_user.user_email:
        raise HTTPException(status_code=403, detail="권한이 없습니다.")

    if payload.item is not None:
        checklist.item = payload.item
    if payload.deadline is not None:
        checklist.deadline = payload.deadline
    if payload.is_done is not None:
        checklist.is_done = payload.is_done

    db.commit()
    db.refresh(checklist)
    return checklist


# ✅ 체크리스트 삭제
@router.delete("/{item_id}")
def delete_checklist(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    checklist = db.query(Checklist).filter(Checklist.item_id == item_id).first()
    if not checklist:
        raise HTTPException(status_code=404, detail="체크리스트를 찾을 수 없습니다.")

    if checklist.from_user != current_user.user_email:
        raise HTTPException(status_code=403, detail="삭제 권한이 없습니다.")

    db.delete(checklist)
    db.commit()
    return {"ok": True, "message": "삭제 완료"}
