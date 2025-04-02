import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base, get_db
from main import app

# Set up test DB
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Override the get_db dependency
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

def test_login_activity_tracking(auth_headers):
    response = client.get("/login-activity", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
