import sys
import os

# Add the Backend directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'Backend'))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base, get_db
from test_app import test_app as app

# Create a new database for testing
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
    # Create tables
    Base.metadata.create_all(bind=engine)
    yield
    # Drop tables after test
    Base.metadata.drop_all(bind=engine)

client = TestClient(app)

# Test login functionality

def test_login_success():
    # First, register a user
    response = client.post(
        "/register",
        json={"email": "testuser@example.com", "username": "testuser", "password": "testpassword"}
    )
    assert response.status_code == 200

    # Then, login with the registered user
    response = client.post(
        "/token",
        data={"username": "testuser@example.com", "password": "testpassword"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_login_failure():
    # Attempt to login with incorrect credentials
    response = client.post(
        "/token",
        data={"username": "wronguser@example.com", "password": "wrongpassword"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"

# Test register functionality

def test_register_success():
    response = client.post(
        "/register",
        json={"email": "newuser@example.com", "username": "newuser", "password": "newpassword"}
    )
    assert response.status_code == 200
    assert response.json()["email"] == "newuser@example.com"


def test_register_failure_existing_email():
    # First register a user
    response = client.post(
        "/register",
        json={"email": "testuser1@example.com", "username": "testuser1", "password": "testpassword"}
    )
    assert response.status_code == 200

    # Attempt to register with the same email
    response = client.post(
        "/register",
        json={"email": "testuser1@example.com", "username": "anotheruser", "password": "anotherpassword"}
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Email already registered"


def test_change_password_failure_invalid_token():
    # Attempt to change password with an invalid token
    response = client.post(
        "/change-password",
        json={"token": "invalidtoken", "new_password": "irrelevant"}
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid or expired reset token"
