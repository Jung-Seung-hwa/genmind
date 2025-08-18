from sqlalchemy import Column, Integer, String, TIMESTAMP, ForeignKey, func
from sqlalchemy.dialects.mysql import JSON
from sqlalchemy.orm import relationship
from db.session import Base

class Document(Base):
    __tablename__ = "t_document"

    doc_idx   = Column(Integer, primary_key=True, autoincrement=True, index=True)  # 문서 식별자
    email     = Column(String(50), ForeignKey("t_user.email"), nullable=False)     # 사용자 이메일 (FK)
    doc_name  = Column(String(255), nullable=False)                                # 문서 명
    file_name = Column(String(1000))                                               # 파일 이름
    file_size = Column(Integer)                                                    # 파일 사이즈
    file_ext  = Column(String(10))                                                 # 파일 확장자
    vector_data = Column(JSON)                                                     # 벡터 데이터(JSON)
    created_at  = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    user = relationship("User", backref="documents")
