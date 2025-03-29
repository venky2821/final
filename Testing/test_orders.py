import sys
import os

# Add the Backend directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'Backend'))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from database import Base, get_db
# from test_app import test_app as app
from main import app
from models import User, Product, Order
from auth import get_current_user

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

# Override the get_db dependency
app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)  # Drop existing tables
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def auth_headers():
    client.post("/register", json={"email": "admin@example.com", "username": "admin", "password": "adminpass"})
    response = client.post(
        "/token",
        data={"username": "admin@example.com", "password": "adminpass"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    return {"Authorization": f"Bearer {response.json()['access_token']}"}

@pytest.fixture
def create_test_user(db):
    user = User(username="testuser", email="test@example.com", role_id=1)
    db.add(user)
    db.commit()
    return user

@pytest.fixture
def db_session() -> Session:
    """Provides a clean test database session."""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()

@pytest.fixture
def create_test_product(db_session):
    product = Product(name="Branded T-shirt", category="Clothing", stock_level=10, reorder_threshold=20, price=15.99, cost_price=10.99, supplier_id=1, image_url="/images/tshirt.png")
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)
    return product

def override_get_current_user():
    from models import User  # Ensure User model is imported
    return User(id=1, username="testuser", email="test@example.com", role_id=1)

client = TestClient(app)
app.dependency_overrides[get_current_user] = override_get_current_user

# Test reserving items
def test_reserve_items(auth_headers, db_session, create_test_product):
    print("Products in DB:", db_session.query(Product).all())

    response = client.post(
        "/reserve",
        json=[{"product_id": "Branded T-shirt", "quantity": 2}],
        headers=auth_headers
    )
    assert response.status_code == 200
    assert "Items reserved successfully" in response.json()["message"]

# Test approving a purchase
def test_approve_purchase(auth_headers, db_session):
    test_order = Order(id=1, customer_name="test_user", status="reserved", total_price=200)
    db_session.add(test_order)
    db_session.commit()
    response = client.post("/approve-purchase/1", headers=auth_headers)
    assert response.status_code == 200
    assert "Purchase approved successfully" in response.json()["message"]
    # Cleanup: Delete the test order
    db_session.delete(test_order)
    db_session.commit()

# Test rejecting a purchase
def test_reject_purchase(auth_headers, db_session):
    test_order = Order(id=1, customer_name="test_user", status="reserved", total_price=200)
    db_session.add(test_order)
    db_session.commit()
    response = client.post("/reject-purchase/1", json={"reason": "Out of stock"}, headers=auth_headers)
    assert response.status_code == 200
    assert "Purchase rejected successfully" in response.json()["message"]
    db_session.delete(test_order)
    db_session.commit()

# Test retrieving reserved orders
def test_get_reserved_orders(auth_headers):
    response = client.get("/orders/reserved", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

# Test retrieving customer orders
def test_get_customer_orders(auth_headers):
    response = client.get("/orders/customer", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

# Test canceling an order
def test_cancel_order(auth_headers, db_session):
    test_order = Order(id=1, customer_name="test_user", status="reserved", total_price=200)
    db_session.add(test_order)
    db_session.commit()
    response = client.put("/orders/1/cancel", headers=auth_headers)
    assert response.status_code == 200
    assert "Order cancelled successfully" in response.json()["message"]
    # Cleanup: Delete the test order
    db_session.delete(test_order)
    db_session.commit()

# Test reordering an order
def test_reorder(auth_headers, db_session):
    test_order = Order(id=1, customer_name="test_user", status="reserved", total_price=200)
    db_session.add(test_order)
    db_session.commit()
    response = client.post("/orders/1/reorder", headers=auth_headers)
    assert response.status_code == 200
    assert "Order reordered successfully" in response.json()["message"]
    # Cleanup: Delete the test order
    db_session.delete(test_order)
    db_session.commit()
