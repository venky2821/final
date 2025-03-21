from math import prod
from models import User, Order, Product, OrderItem, StockMovement
from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from auth import get_current_user
from sqlalchemy.orm import Session
from typing import List
from utils import send_email_notification
from pydantic import BaseModel

class RejectionReason(BaseModel):
    reason: str

router = APIRouter()

@router.post("/reserve")
def reserve_items(purchases: List[dict], current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    total_price = 0
    order = Order(customer_name=current_user.username, total_price=0, status="reserved")  # Status = "reserved"
    db.add(order)
    db.commit()
    db.refresh(order)

    for purchase in purchases:
        product_id = purchase.get('product_id')
        quantity = purchase.get('quantity')

        product = db.query(Product).filter(Product.name == product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product with id {product_id} not found")

        if product.stock_level < quantity:
            raise HTTPException(status_code=400, detail=f"Not enough stock for product {product.name}")

        price = product.price * quantity
        total_price += price

        # Create OrderItem entry
        order_item = OrderItem(order_id=order.id, product_id=product.id, quantity=quantity, price=price)
        db.add(order_item)

        # Instead of reducing stock, mark it as "reserved"
        stock_movement = StockMovement(product_id=product.id, movement_type="reserve", quantity=-quantity)
        db.add(stock_movement)

        product.reserved_stock = product.reserved_stock + quantity  # Store reserved quantity
        product.stock_level -= quantity  # Reduce available stock but don't finalize the purchase

    order.total_price = total_price
    db.add(order)
    db.commit()

    return {"message": "Items reserved successfully. Waiting for admin approval."}

@router.post("/approve-purchase/{order_id}")
def approve_purchase(order_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Check if the user is an admin
    if current_user.role_id != 1:
        raise HTTPException(status_code=403, detail="Not authorized")

    order = db.query(Order).filter(Order.id == order_id, Order.status == "reserved").first()
    if not order:
        raise HTTPException(status_code=404, detail="Reserved order not found")

    # Finalize the purchase
    for item in db.query(OrderItem).filter(OrderItem.order_id == order.id).all():
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            continue  # Product may have been removed

        # Confirm stock movement from "reserved" to "sale"
        stock_movement = StockMovement(product_id=product.id, movement_type="sale", quantity=-item.quantity)
        db.add(stock_movement)

        product.reserved_stock -= item.quantity  # Remove reserved stock

    order.status = "completed"  # Mark order as completed
    db.add(order)
    db.commit()

    email = (
        db.query(User.email)
        .join(Order, Order.customer_name == User.username)
        .filter(Order.id == order_id)
        .scalar()
    )

    send_email_notification(email,"Purchase Approved", f"Your purchase has been approved. Order ID: {order_id}")

    return {"message": "Purchase approved successfully"}

@router.post("/reject-purchase/{order_id}")
def reject_purchase(order_id: int, rejection_data: RejectionReason, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Check if the user is an admin
    if current_user.role_id != 1:
        raise HTTPException(status_code=403, detail="Not authorized")

    order = db.query(Order).filter(Order.id == order_id, Order.status == "reserved").first()
    if not order:
        raise HTTPException(status_code=404, detail="Reserved order not found")

    # Finalize the purchase
    for item in db.query(OrderItem).filter(OrderItem.order_id == order.id).all():
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            continue  # Product may have been removed

        product.reserved_stock -= item.quantity  # Remove reserved stock
        product.stock_level += item.quantity

    order.status = "rejected"  # Mark order as completed
    order.rejection_reason = rejection_data.reason
    db.add(order)
    db.commit()

    email = (
        db.query(User.email)
        .join(Order, Order.customer_name == User.username)
        .filter(Order.id == order_id)
        .scalar()
    )

    send_email_notification(email, "Purchase Rejected", f"Your purchase has been rejected. Order ID: {order_id}")
    return {"message": "Purchase rejected successfully"}

@router.get("/orders/reserved")
def get_reserved_orders(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.role_id != 1:
        return {"error": "Access denied"}
    
    orders = db.query(Order).filter(Order.status == "reserved").all()

    # Fetch order details with items
    order_list = []
    for order in orders:
        # items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
        items = db.query(OrderItem, Product.name).join(Product, OrderItem.product_id == Product.id).filter(OrderItem.order_id == order.id).all()
        order_list.append({
            "id": order.id,
            "customer_name": order.customer_name,
            "total_price": order.total_price,
            "status": order.status,
            "items": [{
                "product_id": item.OrderItem.product_id,
                "product_name": item.name,
                "quantity": item.OrderItem.quantity,
                "price": item.OrderItem.price
            } for item in items]
        })

    return order_list

@router.get("/orders/customer")
def get_customer_orders(
    db: Session = Depends(get_db), 
    current_user=Depends(get_current_user)
):
    
    orders = (
        db.query(Order)
        .filter(Order.customer_name==current_user.username)
        .order_by(Order.created_at.desc())
        .all()
    )
    
    order_list = []
    for order in orders:
        items = (
            db.query(OrderItem, Product.name)
            .join(Product, OrderItem.product_id == Product.id)
            .filter(OrderItem.order_id == order.id)
            .all()
        )
        
        order_list.append({
            "id": order.id,
            "customer_name": order.customer_name,
            "total_price": order.total_price,
            "status": order.status,
            "items": [
                {
                    "product_id": item.OrderItem.product_id,
                    "product_name": item.name,
                    "quantity": item.OrderItem.quantity,
                    "price": item.OrderItem.price
                }
                for item in items
            ]
        })
    
    return order_list


@router.put("/orders/{order_id}/cancel")
def cancel_order(order_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")
    if order.status == "completed":
        raise HTTPException(status_code=400, detail="Only pending orders can be cancelled.")
    order.status = "cancelled"
    db.add(order)
    db.commit()
    return {"message": "Order cancelled successfully."}

@router.post("/orders/{order_id}/reorder")
def reorder(order_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")
    if order.status != "completed":
        raise HTTPException(status_code=400, detail="Only completed orders can be reordered.")
    new_order = order.copy()
    new_order.id = max(o.id for o in orders) + 1  # Assign new ID
    new_order.status = "pending"
    db.add(new_order)
    db.commit()
    return {"message": "Order reordered successfully.", "new_order_id": new_order.id}
