from sqlalchemy import Column, Integer, String, Boolean, Float, Date, Enum, ForeignKey, TIMESTAMP, func, DateTime
from sqlalchemy.orm import relationship
from database import Base
import datetime


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    password_history = Column(String)
    is_active = Column(Boolean, default=True)
    reset_token = Column(String, nullable=True)
    role_id = Column(Integer, ForeignKey('roles.id'), nullable=True, default=2)  # Default to Customer role
    reviews = relationship("Review", back_populates="user")
    role = relationship("Role", back_populates="users")
    login_activity = relationship("LoginActivity", back_populates="user")
    photos = relationship("Photo", back_populates="user")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Role(Base):
    __tablename__ = 'roles'

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True)

    users = relationship("User", back_populates="role")

class Product(Base):
    __tablename__ = 'products'

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    stock_level = Column(Integer, nullable=False)
    reserved_stock = Column(Integer, default=0)
    reorder_threshold = Column(Integer, nullable=False)
    cost_price = Column(Float, nullable=False)
    price = Column(Float, nullable=False)
    supplier_id = Column(Integer, ForeignKey('suppliers.id'))
    image_url = Column(String, nullable=True)  # Store image file path or URL
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, onupdate=func.now())

     # Relationship: Each product belongs to a supplier
    supplier = relationship("Supplier", back_populates="products")

    # Relationship: A product can have multiple batches
    batches = relationship("Batch", back_populates="product")

    # Relationship: A product can have multiple reviews
    # reviews = relationship("Review", back_populates="product")

    order_items = relationship("OrderItem", back_populates="product")  # Orders relationship
    stock_movements = relationship("StockMovement", back_populates="product")  # Track stock changes

class Supplier(Base):
    __tablename__ = 'suppliers'

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    contact_person = Column(String, nullable=False)
    phone = Column(String(20), nullable=False)
    email = Column(String, nullable=False, unique=True)
    address = Column(String, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, onupdate=func.now())

    # Relationship: A supplier can provide multiple products
    products = relationship("Product", back_populates="supplier")

class Batch(Base):
    __tablename__ = 'batches'

    id = Column(Integer, primary_key=True)
    batch_number = Column(String, unique=True, nullable=False)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False)
    supplier_id = Column(Integer, ForeignKey('suppliers.id'), nullable=False)
    quantity_received = Column(Integer, nullable=False)
    received_date = Column(Date, nullable=False)
    expiration_date = Column(Date, nullable=True)  # Nullable for non-expiring items
    batch_status = Column(Enum('Active', 'Expired', 'Sold Out', name='batch_status'), nullable=False, default='Active')
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, onupdate=func.now())

    # Relationships
    product = relationship("Product", back_populates="batches")

class Review(Base):
    __tablename__ = 'reviews'

    id = Column(Integer, primary_key=True)
    # product_id = Column(Integer, ForeignKey('products.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    rating = Column(Integer, nullable=False)
    review_text = Column(String, nullable=False)
    review_photo = Column(String, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, onupdate=func.now())
    approved = Column(Integer, default=0)  # 0 = Pending, 1 = Approved


    # Relationships
    # product = relationship("Product", back_populates="reviews")
    user = relationship("User", back_populates="reviews")

class LoginActivity(Base):
    __tablename__ = 'login_activity'

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    timestamp = Column(TIMESTAMP, server_default=func.now())

    user = relationship("User", back_populates="login_activity")

class Photo(Base):
    __tablename__ = "photos"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String, nullable=False)
    category = Column(String, nullable=True)  # New column for categorization
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(TIMESTAMP, server_default=func.now())  # Use func.now() to set the current timestamp
    approved = Column(Integer, default=0)  # 0 = Pending, 1 = Approved

    user = relationship("User", back_populates="photos")

class Order(Base):
    __tablename__ = 'orders'

    id = Column(Integer, primary_key=True)
    customer_name = Column(String, nullable=False)  # Could be linked to a Customer table
    total_price = Column(Float, nullable=False)
    status = Column(String, default="pending")  # 'pending', 'completed', 'cancelled', 'rejected'
    rejection_reason = Column(String, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    order_items = relationship("OrderItem", back_populates="order")

class OrderItem(Base):
    __tablename__ = 'order_items'

    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey('orders.id'))
    product_id = Column(Integer, ForeignKey('products.id'))
    quantity = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)  # Store price at time of order

    order = relationship("Order", back_populates="order_items")
    product = relationship("Product", back_populates="order_items")

class StockMovement(Base):
    __tablename__ = 'stock_movements'

    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey('products.id'))
    movement_type = Column(String, nullable=False)  # 'purchase', 'restock', 'sale', 'adjustment'
    quantity = Column(Integer, nullable=False)
    timestamp = Column(TIMESTAMP, server_default=func.now())

    product = relationship("Product", back_populates="stock_movements")
