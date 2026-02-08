from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.enums import ExpenseCategory

class ExpenseBase(BaseModel):
    category: str
    amount: float = Field(..., lt=1000000, description="Amount in HTG, maximum 999,999")
    comment: Optional[str] = None
    date: Optional[datetime] = None
    workspace_id: Optional[int] = None

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseOut(ExpenseBase):
    id: int
    created_at: datetime
    creator_id: int

    class Config:
        from_attributes = True
