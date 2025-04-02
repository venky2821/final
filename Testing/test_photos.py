import sys
import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from database import Base, get_db
from main import app
from models import User, Photo
from auth import get_current_user

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

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def auth_headers():
    client.post("/register", json={"email": "test@example.com", "username": "tester", "password": "testpass"})
    response = client.post(
        "/token",
        data={"username": "test@example.com", "password": "testpass"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    return {"Authorization": f"Bearer {response.json()['access_token']}"}

@pytest.fixture
def db_session() -> Session:
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()

def override_get_current_user():
    return User(id=1, username="tester", email="test@example.com", role_id=1)

app.dependency_overrides[get_current_user] = override_get_current_user
client = TestClient(app)

# Create test photo
@pytest.fixture
def create_test_photo(db_session):
    photo = Photo(url="/static/test.png", uploaded_by=1, category="test", approved=0)
    db_session.add(photo)
    db_session.commit()
    db_session.refresh(photo)
    return photo

# GET /photos
def test_get_photos(auth_headers, db_session):
    db_session.add(Photo(url="/static/approved.png", uploaded_by=1, category="approved", approved=1))
    db_session.commit()
    response = client.get("/photos", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

# GET /photos/all
def test_get_all_photos(auth_headers, db_session):
    db_session.add(Photo(url="/static/photo.png", uploaded_by=1, category="misc", approved=0))
    db_session.commit()
    response = client.get("/photos/all", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

# PUT /photos/{id}/approve
def test_approve_photo(auth_headers, create_test_photo):
    response = client.put(f"/photos/{create_test_photo.id}/approve", headers=auth_headers)
    assert response.status_code == 200
    assert "Photo approved" in response.json()["message"]

# PUT /photos/{id}/reject
def test_reject_photo(auth_headers, create_test_photo):
    response = client.put(f"/photos/{create_test_photo.id}/reject", headers=auth_headers)
    assert response.status_code == 200
    assert "Photo rejected" in response.json()["message"]

# GET /photos/categories
def test_get_photo_categories(auth_headers, db_session):
    db_session.add(Photo(url="/static/cat1.png", uploaded_by=1, category="banners", approved=1))
    db_session.add(Photo(url="/static/cat2.png", uploaded_by=1, category="profile", approved=1))
    db_session.commit()
    response = client.get("/photos/categories", headers=auth_headers)
    assert response.status_code == 200
    assert "banners" in response.json() or "profile" in response.json()
