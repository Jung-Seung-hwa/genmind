from sqlalchemy import Column, Integer, String, TIMESTAMP, ForeignKey, CHAR, func
from sqlalchemy.orm import relationship
from db.session import Base

class Unanswered(Base):
    __tablename__ = "t_unanswered"

    unanswered_idx = Column(Integer, primary_key=True, autoincrement=True, index=True)  # 미응답 식별자
    email          = Column(String(50), ForeignKey("t_user.email"), nullable=False)     # 사용자 아이디
    gpt_idx        = Column(Integer, ForeignKey("t_gpt.gpt_idx"))                       # GPT 식별자
    is_resolved    = Column(CHAR(1), default="N", nullable=False)                       # 해결 여부 (Y/N)
    created_at     = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    user = relationship("User", backref="unanswered")
    gpt  = relationship("GptLog", backref="unanswered_items")
