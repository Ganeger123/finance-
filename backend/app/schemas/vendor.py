from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class VendorBase(BaseModel):
    name: str
    description: Optional[str] = None
    commission_rate: Optional[float] = 0.0

class VendorCreate(VendorBase):
    pass

class VendorUpdate(VendorBase):
    name: Optional[str] = None

class Vendor(VendorBase):
    id: int
    total_commission_paid: float
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
