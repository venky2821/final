from fastapi import FastAPI, Depends, HTTPException, status, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from auth_controller import router as auth_router
from database import get_db
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
import models
from passlib.context import CryptContext
from datetime import datetime, timezone, timedelta
import secrets
from jose import jwt, JWTError
import os
from PIL import Image
import io
from sqlalchemy import create_engine

# Initialize test FastAPI app without static files
test_app = FastAPI()

# Add CORS middleware
test_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security configurations
SECRET_KEY = "test-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Add this function to ensure database tables are created
def setup_test_db(engine):
    Base.metadata.create_all(bind=engine)

# Pydantic models
class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class ResetPassword(BaseModel):
    email: EmailStr

class ChangePassword(BaseModel):
    token: str
    new_password: str

# Helper functions
def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# Add this after the oauth2_scheme definition
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(models.User).filter(models.User.email == username).first()
    if user is None:
        raise credentials_exception
    return user

# Route handlers
@test_app.post("/register")
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    # Check if email exists
    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if username exists
    if db.query(models.User).filter(models.User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        username=user.username,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return {"email": db_user.email, "username": db_user.username}

@test_app.post("/token")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@test_app.post("/reset-password")
def request_password_reset(reset_request: ResetPassword, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == reset_request.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    reset_token = secrets.token_urlsafe(32)
    user.reset_token = reset_token
    db.commit()
    
    return {"message": "Password reset link has been sent to your email", "token": reset_token}

@test_app.post("/change-password")
def change_password(change_request: ChangePassword, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.reset_token == change_request.token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    user.hashed_password = get_password_hash(change_request.new_password)
    user.reset_token = None
    db.commit()
    return {"message": "Password has been successfully changed"}

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png'}

def validate_image(file: UploadFile) -> bool:
    """Validate image format and size"""
    # Check file extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Invalid file format. Only JPG and PNG are allowed")
    
    # Check file size
    file.file.seek(0, 2)  # Seek to end of file
    size = file.file.tell()
    file.file.seek(0)  # Reset file pointer
    
    if size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size too large. Maximum size is 5MB")
    
    # Validate image format
    try:
        img = Image.open(io.BytesIO(file.file.read()))
        img.verify()
        file.file.seek(0)  # Reset file pointer after verification
    except:
        raise HTTPException(status_code=400, detail="Invalid image file")
    
    return True

@test_app.post("/photos/upload")
async def upload_photo(
    uploaded_file: UploadFile = File(...),
    category: str = Form(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a new photo"""
    # Validate the image
    validate_image(uploaded_file)
    
    # Create photos directory if it doesn't exist
    os.makedirs('photos', exist_ok=True)
    
    # Save the file
    file_location = f"photos/{uploaded_file.filename}"
    with open(file_location, "wb+") as file_object:
        file_object.write(uploaded_file.file.read())
    
    # Create database entry
    new_photo = models.Photo(
        url=f"http://localhost:8000/static/{uploaded_file.filename}",
        category=category,
        uploaded_by=current_user.id,
        approved=0
    )
    db.add(new_photo)
    db.commit()
    db.refresh(new_photo)
    
    return {
        "message": "Photo uploaded successfully",
        "photo_id": new_photo.id
    } 