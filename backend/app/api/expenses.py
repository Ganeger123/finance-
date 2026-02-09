from fastapi import APIRouter, Depends, Query, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.models.base import get_db
from app.models.expense import Expense
from app.models.user import User, UserRole
from app.schemas.expense import ExpenseCreate, ExpenseOut
from app.api.deps import require_approved_user, get_user_workspace, get_audit_logger
from app.services.email import send_expense_notification_email

router = APIRouter()

@router.get("/categories", response_model=List[str])
def get_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_approved_user),
    workspace_id: int = Depends(get_user_workspace)
):
    # Get distinct categories used in the workspace
    used_categories = db.query(Expense.category).filter(Expense.workspace_id == workspace_id).distinct().all()
    used_categories = [c[0] for c in used_categories if c[0]]
    
    # Also include the default enum categories
    from app.models.enums import ExpenseCategory
    default_categories = [c.value for c in ExpenseCategory]
    
    # Merge and remove duplicates
    all_categories = sorted(list(set(used_categories + default_categories)))
    return all_categories

@router.post("/", response_model=ExpenseOut)
def create_expense(
    expense_in: ExpenseCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_approved_user),
    workspace_id: int = Depends(get_user_workspace),
    audit_log = Depends(get_audit_logger)
):
    try:
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Creating expense for user {current_user.email}: {expense_in.dict()}")
        
        db_expense = Expense(
            **expense_in.dict(exclude={"date", "workspace_id"}),
            date=expense_in.date or datetime.utcnow(),
            creator_id=current_user.id,
            workspace_id=workspace_id
        )
        db.add(db_expense)
        db.commit()
        db.refresh(db_expense)
        
        logger.info(f"Expense created successfully with ID {db_expense.id}")
        
        # Audit Log
        audit_log(
            action="CREATE_EXPENSE",
            resource_type="expense",
            resource_id=str(db_expense.id),
            details={"amount": db_expense.amount, "category": db_expense.category}
        )
        
        # Notify admin
        expense_data = {
            "category": db_expense.category,
            "amount": db_expense.amount,
            "comment": db_expense.comment
        }
        background_tasks.add_task(
            send_expense_notification_email, 
            "hachllersocials@gmail.com", 
            expense_data, 
            current_user.full_name
        )
        
        return db_expense
    except Exception as e:
        import logging
        import traceback
        logger = logging.getLogger(__name__)
        logger.error(f"Error creating expense: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to create expense: {str(e)}")

@router.get("/", response_model=List[ExpenseOut])
def read_expenses(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_approved_user),
    workspace_id: Optional[int] = None,
    category: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    search: Optional[str] = None
):
    query = db.query(Expense)

    if workspace_id:
        query = query.filter(Expense.workspace_id == workspace_id)
    
    if category:
        query = query.filter(Expense.category == category)
    
    if start_date:
        query = query.filter(Expense.date >= start_date)
    
    if end_date:
        query = query.filter(Expense.date <= end_date)
        
    if search:
        # Simple search in comment or category name
        query = query.filter(
            (Expense.comment.ilike(f"%{search}%")) | 
            (Expense.category.ilike(f"%{search}%"))
        )
        
    return query.all()

@router.delete("/{expense_id}")
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_approved_user),
    audit_log = Depends(get_audit_logger)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can delete expenses")
    
    db_expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not db_expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    db.delete(db_expense)
    db.commit()
    
    # Audit Log
    audit_log(
        action="DELETE_EXPENSE",
        resource_type="expense",
        resource_id=str(expense_id),
        details={"amount": db_expense.amount, "category": db_expense.category}
    )

    return {"message": "Expense deleted successfully"}
