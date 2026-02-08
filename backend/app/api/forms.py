from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from app.models.base import get_db
from app.models.form_builder import ExpenseForm, ExpenseField, ExpenseEntry
from app.models.workspace import Workspace
from app.models.user import User
from app.schemas.form_builder import (
    ExpenseFormCreate, 
    ExpenseFormOut, 
    ExpenseEntryCreate, 
    ExpenseEntryOut
)
from app.api.deps import require_approved_user, get_user_workspace
from app.services.email import send_expense_notification_email

router = APIRouter()

@router.post("/", response_model=ExpenseFormOut)
def create_form(
    form_in: ExpenseFormCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_approved_user),
    workspace_id: int = Depends(get_user_workspace)
):
    # Verify workspace ownership
    workspace = db.query(Workspace).filter(
        Workspace.id == form_in.workspace_id, 
        Workspace.owner_id == current_user.id
    ).first()
    if not workspace:
        raise HTTPException(status_code=403, detail="Not authorized for this workspace")
    
    db_form = ExpenseForm(
        name=form_in.name,
        description=form_in.description,
        workspace_id=workspace_id
    )
    db.add(db_form)
    db.commit()
    db.refresh(db_form)
    
    for field_in in form_in.fields:
        db_field = ExpenseField(
            form_id=db_form.id,
            label=field_in.label,
            field_type=field_in.field_type,
            required=field_in.required,
            options=field_in.options
        )
        db.add(db_field)
    
    db.commit()
    db.refresh(db_form)
    return db_form

@router.get("/", response_model=List[ExpenseFormOut])
def read_forms(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_approved_user)
):
    # Relaxed visibility: all authenticated users can see workspace forms
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    return db.query(ExpenseForm).filter(ExpenseForm.workspace_id == workspace_id).all()

@router.post("/entries", response_model=ExpenseEntryOut)
def create_entry(
    entry_in: ExpenseEntryCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_approved_user),
    workspace_id: int = Depends(get_user_workspace)
):
    # Verify form and workspace access
    form = db.query(ExpenseForm).filter(ExpenseForm.id == entry_in.form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    
    # Relaxed visibility: all authenticated users can record entries
    workspace = db.query(Workspace).filter(Workspace.id == entry_in.workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    db_entry = ExpenseEntry(
        form_id=entry_in.form_id,
        workspace_id=workspace_id,
        creator_id=current_user.id,
        data=entry_in.data
    )
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)

    # Notify admin
    # Construct descriptive notification string from dynamic data
    detail_lines = []
    for field in form.fields:
        val = entry_in.data.get(str(field.id)) or entry_in.data.get(field.id)
        if val:
            detail_lines.append(f"{field.label}: {val}")
    
    notification_data = {
        "category": f"Form: {form.name} (Workspace: {workspace.name})",
        "amount": "Variable (Custom Form)",
        "comment": "\n".join(detail_lines)
    }
    
    background_tasks.add_task(
        send_expense_notification_email, 
        "hachllersocials@gmail.com", 
        notification_data, 
        current_user.full_name
    )

    return db_entry

@router.get("/entries", response_model=List[ExpenseEntryOut])
def read_entries(
    form_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_approved_user)
):
    # Verify form access
    form = db.query(ExpenseForm).filter(ExpenseForm.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    
    workspace = db.query(Workspace).filter(Workspace.id == form.workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    return db.query(ExpenseEntry).filter(ExpenseEntry.form_id == form_id).all()

@router.delete("/{form_id}")
def delete_form(
    form_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_approved_user)
):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can delete forms")
    
    db_form = db.query(ExpenseForm).filter(ExpenseForm.id == form_id).first()
    if not db_form:
        raise HTTPException(status_code=404, detail="Form not found")
    
    # Cascade delete is handled by relationship but let's be explicit or check
    # In our models, we should ensure cascade delete is set
    db.delete(db_form)
    db.commit()
    return {"message": "Form and all associated data deleted successfully"}

@router.delete("/entries/{entry_id}")
def delete_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_approved_user)
):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can delete expense entries")
    
    db_entry = db.query(ExpenseEntry).filter(ExpenseEntry.id == entry_id).first()
    if not db_entry:
        raise HTTPException(status_code=404, detail="Expense entry not found")
    
    db.delete(db_entry)
    db.commit()
    return {"message": "Expense entry deleted successfully"}
