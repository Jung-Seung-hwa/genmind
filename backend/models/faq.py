from sqlalchemy import Column, Integer, String, TIMESTAMP, ForeignKey, func
from sqlalchemy.orm import relationship
from db.session import Base

class CompFAQ(Base):
    __tablename__ = "comp_faq"

    qa_id       = Column(Integer, primary_key=True, autoincrement=True)   # Q&A ID (PK)
    comp_domain = Column(Integer, ForeignKey("t_company.comp_idx"), nullable=False) # 회사 식별자 (FK)
    sc_file     = Column(String(255), nullable=True)                      # 출처 파일명
    question    = Column(String(255), nullable=False)                     # 질문
    answer      = Column(String(1000), nullable=False)                    # 답변
    ref_article = Column(String(255), nullable=True)                      # 참고 문서 링크
    views       = Column(Integer, nullable=False, default=0)              # 조회수 (기본 0)
    created_at  = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    company = relationship("Company", backref="faqs")
