from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from database import get_db
from models import Product, OrderItem, StockMovement, Batch
from io import StringIO, BytesIO
import csv
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from datetime import datetime, date
from typing import Optional

router = APIRouter()

from pydantic import BaseModel

class DateRangeParams:
    def __init__(
        self,
        start_date: Optional[date] = Query(None, description="Start date for the report"),
        end_date: Optional[date] = Query(None, description="End date for the report")
    ):
        self.start_date = start_date
        self.end_date = end_date

@router.get("/top-selling-products")
def get_top_selling_products(
    date_range: DateRangeParams = Depends(),
    db: Session = Depends(get_db)
):
    query = db.query(
        Product.name, 
        func.sum(OrderItem.quantity).label("total_sold")
    ).join(OrderItem, Product.id == OrderItem.product_id)

    if date_range.start_date:
        query = query.filter(OrderItem.created_at >= date_range.start_date)
    if date_range.end_date:
        query = query.filter(OrderItem.created_at <= date_range.end_date)

    results = query.group_by(Product.id)\
        .order_by(func.sum(OrderItem.quantity).desc())\
        .limit(10)\
        .all()

    top_selling_products = [{"name": row[0], "total_sold": row[1]} for row in results]
    return {"top_selling_products": top_selling_products}

@router.get("/reports/stock-turnover")
def stock_turnover(
    date_range: DateRangeParams = Depends(),
    db: Session = Depends(get_db)
):
    query = db.query(
        Product.name,
        (func.sum(func.abs(StockMovement.quantity)) / func.nullif(func.abs(Product.stock_level), 1)).label("turnover_rate")
    ).join(StockMovement, Product.id == StockMovement.product_id)\
    .filter(Product.stock_level > 0)

    if date_range.start_date:
        query = query.filter(StockMovement.created_at >= date_range.start_date)
    if date_range.end_date:
        query = query.filter(StockMovement.created_at <= date_range.end_date)

    result = query.group_by(Product.id).all()
    stock_turnover = [{"name": row[0], "turnover_rate": round(row[1], 2) if row[1] is not None else 0} for row in result]
    return {"stock_turnover": stock_turnover}

@router.get("/reports/profit-analysis")
def profit_analysis(
    date_range: DateRangeParams = Depends(),
    db: Session = Depends(get_db)
):
    query = db.query(
        Product.name,
        func.sum(OrderItem.quantity).label("total_sold"),
        (func.sum(OrderItem.quantity) * Product.price).label("revenue"),
        (func.sum(OrderItem.quantity) * Product.price * 0.7).label("cost"),
        ((func.sum(OrderItem.quantity) * Product.price) - (func.sum(OrderItem.quantity) * Product.price * 0.7)).label("profit")
    ).join(OrderItem, Product.id == OrderItem.product_id)

    if date_range.start_date:
        query = query.filter(OrderItem.created_at >= date_range.start_date)
    if date_range.end_date:
        query = query.filter(OrderItem.created_at <= date_range.end_date)

    result = query.group_by(Product.id).all()
    profit_analysis = [
        {
            "name": row[0],
            "total_sold": row[1],
            "revenue": round(row[2], 2) if row[2] is not None else 0,
            "cost": round(row[3], 2) if row[3] is not None else 0,
            "profit": round(row[4], 2) if row[4] is not None else 0
        }
        for row in result
    ]
    return {"profit_analysis": profit_analysis}

@router.get("/reports/export/csv")
def export_csv(
    date_range: DateRangeParams = Depends(),
    db: Session = Depends(get_db)
):
    output = StringIO()
    writer = csv.writer(output)
    
    writer.writerow(["Product Name", "Total Sold", "Revenue", "Cost", "Profit"])
    
    query = db.query(
        Product.name,
        func.sum(OrderItem.quantity),
        (func.sum(OrderItem.quantity) * Product.price),
        (func.sum(OrderItem.quantity) * Product.price * 0.7),
        ((func.sum(OrderItem.quantity) * Product.price) - (func.sum(OrderItem.quantity) * Product.price * 0.7))
    ).join(OrderItem, Product.id == OrderItem.product_id)

    if date_range.start_date:
        query = query.filter(OrderItem.created_at >= date_range.start_date)
    if date_range.end_date:
        query = query.filter(OrderItem.created_at <= date_range.end_date)

    data = query.group_by(Product.id).all()
    
    for row in data:
        writer.writerow(row)
    
    output.seek(0)
    
    filename = f"report_{date_range.start_date}_{date_range.end_date}.csv" if date_range.start_date and date_range.end_date else "report.csv"
    return StreamingResponse(output, media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={filename}"})

@router.get("/reports/export/pdf")
def export_pdf(
    date_range: DateRangeParams = Depends(),
    db: Session = Depends(get_db)
):
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(200, height - 50, "Sales & Profit Report")
    
    # Add date range to the report
    pdf.setFont("Helvetica", 12)
    date_range_text = f"Period: {date_range.start_date.strftime('%Y-%m-%d') if date_range.start_date else 'Start'} to {date_range.end_date.strftime('%Y-%m-%d') if date_range.end_date else 'End'}"
    pdf.drawString(50, height - 70, date_range_text)

    pdf.setFont("Helvetica", 12)
    pdf.drawString(50, height - 100, "Product Name")
    pdf.drawString(200, height - 100, "Total Sold")
    pdf.drawString(300, height - 100, "Revenue")
    pdf.drawString(400, height - 100, "Cost")
    pdf.drawString(500, height - 100, "Profit")

    y_position = height - 120

    query = db.query(
        Product.name,
        func.sum(OrderItem.quantity),
        (func.sum(OrderItem.quantity) * Product.price),
        (func.sum(OrderItem.quantity) * Product.price * 0.7),
        ((func.sum(OrderItem.quantity) * Product.price) - (func.sum(OrderItem.quantity) * Product.price * 0.7))
    ).join(OrderItem, Product.id == OrderItem.product_id)

    if date_range.start_date:
        query = query.filter(OrderItem.created_at >= date_range.start_date)
    if date_range.end_date:
        query = query.filter(OrderItem.created_at <= date_range.end_date)

    data = query.group_by(Product.id).all()

    for row in data:
        pdf.drawString(50, y_position, str(row[0]))
        pdf.drawString(200, y_position, str(row[1]))
        pdf.drawString(300, y_position, f"${row[2]:.2f}")
        pdf.drawString(400, y_position, f"${row[3]:.2f}")
        pdf.drawString(500, y_position, f"${row[4]:.2f}")
        y_position -= 20
        if y_position < 50:
            pdf.showPage()
            y_position = height - 100

    pdf.save()
    buffer.seek(0)

    filename = f"report_{date_range.start_date}_{date_range.end_date}.pdf" if date_range.start_date and date_range.end_date else "report.pdf"
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={filename}"})

@router.get("/batches/aging-report/")
def get_batch_aging_report(
    date_range: DateRangeParams = Depends(),
    db: Session = Depends(get_db)
):
    query = db.query(Batch)
    
    if date_range.start_date:
        query = query.filter(Batch.created_at >= date_range.start_date)
    if date_range.end_date:
        query = query.filter(Batch.created_at <= date_range.end_date)
        
    batches = query.order_by(Batch.expiration_date).all()
    return {"aging_report": batches}

