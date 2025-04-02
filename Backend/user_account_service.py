import jwt
import datetime
import smtplib
import json

from database import get_db, engine, get_session, SessionLocal
from fastapi import FastAPI, HTTPException, Depends, APIRouter
from pydantic import BaseModel, EmailStr, ConfigDict
from sqlalchemy.orm import Session
from models import User
from utils import get_password_hash, send_email_notification, verify_password

# app = FastAPI()
router = APIRouter()

SECRET_KEY = "your_secret_key"  # Change this to a strong, secure key
PASSWORD_HISTORY_LIMIT = 5  # Store last 5 passwords

class ForgotPasswordRequest(BaseModel):
    email: str

class ChangePassword(BaseModel):
    token: str
    new_password: str

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str

class UserResponse(BaseModel):
    email: EmailStr
    username: str
    is_active: bool = True

def generate_reset_token(email):
    expiration_time = datetime.datetime.utcnow() + datetime.timedelta(hours=1)  # Token valid for 1 hour
    payload = {"email": email, "exp": expiration_time}
    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    return token

def verify_reset_token(token):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload["email"]  # Return email if token is valid
    except jwt.ExpiredSignatureError:
        return None  # Token expired
    except jwt.InvalidTokenError:
        return None  # Invalid token

@router.post("/register", response_model=UserResponse)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        username=user.username,
        hashed_password=hashed_password
    )

    db_user.password_history = json.dumps([hashed_password])

    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(status_code=400, detail="User email does not exist")

    token = generate_reset_token(request.email)
   
    reset_link = f"http://localhost:8000/change-password?token={token}"
    email_message = f"""
    You have requested to reset your password.

    Use the following token to reset your password:
    {token}

    This token expires within an hour.

    If you did not request this, please ignore this email.

    Thank you,
    Your Support Team
    """

    send_email_notification(user.email, "Password Reset Request", email_message)

    user.reset_token = token
    db.commit()

    # print(f"Sending reset link: {reset_link} to {request.email}")

    return {"message": "Password reset link sent!"}

@router.post("/change-password")
def change_password(change_request: ChangePassword, db: Session = Depends(get_db)):
    email = verify_reset_token(change_request.token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=400, detail="User email does not exist")
    
    # Check if new password is in the history
    if user.password_history:
        password_history = json.loads(user.password_history)
        if any(verify_password(change_request.new_password, old_password) for old_password in password_history):
            raise HTTPException(status_code=400, detail="Cannot reuse an old password.")

    # Update password history (Keep last 4 + new one)
    password_history = (password_history[-(PASSWORD_HISTORY_LIMIT - 1):])  # Keep last 4
    password_history.append(user.hashed_password)  # Add the current password
    user.password_history = json.dumps(password_history)

    user.hashed_password = get_password_hash(change_request.new_password)
    user.reset_token = None  # Clear the reset token
    db.commit()
    return {"message": "Password has been successfully changed"}