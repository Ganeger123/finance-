from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from app.models.user import UserRole, UserStatus

from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: UserRole = UserRole.STANDARD
    status: UserStatus = UserStatus.PENDING

    @field_validator("role", mode="before")
    @classmethod
    def validate_role(cls, v):
        if isinstance(v, str):
            return v.upper()
        return v

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    status: Optional[UserStatus] = None

class UserPasswordReset(BaseModel):
    new_password: str

class UserOut(UserBase):
    id: int
    last_seen: Optional[datetime] = None

    class Config:
        from_attributes = True
