from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

MYSQL_USER = os.getenv("MYSQL_USER", "mp_25K_LI3_p3_3")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "smhrd3")
MYSQL_HOST = os.getenv("MYSQL_HOST", "project-db-campus.smhrd.com")
MYSQL_PORT = os.getenv("MYSQL_PORT", "3312")
MYSQL_DB = os.getenv("MYSQL_DB", "mp_25K_LI3_p3_3")

DATABASE_URL = (
    f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}?charset=utf8mb4"
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True, echo=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()

# ✅ FastAPI Depends에서 쓸 세션 의존성
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()