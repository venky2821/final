from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import Batch, Product, OrderItem
from datetime import datetime, date, timedelta
from pydantic import BaseModel, ConfigDict, validator
from typing import List, Optional
from sqlalchemy import func

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
    expiration_date: Optional[date] = None
    batch_status: str
    age_days: Optional[int] = None
    remaining_quantity: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class ProductResponse(BaseModel):
    id: int
    name: str
    category: str
    stock_level: int
    price: float
    batch_info: Optional[List[BatchResponse]] = None

    model_config = ConfigDict(from_attributes=True)


class AgingReportBatch(BaseModel):
    batch_number: str
    product_name: str
    received_date: date
    expiration_date: Optional[date] = None
    age_days: int
    remaining_quantity: int
    batch_status: str
    days_until_expiry: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class AgingReportSummary(BaseModel):
    total_batches: int
    expired_batches: int
    active_batches: int
    expiring_soon: int

    model_config = ConfigDict(from_attributes=True)


class AgingReportResponse(BaseModel):
    aging_report: List[AgingReportBatch]
    summary: AgingReportSummary

    model_config = ConfigDict(from_attributes=True)

router = APIRouter()

@router.get("/batches", response_model=List[BatchResponse])
def get_batches(
    status: Optional[str] = Query(None, description="Filter by batch status"),
    product_id: Optional[int] = Query(None, description="Filter by product ID"),
    min_age: Optional[int] = Query(None, description="Minimum age in days"),
    max_age: Optional[int] = Query(None, description="Maximum age in days"),
    db: Session = Depends(get_db)
):
    query = db.query(Batch).options(joinedload(Batch.product))

    if status:
        query = query.filter(Batch.batch_status == status)
    if product_id:
        query = query.filter(Batch.product_id == product_id)
    if min_age:
        min_date = datetime.utcnow().date() - timedelta(days=min_age)
        query = query.filter(Batch.received_date <= min_date)
    if max_age:
        max_date = datetime.utcnow().date() - timedelta(days=max_age)
        query = query.filter(Batch.received_date >= max_date)

    batches = query.all()

    # Calculate age and remaining quantity for each batch
    result = []
    for batch in batches:
        age_days = (datetime.utcnow().date() - batch.received_date).days
        # For now, we'll use the quantity_received as remaining_quantity
        # This can be updated later when we implement proper order tracking
        remaining_quantity = batch.quantity_received
        
        result.append({
            "id": batch.id,
            "batch_number": batch.batch_number,
            "product_id": batch.product_id,
            "product_name": batch.product.name,
            "supplier_id": batch.supplier_id,
            "quantity_received": batch.quantity_received,
            "received_date": batch.received_date,
            "expiration_date": batch.expiration_date,
            "batch_status": batch.batch_status,
            "age_days": age_days,
            "remaining_quantity": remaining_quantity
        })

    return result

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

@router.get("/reports/batch-aging", response_model=AgingReportResponse)
def get_batch_aging_report(
    start_date: Optional[str] = Query(None, description="Start date for the report (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date for the report (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    try:
        # Convert string dates to date objects if provided
        parsed_start_date = datetime.strptime(start_date, "%Y-%m-%d").date() if start_date else None
        parsed_end_date = datetime.strptime(end_date, "%Y-%m-%d").date() if end_date else None
        
        # Get all batches with their current age and remaining quantity
        query = db.query(Batch).options(joinedload(Batch.product))
        
        if parsed_start_date:
            query = query.filter(Batch.received_date >= parsed_start_date)
        if parsed_end_date:
            query = query.filter(Batch.received_date <= parsed_end_date)
            
        batches = query.all()
        
        aging_report = []
        for batch in batches:
            age_days = (datetime.utcnow().date() - batch.received_date).days
            # For now, we'll use the quantity_received as remaining_quantity
            # This can be updated later when we implement proper order tracking
            remaining_quantity = batch.quantity_received
            
            aging_report.append(AgingReportBatch(
                batch_number=batch.batch_number,
                product_name=batch.product.name,
                received_date=batch.received_date,
                expiration_date=batch.expiration_date,
                age_days=age_days,
                remaining_quantity=remaining_quantity,
                batch_status=batch.batch_status,
                days_until_expiry=(batch.expiration_date - datetime.utcnow().date()).days if batch.expiration_date else None
            ))
        
        # Sort by age (oldest first)
        aging_report.sort(key=lambda x: x.age_days, reverse=True)
        
        summary = AgingReportSummary(
            total_batches=len(aging_report),
            expired_batches=len([b for b in aging_report if b.batch_status == "Expired"]),
            active_batches=len([b for b in aging_report if b.batch_status == "Active"]),
            expiring_soon=len([b for b in aging_report if b.days_until_expiry and 0 < b.days_until_expiry <= 30])
        )
        
        return AgingReportResponse(
            aging_report=aging_report,
            summary=summary
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid date format. Please use YYYY-MM-DD format.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))