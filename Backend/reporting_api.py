from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from database import get_db
from models import Product, OrderItem, StockMovement, Batch
from io import StringIO, BytesIO
import csv
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

router = APIRouter()

from pydantic import BaseModel

@router.get("/top-selling-products")
def get_top_selling_products(db: Session = Depends(get_db)):
    results = db.query(
        Product.name, 
        func.sum(OrderItem.quantity).label("total_sold")  # ✅ Fix: Sum up total quantity sold
    ) \
    .join(OrderItem, Product.id == OrderItem.product_id) \
    .group_by(Product.id) \
    .order_by(func.sum(OrderItem.quantity).desc()) \
    .limit(10) \
    .all()

    # Convert to list of dictionaries
    top_selling_products = [{"name": row[0], "total_sold": row[1]} for row in results]

    return {"top_selling_products": top_selling_products}

@router.get("/reports/stock-turnover")
def stock_turnover(db: Session = Depends(get_db)):
    result = (
        db.query(
            Product.name,
            (func.sum(func.abs(StockMovement.quantity)) / func.nullif(func.abs(Product.stock_level), 1)).label("turnover_rate")
        )
        .join(StockMovement, Product.id == StockMovement.product_id)
        .filter(Product.stock_level > 0)  # Ensure stock levels are valid
        .group_by(Product.id)
        .all()
    )

    # Convert tuples into JSON-serializable format
    stock_turnover = [{"name": row[0], "turnover_rate": round(row[1], 2) if row[1] is not None else 0} for row in result]

    return {"stock_turnover": stock_turnover}

@router.get("/reports/profit-analysis")
def profit_analysis(db: Session = Depends(get_db)):
    result = (
        db.query(
            Product.name,
            func.sum(OrderItem.quantity).label("total_sold"),
            (func.sum(OrderItem.quantity) * Product.price).label("revenue"),
            (func.sum(OrderItem.quantity) * Product.price * 0.7).label("cost"),  # Assuming 70% cost
            ((func.sum(OrderItem.quantity) * Product.price) - (func.sum(OrderItem.quantity) * Product.price * 0.7)).label("profit")
        )
        .join(OrderItem, Product.id == OrderItem.product_id)
        .group_by(Product.id)
        .all()
    )

    # Convert result tuples to JSON-serializable format
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
def export_csv(db: Session = Depends(get_db)):
    output = StringIO()
    writer = csv.writer(output)
    
    # Write headers
    writer.writerow(["Product Name", "Total Sold", "Revenue", "Cost", "Profit"])
    
    # Fetch data
    data = (
        db.query(
            Product.name,
            func.sum(OrderItem.quantity),
            (func.sum(OrderItem.quantity) * Product.price),
            (func.sum(OrderItem.quantity) * Product.price * 0.7),
            ((func.sum(OrderItem.quantity) * Product.price) - (func.sum(OrderItem.quantity) * Product.price * 0.7))
        )
        .join(OrderItem, Product.id == OrderItem.product_id)
        .group_by(Product.id)
        .all()
    )
    
    for row in data:
        writer.writerow(row)
    
    output.seek(0)
    
    return StreamingResponse(output, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=report.csv"})

@router.get("/reports/export/pdf")
def export_pdf(db: Session = Depends(get_db)):
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(200, height - 50, "Sales & Profit Report")

    pdf.setFont("Helvetica", 12)
    pdf.drawString(50, height - 80, "Product Name")
    pdf.drawString(200, height - 80, "Total Sold")
    pdf.drawString(300, height - 80, "Revenue")
    pdf.drawString(400, height - 80, "Cost")
    pdf.drawString(500, height - 80, "Profit")

    y_position = height - 100

    data = (
        db.query(
            Product.name,
            func.sum(OrderItem.quantity),
            (func.sum(OrderItem.quantity) * Product.price),
            (func.sum(OrderItem.quantity) * Product.price * 0.7),
            ((func.sum(OrderItem.quantity) * Product.price) - (func.sum(OrderItem.quantity) * Product.price * 0.7))
        )
        .join(OrderItem, Product.id == OrderItem.product_id)
        .group_by(Product.id)
        .all()
    )

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

    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": "attachment; filename=report.pdf"})

@router.get("/batches/aging-report/")
def get_batch_aging_report(db: Session = Depends(get_db)):
    batches = db.query(Batch).order_by(Batch.expiration_date).all()
    
    return {"aging_report": batches}

