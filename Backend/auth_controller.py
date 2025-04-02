from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from models import User
from database import get_db
from auth import get_current_user  # Middleware to get authenticated user

router = APIRouter()

@router.get("/auth/me")
def get_me(user: User = Depends(get_current_user)):
    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "role_id": user.role_id,
        "is_active": user.is_active
    }
