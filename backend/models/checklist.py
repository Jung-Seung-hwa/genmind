from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, TIMESTAMP, func
from sqlalchemy.orm import relationship
from db.session import Base

class Checklist(Base):
    __tablename__ = "t_checklist"

    item_id = Column(Integer, primary_key=True, autoincrement=True, comment="체크리스트 고유 ID")
    to_user = Column(String(50), ForeignKey("t_user.user_email"), nullable=True, comment="받는 사용자(FK)")
    from_user = Column(String(50), ForeignKey("t_user.user_email"), nullable=False, comment="보낸 사용자(FK)")
    item = Column(String(255), nullable=False, comment="체크리스트 내용")
    deadline = Column(DateTime, nullable=True, comment="마감 기한")
    is_done = Column(Boolean, default=False, nullable=False, comment="완료 여부")
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False, comment="생성 일자")

    # 관계 설정 (User 모델과 연결)
    to_user_rel = relationship("User", foreign_keys=[to_user], backref="checklists_received")
    from_user_rel = relationship("User", foreign_keys=[from_user], backref="checklists_sent")
