import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base, get_db
from fastapi.testclient import TestClient
from test_app import test_app
import os
import shutil

# Test database URL - use in-memory SQLite for testing
TEST_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture(scope="session")
def engine():
    return create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})

@pytest.fixture(scope="session")
def tables(engine):
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)

@pytest.fixture
def db_session(engine, tables):
    """Creates a new database session for a test."""
    connection = engine.connect()
    transaction = connection.begin()
    session = sessionmaker(bind=connection)()
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def override_get_db(db_session):
    """Override the get_db dependency for testing."""
    def _override_get_db():
        try:
            yield db_session
        finally:
            pass
    return _override_get_db

@pytest.fixture
def client(override_get_db):
    """Test client fixture with overridden database dependency."""
    app = test_app
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture(autouse=True)
def cleanup_files():
    """Clean up any test files after tests"""
    yield
    # Clean up test photos
    if os.path.exists("photos"):
        shutil.rmtree("photos") 