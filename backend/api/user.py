from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db.session import get_db
from models.user import User
from api.auth import get_current_user

router = APIRouter()

# ✅ 같은 회사(comp_domain) 직원 목록 조회 (자기 자신 제외)
@router.get("/users")
def get_company_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    users = (
        db.query(User)
        .filter(
            User.comp_domain == current_user.comp_domain,
            User.user_email != current_user.user_email  # 자기 자신 제외
        )
        .all()
    )
    return [
        {
            "id": u.user_email,   # PK
            "name": u.name,
            "email": u.user_email,
        }
        for u in users
    ]
