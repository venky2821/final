from pydantic import BaseModel, EmailStr

class Token(BaseModel):
    access_token: str
    token_type: str

class UserBase(BaseModel):
    email: EmailStr
    username: str

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str

class User(BaseModel):
    id: int
    email: EmailStr
    username: str
    is_active: bool = True

    class Config:
        orm_mode = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ResetPassword(BaseModel):
    email: EmailStr

class ChangePassword(BaseModel):
    token: str
    new_password: str

class ProductCreate(BaseModel):
    name: str
    stock_level: int
    supplier_id: int
