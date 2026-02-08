from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base
from app.models.enums import IncomeType, IncomeSubtype

class Income(Base):
    __tablename__ = "incomes"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(Enum(IncomeType), nullable=False)
    subtype = Column(Enum(IncomeSubtype), nullable=True) # Inscription, Participation, or Custom
    amount = Column(Float, nullable=False) # HTG (calculated or manual)
    student_count = Column(Integer, default=0)
    date = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    creator_id = Column(Integer, ForeignKey("users.id"))
    workspace_id = Column(Integer, ForeignKey("workspaces.id"))

    workspace = relationship("Workspace", back_populates="incomes")
