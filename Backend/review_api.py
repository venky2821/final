from pydantic import BaseModel
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from sqlalchemy.orm import Session
from models import Review
from fastapi.staticfiles import StaticFiles
from database import get_db
from typing import List, Optional
from auth_controller import get_current_user
from user_account_service import User
import os

class ReviewCreate(BaseModel):
    # product_id: int
    rating: int
    review_text: str
    # review_photo: Optional[str] = None
    review_photo: UploadFile = File(None)

class ReviewResponse(BaseModel):
    id: int
    # product_id: int
    user_id: int
    rating: int
    review_text: str
    review_photo: str
    created_at: datetime

router = APIRouter()

# Create photos directory if it doesn't exist and mount it for static files
PHOTOS_DIR = "review_photos"
os.makedirs(PHOTOS_DIR, exist_ok=True)
router.mount("/review/static", StaticFiles(directory=PHOTOS_DIR), name="review_static")

@router.get("/reviews/", response_model=List[ReviewResponse])
async def get_reviews(db: Session = Depends(get_db)):
    return db.query(Review).filter(Review.approved == 1).all()

# @router.get("/reviews/all", response_model=List[ReviewResponse])
@router.get("/reviews/all")
async def get_all_reviews(db: Session = Depends(get_db)):
    return db.query(Review).all()

@router.post("/reviews/upload", response_model=ReviewResponse)
async def create_review(
    rating: int= Form(...),
    review_text: str= Form(...),
    review_photo: UploadFile = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Validate rating
    if not 1 <= rating <= 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rating must be between 1 and 5"
        )
    
    # Validate review text
    if not review_text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Review text cannot be empty"
        )
    
    # Check if product exists
    # product = db.query(models.Product).filter(models.Product.id == review.product_id).first()
    # if not product:
    #     raise HTTPException(
    #         status_code=status.HTTP_404_NOT_FOUND,
    #         detail="Product not found"
    #     )
    review_photo_url = None
    if review_photo:
        # Ensure the photos directory exists
        os.makedirs(PHOTOS_DIR, exist_ok=True)
        file_location = f"{PHOTOS_DIR}/{review_photo.filename}"
        with open(file_location, "wb") as file:
            file.write(review_photo.file.read())
        review_photo_url = f"http://localhost:8000/review/static/{review_photo.filename}"
    
    # Create review
    db_review = Review(
        # product_id=review.product_id,
        user_id=current_user.id,
        rating=rating,
        review_text=review_text,
        review_photo=review_photo_url
    )
    
    db.add(db_review)
    db.commit()
    db.refresh(db_review)
    
    return db_review

@router.put("/reviews/{review_id}/approve")
def approve_review(review_id: int, db: Session = Depends(get_db)):
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        return {"error": "Review not found"}

    review.approved = 1
    db.commit()
    return {"message": "Review approved"}

@router.put("/reviews/{review_id}/reject")
def reject_review(review_id: int, db: Session = Depends(get_db)):
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        return {"error": "Review not found"}

    review.approved = -1
    db.commit()
    return {"message": "Review rejected"}
