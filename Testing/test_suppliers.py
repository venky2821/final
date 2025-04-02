import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base, get_db
from main import app

# Setup test DB
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
    client.post("/register", json={
        "email": "admin@example.com",
        "username": "admin",
        "password": "adminpass"
    })
    response = client.post(
        "/token",
        data={"username": "admin@example.com", "password": "adminpass"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    return {"Authorization": f"Bearer {response.json()['access_token']}"}

def test_add_supplier(auth_headers):
    supplier = {
        "name": "Best Supplier Inc.",
        "contact_person": "Jane Doe",
        "phone": "1234567890",
        "email": "supplier@example.com",
        "address": "123 Supply Street"
    }
    response = client.post("/suppliers/add", json=supplier, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["message"] == "Supplier added successfully"

def test_get_suppliers(auth_headers):
    response = client.get("/suppliers", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
