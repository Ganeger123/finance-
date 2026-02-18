from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class TransactionBase(BaseModel):
    title: Optional[str] = None
    amount: float
    category: Optional[str] = None
    type: Optional[str] = None
    date: Optional[str] = None
    comment: Optional[str] = None
    workspace_id: Optional[int] = None
    student_count: Optional[int] = None
    subtype: Optional[str] = None

class TransactionCreate(TransactionBase):
    pass

class TransactionResponse(TransactionBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class DashboardStats(BaseModel):
    income: float
    expense: float
    profit: float
