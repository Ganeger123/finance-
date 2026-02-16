from pydantic import BaseModel, EmailStr
from typing import Optional

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    name: Optional[str] = None
    password: str

class UserLogin(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    name: Optional[str] = None
    role: str
    status: str
    photo_url: Optional[str] = None

    class Config:
        from_attributes = True

class UserStatusUpdate(BaseModel):
    status: str # approved, rejected, pending

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    id: Optional[int] = None
    role: Optional[str] = None
