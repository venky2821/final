from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import Batch, Product
from datetime import datetime, date, timedelta
from pydantic import BaseModel
from typing import List, Optional

class BatchCreate(BaseModel):
    product_id: int
    supplier_id: int
    batch_number: str
    expiration_date: date
    received_date: date
    quantity_received: int


class BatchResponse(BaseModel):
    id: int
    batch_number: str
    product_id: int
    product_name: str 
    supplier_id: int
    quantity_received: int
    received_date: date
    expiration_date: Optional[date]
    batch_status: str

    class Config:
        from_attributes = True


class ProductResponse(BaseModel):
    id: int
    name: str
    category: str
    stock_level: int
    price: float
    # batch_number: Optional[str]  # Include batch info if needed

    class Config:
        from_attributes = True  # Enables ORM serialization

router = APIRouter()

@router.get("/batches", response_model=List[BatchResponse])
def get_batches(db: Session = Depends(get_db)):
    # return db.query(Batch).all()
    batches = db.query(Batch).options(joinedload(Batch.product)).all()

    return [
        {
            "id": batch.id,
            "batch_number": batch.batch_number,
            "product_id": batch.product_id,
            "product_name": batch.product.name,  # ✅ Fetch product name
            "supplier_id": batch.supplier_id,
            "quantity_received": batch.quantity_received,
            "received_date": batch.received_date,
            "expiration_date": batch.expiration_date,
            "batch_status": batch.batch_status
        }
        for batch in batches
    ]

@router.post("/add/batch/")
def create_batch(batch_data: BatchCreate, db: Session = Depends(get_db)):
    print("Received Batch Data:", batch_data)
    product = db.query(Product).filter(Product.id == batch_data.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    new_batch = Batch(
        product_id=batch_data.product_id,
        supplier_id=batch_data.supplier_id,
        batch_number=batch_data.batch_number,
        expiration_date=batch_data.expiration_date,
        received_date=batch_data.received_date,
        quantity_received=batch_data.quantity_received
    )
    db.add(new_batch)
    db.commit()
    db.refresh(new_batch)

    return {"message": "Batch created successfully", "batch": new_batch}


@router.get("/batches/{product_id}")
def get_batches_by_product(product_id: int, db: Session = Depends(get_db)):
    batches = db.query(Batch).filter(Batch.product_id == product_id).all()
    if not batches:
        raise HTTPException(status_code=404, detail="No batches found for this product")
    
    return batches


@router.get("/batches/expiring-soon/")
def get_expiring_batches(days: int = 30, db: Session = Depends(get_db)):
    threshold_date = datetime.utcnow().date() + timedelta(days=days)
    expiring_batches = db.query(Batch).filter(Batch.expiration_date <= threshold_date).all()
    
    if not expiring_batches:
        return {"message": "No batches expiring soon"}
    
    return {"expiring_batches": expiring_batches}

@router.get("/batches/products/{batch_number}", response_model=List[ProductResponse])
def get_products_by_batch(
    batch_number: str,
    db: Session = Depends(get_db)
):
    query = db.query(Product).join(Batch).filter(Batch.product_id == Product.id)

    if batch_number:
        query = query.filter(Batch.batch_number == batch_number)

    products = query.all()

    if not products:
        raise HTTPException(status_code=404, detail="No products found for this batch")

    return products