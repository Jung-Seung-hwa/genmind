# backend/models/gpt.py
from sqlalchemy import Column, Integer, String, Text
from db.session import Base

# MySQL의 mp_25K_LI3_p3_3.comp_faq 테이블 (스크린샷 기준 추정 컬럼)
class CompFAQ(Base):
    __tablename__ = "comp_faq"
    qa_id = Column(Integer, primary_key=True, autoincrement=True)
    comp_domain = Column(String(255))
    sc_file = Column(String(255))
    question = Column(Text)
    answer = Column(Text)
    ref_article = Column(String(255))
