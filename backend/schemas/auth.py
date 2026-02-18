from pydantic import BaseModel, EmailStr, model_validator
from typing import Optional, List

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
    full_name: Optional[str] = None  # alias for name, used by frontend
    role: str
    status: str
    photo_url: Optional[str] = None

    @model_validator(mode='after')
    def set_full_name(self) -> 'UserResponse':
        # Ensure full_name mirrors name so frontend gets the right field
        if self.full_name is None and self.name is not None:
            self.full_name = self.name
        elif self.name is None and self.full_name is not None:
            self.name = self.full_name
        return self

    class Config:
        from_attributes = True


class UserStatusUpdate(BaseModel):
    status: str # approved, rejected, pending

class UsersListResponse(BaseModel):
    users: List[UserResponse]

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    id: Optional[int] = None
    role: Optional[str] = None
