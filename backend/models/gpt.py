from sqlalchemy import Column, Integer, String, TIMESTAMP, Text, ForeignKey, func
from sqlalchemy.dialects.mysql import JSON
from sqlalchemy.orm import relationship
from db.session import Base

class GptLog(Base):
    __tablename__ = "t_gpt"

    gpt_idx   = Column(Integer, primary_key=True, autoincrement=True, index=True)  # GPT 식별자
    email     = Column(String(50), ForeignKey("t_user.email"), nullable=False)     # 사용자 이메일
    user_req  = Column(Text, nullable=False)                                       # 사용자 질문
    gpt_res   = Column(Text)                                                       # GPT 응답
    req_vector = Column(JSON)                                                      # 질문 벡터(JSON)
    gpt_views = Column(Integer, default=0)                                         # 조회수
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    user = relationship("User", backref="gpt_logs")
