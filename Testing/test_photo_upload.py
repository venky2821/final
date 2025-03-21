import sys
import os
import io
from PIL import Image
import pytest
from fastapi import UploadFile
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import shutil

# Add the Backend directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'Backend'))

from test_app import test_app
from database import get_db
from models import User, Photo

@pytest.fixture
def auth_headers(client: TestClient, db_session: Session):
    """Fixture to get authentication headers"""
    # Register and login a test user
    client.post(
        "/register",
        json={"email": "phototest@example.com", "username": "phototest", "password": "testpass"}
    )
    response = client.post(
        "/token",
        data={"username": "phototest@example.com", "password": "testpass"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def create_test_image(format: str = 'PNG', size: tuple = (100, 100), color: tuple = (255, 0, 0)) -> bytes:
    """Helper function to create test images"""
    img = Image.new('RGB', size, color)
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format=format)
    img_byte_arr.seek(0)
    return img_byte_arr.getvalue()

def create_large_image() -> bytes:
    """Create an image larger than 5MB"""
    return create_test_image(size=(3000, 3000), color=(0, 255, 0))

def test_upload_valid_png(client, auth_headers):
    """Test uploading a valid PNG image"""
    image_bytes = create_test_image(format='PNG')
    files = {
        'uploaded_file': ('test.png', image_bytes, 'image/png')
    }
    data = {'category': 'test'}
    
    response = client.post(
        "/photos/upload",
        files=files,
        data=data,
        headers=auth_headers
    )
    
    assert response.status_code == 200
    assert "photo_id" in response.json()
    assert response.json()["message"] == "Photo uploaded successfully"

def test_upload_valid_jpg(client, auth_headers):
    """Test uploading a valid JPG image"""
    image_bytes = create_test_image(format='JPEG')
    files = {
        'uploaded_file': ('test.jpg', image_bytes, 'image/jpeg')
    }
    data = {'category': 'test'}
    
    response = client.post(
        "/photos/upload",
        files=files,
        data=data,
        headers=auth_headers
    )
    
    assert response.status_code == 200
    assert "photo_id" in response.json()

def test_upload_invalid_format(client, auth_headers):
    """Test uploading an invalid file format"""
    files = {
        'uploaded_file': ('test.txt', b'not an image', 'text/plain')
    }
    data = {'category': 'test'}
    
    response = client.post(
        "/photos/upload",
        files=files,
        data=data,
        headers=auth_headers
    )
    
    assert response.status_code == 400
    assert "Invalid file format" in response.json()["detail"]

def test_upload_large_image(client, auth_headers):
    """Test uploading an image larger than 5MB"""
    image_bytes = create_large_image()
    files = {
        'uploaded_file': ('large.png', image_bytes, 'image/png')
    }
    data = {'category': 'test'}
    
    response = client.post(
        "/photos/upload",
        files=files,
        data=data,
        headers=auth_headers
    )
    
    assert response.status_code == 400
    assert "File size too large" in response.json()["detail"]

def test_upload_without_auth(client):
    """Test uploading without authentication"""
    image_bytes = create_test_image()
    files = {
        'uploaded_file': ('test.png', image_bytes, 'image/png')
    }
    data = {'category': 'test'}
    
    response = client.post(
        "/photos/upload",
        files=files,
        data=data
    )
    
    assert response.status_code == 401
    assert "Not authenticated" in response.json()["detail"]

def test_upload_with_category(client, auth_headers):
    """Test uploading with different categories"""
    categories = ['profile', 'product', 'banner']
    
    for category in categories:
        image_bytes = create_test_image()
        files = {
            'uploaded_file': ('test.png', image_bytes, 'image/png')
        }
        data = {'category': category}
        
        response = client.post(
            "/photos/upload",
            files=files,
            data=data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        assert "photo_id" in response.json()

def test_upload_multiple_photos(client, auth_headers):
    """Test uploading multiple photos"""
    for i in range(3):
        image_bytes = create_test_image()
        files = {
            'uploaded_file': (f'test_{i}.png', image_bytes, 'image/png')
        }
        data = {'category': 'test'}
        
        response = client.post(
            "/photos/upload",
            files=files,
            data=data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        assert "photo_id" in response.json()

def test_photo_persistence(client, auth_headers, db_session):
    """Test that uploaded photos are properly stored in the database"""
    image_bytes = create_test_image()
    files = {
        'uploaded_file': ('test.png', image_bytes, 'image/png')
    }
    data = {'category': 'test'}
    
    response = client.post(
        "/photos/upload",
        files=files,
        data=data,
        headers=auth_headers
    )
    
    photo_id = response.json()["photo_id"]
    
    # Check database
    db_photo = db_session.query(Photo).filter(Photo.id == photo_id).first()
    assert db_photo is not None
    assert db_photo.category == 'test'
    assert db_photo.approved == 0  # Should be pending approval by default 