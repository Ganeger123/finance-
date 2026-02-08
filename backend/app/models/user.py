from sqlalchemy import Column, Integer, String, Enum, DateTime
from sqlalchemy.orm import relationship
from app.models.base import Base
import enum
from datetime import datetime

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    STANDARD = "STANDARD"

class UserStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.STANDARD)
    status = Column(Enum(UserStatus), default=UserStatus.PENDING)
    full_name = Column(String)
    last_seen = Column(DateTime, default=datetime.utcnow)
    token_version = Column(Integer, default=1)

    workspaces = relationship("Workspace", back_populates="owner")
