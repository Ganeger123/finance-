from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base

class ExpenseForm(Base):
    __tablename__ = "expense_forms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    workspace = relationship("Workspace")
    fields = relationship("ExpenseField", back_populates="form", cascade="all, delete-orphan")
    entries = relationship("ExpenseEntry", back_populates="form")

class ExpenseField(Base):
    __tablename__ = "expense_fields"

    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, ForeignKey("expense_forms.id"))
    label = Column(String, nullable=False)
    field_type = Column(String, nullable=False) # text, number, date, select
    required = Column(Boolean, default=False)
    options = Column(JSON, nullable=True) # For select fields: ["opt1", "opt2"]

    form = relationship("ExpenseForm", back_populates="fields")

class ExpenseEntry(Base):
    __tablename__ = "expense_entries"

    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, ForeignKey("expense_forms.id"))
    workspace_id = Column(Integer, ForeignKey("workspaces.id"))
    creator_id = Column(Integer, ForeignKey("users.id"))
    data = Column(JSON, nullable=False) # {"field_id": value}
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    form = relationship("ExpenseForm", back_populates="entries")
    workspace = relationship("Workspace")
    creator = relationship("User")
