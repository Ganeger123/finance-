from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.enums import IncomeType, IncomeSubtype

class IncomeBase(BaseModel):
    type: IncomeType
    subtype: Optional[IncomeSubtype] = None
    amount: float # Calculated if formation, manual if platform
    student_count: int = 0
    date: Optional[datetime] = None
    workspace_id: Optional[int] = None

class IncomeCreate(IncomeBase):
    pass

class IncomeOut(IncomeBase):
    id: int
    created_at: datetime
    creator_id: int

    class Config:
        from_attributes = True

class IncomeOut(IncomeBase):
    id: int
    created_at: datetime
    creator_id: int

    class Config:
        from_attributes = True
