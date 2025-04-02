import sys, os, io, pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from database import Base, get_db
from main import app
from models import Product, User, StockMovement
from auth import get_current_user

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def auth_headers():
    client.post("/register", json={"email": "test@example.com", "username": "tester", "password": "testpass"})
    response = client.post("/token", data={"username": "test@example.com", "password": "testpass"}, headers={"Content-Type": "application/x-www-form-urlencoded"})
    return {"Authorization": f"Bearer {response.json()['access_token']}"}

@pytest.fixture
def db_session():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()

def override_get_current_user():
    return User(id=1, username="tester", email="test@example.com", role_id=1)

app.dependency_overrides[get_current_user] = override_get_current_user
client = TestClient(app)

# Test: Add Product
def test_add_product(auth_headers):
    product_data = {
        "name": "Test Product",
        "category": "Snacks",
        "stock_level": 50,
        "reserved_stock": 0,
        "reorder_threshold": 20,
        "cost_price": 2.5,
        "price": 5.0,
        "supplier_id": 1,
        "image_url": "/images/test.png"
    }
    response = client.post("/products/add", json=product_data, headers=auth_headers)
    assert response.status_code == 200
    assert "product" in response.json()

# Test: Get all products
def test_get_all_products(auth_headers, db_session):
    db_session.add(Product(name="Chips", category="Snacks", stock_level=10, reorder_threshold=5, price=3.5, cost_price=2.0, supplier_id=1))
    db_session.commit()
    response = client.get("/products", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

# Test: Get single product
def test_get_product_by_name(auth_headers, db_session):
    db_session.add(Product(name="Ice Cream", category="Frozen", stock_level=15, reorder_threshold=10, price=4.0, cost_price=2.5, supplier_id=1))
    db_session.commit()
    response = client.get("/products/Ice Cream", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["name"] == "Ice Cream"

# Test: Upload product image
def test_upload_product_image(auth_headers):
    file_bytes = io.BytesIO(b"fakeimage")
    files = {"uploaded_file": ("test.jpg", file_bytes, "image/jpeg")}
    response = client.post("/products/upload-image", files=files, headers=auth_headers)
    assert response.status_code == 200
    assert "image_url" in response.json()
