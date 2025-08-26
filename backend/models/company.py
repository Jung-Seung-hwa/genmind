from sqlalchemy import Column, Integer, String, TIMESTAMP, func
from db.session import Base

class Company(Base):
    __tablename__ = "t_company"

    comp_domain = Column(String(255), primary_key=True)  # PK (도메인)
    comp_name   = Column(String(100), nullable=False)
    comp_email  = Column(String(100), nullable=False)
    created_at  = Column(TIMESTAMP, server_default=func.now(), nullable=False)
