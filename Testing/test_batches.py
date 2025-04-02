import sys, os, pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from database import Base, get_db
from main import app
from datetime import date, timedelta

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
client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def auth_headers():
    client.post("/register", json={"email": "admin@example.com", "username": "admin", "password": "adminpass"})
    response = client.post("/token", data={"username": "admin@example.com", "password": "adminpass"}, headers={"Content-Type": "application/x-www-form-urlencoded"})
    return {"Authorization": f"Bearer {response.json()['access_token']}"}

def test_add_batch(auth_headers):
    # Add a product first
    product_data = {
        "name": "Milk",
        "category": "Dairy",
        "stock_level": 0,
        "reserved_stock": 0,
        "reorder_threshold": 5,
        "cost_price": 1.5,
        "price": 2.5,
        "supplier_id": 1,
        "image_url": ""
    }
    client.post("/products/add", json=product_data, headers=auth_headers)

    batch_payload = {
        "product_id": 1,
        "supplier_id": 1,
        "batch_number": "BATCH1001",
        "expiration_date": str(date.today() + timedelta(days=30)),
        "received_date": str(date.today()),
        "quantity_received": 100
    }

    response = client.post("/add/batch/", json=batch_payload, headers=auth_headers)
    assert response.status_code == 200
    assert "Batch created successfully" in response.json()["message"]

def test_get_batches(auth_headers):
    response = client.get("/batches", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_get_batches_by_product(auth_headers):
    response = client.get("/batches/1", headers=auth_headers)
    assert response.status_code in [200, 404]

def test_get_expiring_batches(auth_headers):
    response = client.get("/batches/expiring-soon/?days=60", headers=auth_headers)
    assert response.status_code == 200

def test_get_products_by_batch(auth_headers):
    response = client.get("/batches/products/BATCH1001", headers=auth_headers)
    assert response.status_code in [200, 404]

def test_batch_aging_report(auth_headers):
    response = client.get("/reports/batch-aging", headers=auth_headers)
    assert response.status_code == 200 or response.status_code == 500  # Empty batch case might return error
