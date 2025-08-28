# backend/api/faq_top.py
from fastapi import APIRouter
from sqlalchemy import text
from db.session import get_db

router = APIRouter(prefix="/faq", tags=["faq"])

@router.get("/top")
def top_faqs(limit: int = 10):
    db = next(get_db())
    try:
        rows = db.execute(text("""
            SELECT qa_id, question, answer, ref_article, views,
                   DENSE_RANK() OVER (ORDER BY views DESC) AS `rank`
            FROM comp_faq
            ORDER BY views DESC, qa_id ASC
            LIMIT :limit
        """), {"limit": limit}).mappings().all()
        return list(rows)
    finally:
        db.close()

@router.get("/all")
def all_faqs():
    """모든 FAQ를 views 내림차순으로 전부 반환 (순위 포함)"""
    db = next(get_db())
    try:
        rows = db.execute(text("""
            SELECT qa_id, question, answer, ref_article, views,
                   DENSE_RANK() OVER (ORDER BY views DESC) AS `rank`
            FROM comp_faq
            ORDER BY views DESC, qa_id ASC
        """)).mappings().all()
        return list(rows)
    finally:
        db.close()
