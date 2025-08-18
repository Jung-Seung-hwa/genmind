from sqlalchemy import Column, Integer, String, TIMESTAMP, ForeignKey, func
from sqlalchemy.orm import relationship
from db.session import Base

class User(Base):
    __tablename__ = "t_user"

    email     = Column(String(50), primary_key=True)                 # 사용자 이메일 (PK)
    passwd    = Column(String(255), nullable=False)                  # 비밀번호
    name      = Column(String(50), nullable=False)                   # 이름
    user_type = Column(String(20), nullable=False)                   # 사용자 유형
    comp_idx  = Column(Integer, ForeignKey("t_company.comp_idx"))    # 회사 식별자 (FK)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    company = relationship("Company", backref="users")
