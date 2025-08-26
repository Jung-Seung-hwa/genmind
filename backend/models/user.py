from sqlalchemy import Column, Integer, String, TIMESTAMP, ForeignKey, func
from sqlalchemy.orm import relationship
from db.session import Base
from models.company import Company

class User(Base):
    __tablename__ = "t_user"

    user_email     = Column(String(50), primary_key=True)  # PK
    passwd    = Column(String(255), nullable=False)
    name      = Column(String(50), nullable=False)
    user_type = Column(String(20), nullable=False)
    comp_domain = Column(String(255), ForeignKey("t_company.comp_domain"))
    created_at  = Column(TIMESTAMP, server_default=func.now(), nullable=False)

