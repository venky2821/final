from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.sql import func
from database import get_db
from models import Product, OrderItem, StockMovement, Batch
from io import StringIO, BytesIO
import csv
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from datetime import datetime, date
from typing import Optional, Literal

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
        query = query.filter(func.date(StockMovement.timestamp) >= date_range.start_date)
    if date_range.end_date:
        query = query.filter(func.date(StockMovement.timestamp) <= date_range.end_date)

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

@router.get("/reports/{report_type}/export/{format}")
def export_report(
    report_type: Literal["stock-turnover", "profit-analysis", "batch-aging", "top-selling-products"],
    format: Literal["csv", "pdf"],
    date_range: DateRangeParams = Depends(),
    db: Session = Depends(get_db)
):
    try:
        if format == "csv":
            output = StringIO()
            writer = csv.writer(output)
            
            if report_type == "top-selling-products":
                writer.writerow(["Product Name", "Total Sold"])
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
                
                for row in results:
                    writer.writerow([row[0], row[1]])
                
                filename = f"top_selling_products_{date_range.start_date}_{date_range.end_date}.csv"
                output.seek(0)
                return StreamingResponse(output, media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={filename}"})
            
            elif report_type == "stock-turnover":
                writer.writerow(["Product Name", "Turnover Rate"])
                query = db.query(
                    Product.name,
                    (func.sum(func.abs(StockMovement.quantity)) / func.nullif(func.abs(Product.stock_level), 1)).label("turnover_rate")
                ).join(StockMovement, Product.id == StockMovement.product_id)\
                .filter(Product.stock_level > 0)
                
                if date_range.start_date:
                    query = query.filter(func.date(StockMovement.timestamp) >= date_range.start_date)
                if date_range.end_date:
                    query = query.filter(func.date(StockMovement.timestamp) <= date_range.end_date)
                
                results = query.group_by(Product.id).all()
                for row in results:
                    writer.writerow([row[0], round(row[1], 2) if row[1] is not None else 0])
                
                filename = f"stock_turnover_{date_range.start_date}_{date_range.end_date}.csv"
                output.seek(0)
                return StreamingResponse(output, media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={filename}"})
            
            elif report_type == "profit-analysis":
                writer.writerow(["Product Name", "Total Sold", "Revenue", "Cost", "Profit"])
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
                
                results = query.group_by(Product.id).all()
                for row in results:
                    writer.writerow([
                        row[0],
                        row[1],
                        round(row[2], 2) if row[2] is not None else 0,
                        round(row[3], 2) if row[3] is not None else 0,
                        round(row[4], 2) if row[4] is not None else 0
                    ])
                
                filename = f"profit_analysis_{date_range.start_date}_{date_range.end_date}.csv"
                output.seek(0)
                return StreamingResponse(output, media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={filename}"})
            
            elif report_type == "batch-aging":
                writer.writerow(["Batch Number", "Product Name", "Age (days)", "Remaining Quantity", "Status", "Days Until Expiry"])
                query = db.query(Batch).options(joinedload(Batch.product))
                
                if date_range.start_date:
                    query = query.filter(Batch.received_date >= date_range.start_date)
                if date_range.end_date:
                    query = query.filter(Batch.received_date <= date_range.end_date)
                
                batches = query.all()
                for batch in batches:
                    age_days = (datetime.utcnow().date() - batch.received_date).days
                    days_until_expiry = (batch.expiration_date - datetime.utcnow().date()).days if batch.expiration_date else None
                    writer.writerow([
                        batch.batch_number,
                        batch.product.name,
                        age_days,
                        batch.quantity_received,
                        batch.batch_status,
                        days_until_expiry if days_until_expiry is not None else "N/A"
                    ])
                
                filename = f"batch_aging_{date_range.start_date}_{date_range.end_date}.csv"
                output.seek(0)
                return StreamingResponse(output, media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={filename}"})
        
        elif format == "pdf":
            buffer = BytesIO()
            pdf = canvas.Canvas(buffer, pagesize=letter)
            width, height = letter
            
            # Add title and date range
            pdf.setFont("Helvetica-Bold", 16)
            report_titles = {
                "top-selling-products": "Top Selling Products Report",
                "reports/stock-turnover": "Stock Turnover Report",
                "reports/profit-analysis": "Profit Analysis Report",
                "batches/aging-report": "Batch Aging Report"
            }
            pdf.drawString(200, height - 50, report_titles[report_type])
            
            pdf.setFont("Helvetica", 12)
            date_range_text = f"Period: {date_range.start_date.strftime('%Y-%m-%d') if date_range.start_date else 'Start'} to {date_range.end_date.strftime('%Y-%m-%d') if date_range.end_date else 'End'}"
            pdf.drawString(50, height - 70, date_range_text)
            
            # Add report-specific content
            y_position = height - 100
            
            if report_type == "top-selling-products":
                pdf.drawString(50, y_position, "Product Name")
                pdf.drawString(300, y_position, "Total Sold")
                y_position -= 20
                
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
                
                for row in results:
                    pdf.drawString(50, y_position, str(row[0]))
                    pdf.drawString(300, y_position, str(row[1]))
                    y_position -= 20
                    if y_position < 50:
                        pdf.showPage()
                        y_position = height - 50
            
            elif report_type == "reports/stock-turnover":
                pdf.drawString(50, y_position, "Product Name")
                pdf.drawString(300, y_position, "Turnover Rate")
                y_position -= 20
                
                query = db.query(
                    Product.name,
                    (func.sum(func.abs(StockMovement.quantity)) / func.nullif(func.abs(Product.stock_level), 1)).label("turnover_rate")
                ).join(StockMovement, Product.id == StockMovement.product_id)\
                .filter(Product.stock_level > 0)
                
                if date_range.start_date:
                    query = query.filter(func.date(StockMovement.timestamp) >= date_range.start_date)
                if date_range.end_date:
                    query = query.filter(func.date(StockMovement.timestamp) <= date_range.end_date)
                
                results = query.group_by(Product.id).all()
                for row in results:
                    pdf.drawString(50, y_position, str(row[0]))
                    pdf.drawString(300, y_position, f"{round(row[1], 2) if row[1] is not None else 0}")
                    y_position -= 20
                    if y_position < 50:
                        pdf.showPage()
                        y_position = height - 50
            
            elif report_type == "reports/profit-analysis":
                pdf.drawString(50, y_position, "Product Name")
                pdf.drawString(150, y_position, "Total Sold")
                pdf.drawString(250, y_position, "Revenue")
                pdf.drawString(350, y_position, "Cost")
                pdf.drawString(450, y_position, "Profit")
                y_position -= 20
                
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
                
                results = query.group_by(Product.id).all()
                for row in results:
                    pdf.drawString(50, y_position, str(row[0]))
                    pdf.drawString(150, y_position, str(row[1]))
                    pdf.drawString(250, y_position, f"${round(row[2], 2) if row[2] is not None else 0}")
                    pdf.drawString(350, y_position, f"${round(row[3], 2) if row[3] is not None else 0}")
                    pdf.drawString(450, y_position, f"${round(row[4], 2) if row[4] is not None else 0}")
                    y_position -= 20
                    if y_position < 50:
                        pdf.showPage()
                        y_position = height - 50
            
            elif report_type == "batches/aging-report":
                pdf.drawString(50, y_position, "Batch Number")
                pdf.drawString(150, y_position, "Product Name")
                pdf.drawString(250, y_position, "Age (days)")
                pdf.drawString(350, y_position, "Remaining")
                pdf.drawString(450, y_position, "Status")
                y_position -= 20
                
                query = db.query(Batch).options(joinedload(Batch.product))
                
                if date_range.start_date:
                    query = query.filter(Batch.received_date >= date_range.start_date)
                if date_range.end_date:
                    query = query.filter(Batch.received_date <= date_range.end_date)
                
                batches = query.all()
                for batch in batches:
                    age_days = (datetime.utcnow().date() - batch.received_date).days
                    days_until_expiry = (batch.expiration_date - datetime.utcnow().date()).days if batch.expiration_date else None
                    
                    pdf.drawString(50, y_position, batch.batch_number)
                    pdf.drawString(150, y_position, batch.product.name)
                    pdf.drawString(250, y_position, str(age_days))
                    pdf.drawString(350, y_position, str(batch.quantity_received))
                    pdf.drawString(450, y_position, batch.batch_status)
                    
                    y_position -= 20
                    if y_position < 50:
                        pdf.showPage()
                        y_position = height - 50
            
            pdf.save()
            buffer.seek(0)
            
            filename = f"{report_type.replace('/', '_')}_{date_range.start_date}_{date_range.end_date}.pdf"
            return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={filename}"})
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


