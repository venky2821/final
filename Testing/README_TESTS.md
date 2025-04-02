# 🧪 Automated Test Suite Documentation

This project includes comprehensive automated test coverage for all major API endpoints in the backend. The test suite uses **Pytest** with **FastAPI's TestClient** and is structured to mirror the app's modular routing (e.g. orders, products, reviews, etc.).

---

## 🧱 Setup

```bash
pip install -r requirements.txt
pytest
```

---

## ✅ Test Modules & Coverage

### 1. `test_orders.py`
Covers:
- `/reserve`: Reserves items in a new order.
- `/approve-purchase/{order_id}`: Approves a reserved order.
- `/reject-purchase/{order_id}`: Rejects an order with a reason.
- `/orders/reserved`: Admin fetches all reserved orders.
- `/orders/customer`: Customers view their own orders.
- `/orders/{order_id}/cancel`: Cancels a reserved order.
- `/orders/{order_id}/reorder`: Reorders a completed order.

---

### 2. `test_reviews.py`
Covers:
- `/reviews/`: Gets approved reviews.
- `/reviews/all`: Admin access to all reviews.
- `/reviews/upload`: Creates a review with an image.
- `/reviews/{id}/approve`: Admin approves a review.
- `/reviews/{id}/reject`: Admin rejects a review.

---

### 3. `test_photo_upload.py`
Covers:
- Ensures uploads are validated and saved properly.
- Verifies storage in DB.
- Tests multiple categories and multi-upload scenarios.
- Includes an unauthenticated case.

---

### 4. `test_login.py`
Covers:
- `/register`: Registers a new user.
- `/token`: Logs in with valid/invalid credentials.
- `/reset-password`: Requests password reset.
- `/change-password`: Tries to change password with invalid token.

---

### 5. `test_photos.py`
Covers:
- `/photos`: Gets approved photos (optionally filtered by category).
- `/photos/all`: Admin view of all uploaded photos.
- `/photos/{id}/approve`: Approves a photo.
- `/photos/{id}/reject`: Rejects a photo.
- `/photos/categories`: Gets distinct photo categories.

---

### 6. `test_products.py`
Covers:
- `/products/add`: Adds a new product.
- `/products`: Gets all products.
- `/products/{product_name}`: Gets a single product by name.
- `/products/upload-image`: Uploads an image and links to product.

---

### 7. `test_batches.py`
Covers:
- `/add/batch/`: Adds a new product batch.
- `/batches`: Gets all batches (with filters).
- `/batches/{product_id}`: Gets all batches for a product.
- `/batches/expiring-soon`: Batches nearing expiry.
- `/batches/products/{batch_number}`: Gets products by batch number.
- `/reports/batch-aging`: Generates an aging report of batches.

---

### 8. `test_suppliers.py`
Covers:
- `/suppliers`: Gets all suppliers.
- `/suppliers/add`: Adds a new supplier.

---

### 9. `test_login_activity.py`
Covers:
- `/login-activity`: Returns historical login info for current user.

---

## 🛡 Auth Handling

Most test modules use fixtures to:
- Register a test user
- Log in and acquire an auth token
- Inject `Authorization: Bearer <token>` into requests

---

## 📂 Structure Recommendation

Place these in a `tests/` directory:
```
tests/
├── test_orders.py
├── test_reviews.py
├── test_photo_upload.py
├── test_login.py
├── test_photos.py
├── test_products.py
├── test_batches.py
├── test_suppliers.py
├── test_login_activity.py
```

---