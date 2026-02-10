from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.models.base import Base
from datetime import datetime

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String, nullable=False)  # e.g., "LOGIN", "REGISTER", "CREATE_TRANSACTION"
    user_email = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    details = Column(Text, nullable=True)  # JSON or text details about the action
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Foreign key
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Relationships (using back_populates for both sides)
    user = relationship("User", back_populates="audit_logs")

