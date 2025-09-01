# backend/services/view_logger.py
from typing import Optional, Iterable
from sqlalchemy import update, select
from sqlalchemy.engine import CursorResult

from db.session import SessionLocal
from models.faq import CompFAQ

def increment_view_by_qa_id(qa_id: int) -> bool:
    """
    qa_id로 comp_faq.views 를 +1한다.
    성공 시 True. 대상 행이 없으면 False.
    """
    with SessionLocal() as db:
        stmt = (
            update(CompFAQ)
            .where(CompFAQ.qa_id == qa_id)
            .values(views=CompFAQ.views + 1)
        )
        res: CursorResult = db.execute(stmt)
        db.commit()
        return (res.rowcount or 0) > 0

def increment_view_by_question_exact(question: str) -> bool:
    """
    질문 텍스트 '완전일치'로 qa_id를 찾아 +1 (메타데이터에 qa_id가 없는 옛 인덱스 대비).
    """
    with SessionLocal() as db:
        row = db.execute(
            select(CompFAQ.qa_id).where(CompFAQ.question == question)
        ).first()
        if not row:
            return False
        qa_id = row[0]
        # 같은 트랜잭션 내 재사용을 피하려고 세션 분리
    return increment_view_by_qa_id(qa_id)

def increment_view_from_metadata(meta: dict) -> bool:
    """
    RAG 검색 메타데이터에서 조회수 +1.
    우선순위: qa_id -> question(완전일치)
    """
    if not meta:
        return False
    if "qa_id" in meta and meta["qa_id"] is not None:
        return increment_view_by_qa_id(int(meta["qa_id"]))
    if "question" in meta and meta["question"]:
        return increment_view_by_question_exact(str(meta["question"]))
    return False

def increment_views_bulk(qa_ids: Iterable[int]) -> int:
    """
    여러 qa_id를 한 번에 +1. (주로 배치/테스트용)
    반환값: 증가에 성공한 행 수(대상 행 수와 동일).
    """
    qa_ids = list(qa_ids or [])
    if not qa_ids:
        return 0
    with SessionLocal() as db:
        stmt = (
            update(CompFAQ)
            .where(CompFAQ.qa_id.in_(qa_ids))
            .values(views=CompFAQ.views + 1)
        )
        res: CursorResult = db.execute(stmt)
        db.commit()
        return int(res.rowcount or 0)
