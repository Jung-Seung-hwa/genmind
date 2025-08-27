# services/view_logger.py  (신규 파일)
from sqlalchemy import update, select
from db.session import SessionLocal
from models.faq import CompFAQ

def increment_view_by_qa_id(qa_id: int) -> bool:
    """qa_id로 comp_faq.views 를 +1한다. 성공 시 True."""
    with SessionLocal() as db:
        stmt = (
            update(CompFAQ)
            .where(CompFAQ.qa_id == qa_id)
            .values(views=CompFAQ.views + 1)
        )
        res = db.execute(stmt)
        db.commit()
        return res.rowcount > 0

def increment_view_by_question_exact(question: str) -> bool:
    """메타데이터에 qa_id가 없는 옛 인덱스를 대비한 fallback."""
    with SessionLocal() as db:
        faq = db.execute(
            select(CompFAQ.qa_id).where(CompFAQ.question == question)
        ).first()
        if not faq:
            return False
        return increment_view_by_qa_id(faq[0])
