from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime

class ExpenseFieldBase(BaseModel):
    label: str
    field_type: str # text, number, date, select
    required: bool = False
    options: Optional[List[str]] = None

class ExpenseFieldCreate(ExpenseFieldBase):
    pass

class ExpenseFieldOut(ExpenseFieldBase):
    id: int
    form_id: int

    class Config:
        from_attributes = True

class ExpenseFormBase(BaseModel):
    name: str
    description: Optional[str] = None

class ExpenseFormCreate(ExpenseFormBase):
    workspace_id: int
    fields: List[ExpenseFieldCreate]

class ExpenseFormOut(ExpenseFormBase):
    id: int
    workspace_id: int
    created_at: datetime
    fields: List[ExpenseFieldOut]

    class Config:
        from_attributes = True

class ExpenseEntryBase(BaseModel):
    form_id: int
    workspace_id: int
    data: dict # {"field_id": value}

class ExpenseEntryCreate(ExpenseEntryBase):
    pass

class ExpenseEntryOut(ExpenseEntryBase):
    id: int
    creator_id: int
    created_at: datetime

    class Config:
        from_attributes = True
