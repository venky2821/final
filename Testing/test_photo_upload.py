import os
import io
import pytest
from PIL import Image
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from database import Base, get_db
from models import User, Photo
from main import app

# Setup test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Dependency override
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
def db_session():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()

@pytest.fixture
def auth_headers():
    client.post("/register", json={
        "email": "phototest@example.com",
        "username": "phototest",
        "password": "testpass"
    })
    response = client.post(
        "/token",
        data={"username": "phototest@example.com", "password": "testpass"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    return {"Authorization": f"Bearer {response.json()['access_token']}"}

def create_test_image(format: str = 'PNG', size: tuple = (100, 100), color: tuple = (255, 0, 0)) -> bytes:
    img = Image.new('RGB', size, color)
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format=format)
    img_byte_arr.seek(0)
    return img_byte_arr.getvalue()

def create_large_image() -> bytes:
    return create_test_image(size=(3000, 3000), color=(0, 255, 0))

def test_upload_valid_png(auth_headers):
    image_bytes = create_test_image('PNG')
    files = {'uploaded_file': ('test.png', image_bytes, 'image/png')}
    data = {'category': 'test'}

    response = client.post("/photos/upload", files=files, data=data, headers=auth_headers)
    assert response.status_code == 200
    assert "photo_id" in response.json()

def test_upload_without_auth():
    image_bytes = create_test_image()
    files = {'uploaded_file': ('test.png', image_bytes, 'image/png')}
    data = {'category': 'test'}

    response = client.post("/photos/upload", files=files, data=data)
    assert response.status_code == 401
    assert "Not authenticated" in response.json()["detail"]

def test_upload_with_category(auth_headers):
    categories = ['profile', 'product', 'banner']
    for category in categories:
        image_bytes = create_test_image()
        files = {'uploaded_file': ('test.png', image_bytes, 'image/png')}
        data = {'category': category}

        response = client.post("/photos/upload", files=files, data=data, headers=auth_headers)
        assert response.status_code == 200
        assert "photo_id" in response.json()

def test_upload_multiple_photos(auth_headers):
    for i in range(3):
        image_bytes = create_test_image()
        files = {'uploaded_file': (f'test_{i}.png', image_bytes, 'image/png')}
        data = {'category': 'test'}

        response = client.post("/photos/upload", files=files, data=data, headers=auth_headers)
        assert response.status_code == 200
        assert "photo_id" in response.json()

def test_photo_persistence(auth_headers, db_session):
    image_bytes = create_test_image()
    files = {'uploaded_file': ('test.png', image_bytes, 'image/png')}
    data = {'category': 'test'}

    response = client.post("/photos/upload", files=files, data=data, headers=auth_headers)
    photo_id = response.json()["photo_id"]

    db_photo = db_session.query(Photo).filter(Photo.id == photo_id).first()
    assert db_photo is not None
    assert db_photo.category == 'test'
    assert db_photo.approved == 0  # pending
