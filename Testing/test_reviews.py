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
from models import User, Product, Review
from auth import get_current_user
import io

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

@pytest.fixture
def auth_headers():
    client.post("/register", json={"email": "admin@example.com", "username": "admin", "password": "adminpass"})
    response = client.post(
        "/token",
        data={"username": "admin@example.com", "password": "adminpass"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    return {"Authorization": f"Bearer {response.json()['access_token']}"}

# Test retrieving approved reviews
def test_get_reviews(auth_headers):
    response = client.get("/reviews/", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

# Test retrieving all reviews
def test_get_all_reviews(auth_headers):
    response = client.get("/reviews/all", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

# Test creating a review
def test_create_review(auth_headers, db_session):
    review_data = {
        "rating": (None, "5"),  # Form fields must be tuples (filename, value)
        "review_text": (None, "Great product!"),
    }

    fake_image = io.BytesIO(b"fake_image_data")
    files = {"review_photo": ("test.jpg", fake_image, "image/jpeg")}  # Simulate file upload

    response = client.post(
        "/reviews/upload",
        files=files,
        headers=auth_headers,
        data=review_data,
    )
    assert response.status_code == 200
    assert "Great product!" in response.json()["review_text"]

# Test approving a review
def test_approve_review(auth_headers, db_session):
    review = Review(id=1, user_id=1, rating=4, review_text="Good product", approved=0, review_photo="/review_photos/default.jpg")
    db_session.add(review)
    db_session.commit()
    db_session.refresh(review)
    
    response = client.put(f"/reviews/{review.id}/approve", headers=auth_headers)
    assert response.status_code == 200
    assert "Review approved" in response.json()["message"]

# Test rejecting a review
def test_reject_review(auth_headers, db_session):
    review = Review(id=1, user_id=1, rating=3, review_text="Average product", approved=0, review_photo="/review_photos/default.jpg")
    db_session.add(review)
    db_session.commit()
    db_session.refresh(review)
    
    response = client.put(f"/reviews/{review.id}/reject", headers=auth_headers)
    assert response.status_code == 200
    assert "Review rejected" in response.json()["message"]
