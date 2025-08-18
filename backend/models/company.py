from sqlalchemy import Column, Integer, String, TIMESTAMP, func
from db.session import Base

class Company(Base):
    __tablename__ = "t_company"

    comp_idx  = Column(Integer, primary_key=True, autoincrement=True, index=True)  # 회사 식별자
    comp_name = Column(String(50), nullable=False)                                  # 회사 명
    comp_url  = Column(String(255))                                                 # 회사 홈페이지
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)       # 생성 일자
