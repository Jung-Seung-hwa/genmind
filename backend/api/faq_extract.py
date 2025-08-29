# backend/api/faq_extract.py
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from pathlib import Path
import shutil, uuid

from db.session import get_db
from api.main_faq import faq_from_pdf, save_rows_to_db
from models.user import User as UserModel
from api.auth import get_current_user   # ✅ 추가

router = APIRouter(prefix="/admin/files", tags=["files"])

UPLOAD_DIR = Path("uploaded_files")
UPLOAD_DIR.mkdir(exist_ok=True)

# ----------------------
# 파일 업로드
# ----------------------
@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: UserModel = Depends(get_current_user)  # ✅ JWT 인증
):
    # 관리자가 아니라면 차단
    if current_user.user_type != "admin":
        raise HTTPException(status_code=403, detail="관리자만 업로드 가능합니다.")

    fid = f"{uuid.uuid4()}.pdf"
    path = UPLOAD_DIR / fid
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return {"file_id": fid, "path": str(path)}

# ----------------------
# FAQ 추출
# ----------------------
@router.post("/analyze")
async def analyze_file(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)  # ✅ JWT 인증
):
    if current_user.user_type != "admin":
        raise HTTPException(status_code=403, detail="관리자만 접근 가능합니다.")

    fid = payload["file_id"]
    pdf_path = UPLOAD_DIR / fid
    rows = await faq_from_pdf(pdf_path)
    return {
        "summary": "FAQ 자동 추출 결과",
        "qa": [{"q": r["question"], "a": r["answer"]} for r in rows],
    }

# ----------------------
# DB 저장
# ----------------------
@router.post("/save")
async def save_to_db(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)  # ✅ JWT 인증
):
    if current_user.user_type != "admin":
        raise HTTPException(status_code=403, detail="관리자만 저장 가능합니다.")

    fid = payload["file_id"]
    pdf_path = UPLOAD_DIR / fid
    rows = await faq_from_pdf(pdf_path)
    save_rows_to_db(rows, comp_domain=current_user.comp_domain, db=db)  # ✅ 현재 로그인한 유저 회사 도메인 사용
    return {"ok": True, "count": len(rows)}
