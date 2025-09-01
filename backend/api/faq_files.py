from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db.session import get_db
from models.faq import CompFAQ
from api.auth import get_current_user

router = APIRouter()

@router.get("/faq/files")
def list_uploaded_files(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    회사별(comp_domain) 업로드된 문서 파일 목록 반환 (sc_file 기준, 중복 제거)
    """
    rows = (
        db.query(CompFAQ.sc_file)
        .filter(CompFAQ.comp_domain == current_user.comp_domain)
        .group_by(CompFAQ.sc_file)
        .all()
    )
    return [r.sc_file for r in rows]
