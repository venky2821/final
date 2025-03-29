# Merchandise Inventory Management - Backend

This is the backend service for the Merchandise Inventory Management system built with FastAPI and SQLAlchemy.

## Structure

- [main.py](cci:7://file:///c:/Users/ravul/Documents/GitHub/MerchendiseInventoryManagement/Backend/main.py:0:0-0:0): Main application file containing API endpoints and core logic
- [models.py](cci:7://file:///c:/Users/ravul/Documents/GitHub/MerchendiseInventoryManagement/Backend/models.py:0:0-0:0): Database models and relationships
- `database.py`: Database connection and session management
- [data_loader.py](cci:7://file:///c:/Users/ravul/Documents/GitHub/MerchendiseInventoryManagement/Backend/data_loader.py:0:0-0:0): Initial data loading utilities

## Key Features

### Authentication
- User registration and login with JWT tokens
- Password reset functionality
- Email notifications for password reset

### Inventory Management
- Product CRUD operations
- Stock level tracking
- Low stock notifications
- Batch management
- Supplier management

### Review System
- Customer review submissions
- Rating system (1-5 stars)
- Review validation
- User-product relationship tracking

## API Endpoints

### Authentication
- `POST /token`: Login and get access token
- `POST /register`: Register new user
- `POST /reset-password`: Request password reset
- `POST /change-password`: Change password with token

### Products
- `GET /products`: List all products
- `GET /products/{name}`: Get specific product
- `POST /purchase`: Process product purchase

### Reviews
- `POST /reviews/`: Submit product review

## Database Models

- [User](cci:2://file:///c:/Users/ravul/Documents/GitHub/MerchendiseInventoryManagement/Backend/main.py:59:0-62:26): User account information
- [Product](cci:2://file:///c:/Users/ravul/Documents/GitHub/MerchendiseInventoryManagement/Backend/models.py:16:0-37:62): Product details and inventory
- [Supplier](cci:2://file:///c:/Users/ravul/Documents/GitHub/MerchendiseInventoryManagement/Backend/models.py:39:0-52:65): Supplier information
- [Batch](cci:2://file:///c:/Users/ravul/Documents/GitHub/MerchendiseInventoryManagement/Backend/models.py:54:0-68:63): Inventory batch tracking
- [Review](cci:2://file:///c:/Users/ravul/Documents/GitHub/MerchendiseInventoryManagement/Backend/models.py:70:0-83:57): Product reviews and ratings

## Setup and Configuration

1. Install dependencies:
```bash
pip install -r requirements.txt