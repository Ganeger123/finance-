from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from datetime import datetime
from ..database import Base

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String, nullable=True)
    amount = Column(Float, nullable=False)
    category = Column(String, nullable=True)
    type = Column(String, nullable=True) # "income" or "expense"
    date = Column(String, nullable=True)
    comment = Column(String, nullable=True)
    workspace_id = Column(Integer, nullable=True)
    student_count = Column(Integer, nullable=True)
    subtype = Column(String, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
