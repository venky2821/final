
# 🛡️ OWASP Top 10 Security Implementation - FastAPI Project Report

This document explains how each relevant OWASP Top 10 risk is mitigated in the FastAPI project using practical code examples and explanations.

---

## 1. Broken Access Control

**What it means**: Prevent users from accessing or modifying data they don't own (e.g., reordering someone else's order).

**Example attack**: User tries to POST `/orders/123/reorder`, where order 123 belongs to another user.

**How we implement it (IDOR protection)**:
```python
@router.post("/orders/{order_id}/reorder")
def reorder(order_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.customer_name != current_user.username:
        raise HTTPException(status_code=403, detail="Access denied")

    if order.status != "completed":
        raise HTTPException(status_code=400, detail="Only completed orders can be reordered.")

    new_order = Order(
        customer_name=order.customer_name,
        status="pending",
        total_price=order.total_price
    )
    db.add(new_order)
    db.commit()
    db.refresh(new_order)
    return {"message": "Reorder created", "new_order_id": new_order.id}
```

✅ This prevents users from accessing orders they don't own.

**Additional protections**:
```python
@router.get("/orders/customer")
def get_customer_orders(
    db: Session = Depends(get_db), 
    current_user=Depends(get_current_user)
):
```

✅ Ensures that all protected endpoints enforce authentication.

```python
@router.post("/approve-purchase/{order_id}")
def approve_purchase(order_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Check if the user is an admin
    if current_user.role_id != 1:
        raise HTTPException(status_code=403, detail="Not authorized")
    ...
```

✅ Only admins can access certain endpoints, enforcing role-based access control (RBAC).

---

## 2. Cryptographic Failures

**What it means**: Passwords, tokens, or secrets must be protected using strong cryptography.

**Example attack**: Storing passwords in plain text, or leaking secrets in logs.

**How we implement it**:
- Passwords are hashed using `bcrypt` via `passlib`:
```python
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
```

---

## 3. Injection

**What it means**: Protect the server from SQL/command injection and file upload abuse.

**Example attack**: Uploading a `.php` file disguised as an image, or SQL via input.

**How we implement it**:
- SQLAlchemy ORM prevents raw query injection:
```python
order = db.query(Order).filter(Order.id == order_id).first()
```

✅ No raw SQL queries used in endpoints.

- Uploaded files are validated and sanitized:
```python
def validate_image(file: UploadFile):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ['.jpg', '.jpeg', '.png']:
        raise HTTPException(status_code=400, detail="Invalid file format.")
    file.file.seek(0, 2)
    size = file.file.tell()
    if size > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large")
    file.file.seek(0)
```

✅ Ensures only safe image formats and size are accepted.

- Rejecting dangerous content types:
```python
import magic

def validate_content_type(file: UploadFile):
    mime = magic.from_buffer(file.file.read(2048), mime=True)
    file.file.seek(0)
    if not mime.startswith("image/"):
        raise HTTPException(status_code=400, detail="Unsupported content type")
```

✅ Blocks potentially dangerous content types (e.g., HTML, JS).

---

## 5. Security Misconfiguration

**What it means**: Default or insecure settings can expose your app (e.g., debug=True, stack traces in prod).

**How we implement it**:
- `debug=False` in production:
```python
app = FastAPI(debug=False)
```

✅ Prevents accidental exposure of stack traces.

---

## 6. Vulnerable and Outdated Components

**What it means**: Using outdated libraries can introduce known vulnerabilities.

**How we implement it**:
- We use **Snyk** to scan and monitor dependencies.
```bash
snyk test
snyk monitor
```

✅ Snyk alerts us to unsafe packages and suggests upgrades.

---

## 7. Identification and Authentication Failures

**What it means**: This refers to weaknesses in authentication mechanisms that allow attackers to:
- Bypass login
- Use brute-force attacks to guess credentials
- Reuse stolen credentials
- Abuse poorly configured token-based auth

---

**Example attack**: A bot sends thousands of POST requests to `/token` with different password guesses to brute-force a user's account.

---

**How we implement it**:

### ✅ a. Secure Authentication with OAuth2 + JWT

We use FastAPI's built-in `OAuth2PasswordBearer` dependency, which allows secure token-based authentication with hashed passwords and bearer tokens.

```python
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
```

✅ Ensures that only users with valid tokens can access protected routes.

---

### ✅ b. Login Rate Limiting to Prevent Brute Force

We use `slowapi` to throttle login attempts:

```python
@limiter.limit("5/minute")  # ⛔ max 5 attempts/minute per IP
@app.post("/token")
def login(...): ...
```

If a user exceeds this limit, they receive a `429 Too Many Requests` response.

✅ This protects login endpoints from brute-force and credential stuffing attacks.

---

### ✅ c. Password Reuse Protection 

We track `password_history` and reject reuse of recent passwords to enhance account security.

---

Together, these controls offer a secure and scalable authentication layer that mitigates OWASP A07 risks.

---
