from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..schemas import transaction as transaction_schema
from ..services import crud
from ..services.email import EmailService
from .auth import get_current_user
from ..models import user as user_model
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/expenses/", response_model=List[transaction_schema.TransactionResponse])
def read_expenses(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: user_model.User = Depends(get_current_user)):
    try:
        logger.debug(f"Fetching expenses for user {current_user.id}, skip={skip}, limit={limit}")
        transactions = crud.get_transactions(db, user_id=current_user.id, skip=skip, limit=limit, type="expense")
        logger.debug(f"Found {len(transactions) if transactions else 0} expenses")
        return transactions
    except Exception as e:
        logger.error(f"Error fetching expenses for user {current_user.id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch expenses: {str(e)}")

@router.post("/expenses/", response_model=transaction_schema.TransactionResponse)
def create_expense(
    expense: transaction_schema.TransactionCreate,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user)
):
    expense.type = "expense"
    transaction = crud.create_transaction(db=db, transaction=expense, user_id=current_user.id)
    
    # Send email notification
    user_name = current_user.name or current_user.email.split('@')[0]
    EmailService.send_transaction_email(
        user_email=current_user.email,
        user_name=user_name,
        transaction_type="expense",
        amount=expense.amount,
        category=expense.category or "Uncategorized",
        description=expense.comment or ""
    )
    
    # Log the transaction
    crud.create_system_log(
        db=db,
        user_id=current_user.id,
        action="expense_created",
        details=f"Created expense: {expense.title} - ${expense.amount}"
    )
    
    return transaction

@router.get("/income/", response_model=List[transaction_schema.TransactionResponse])
def read_incomes(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: user_model.User = Depends(get_current_user)):
    return crud.get_transactions(db, user_id=current_user.id, skip=skip, limit=limit, type="income")

@router.post("/income/", response_model=transaction_schema.TransactionResponse)
def create_income(
    income: transaction_schema.TransactionCreate,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user)
):
    income.type = "income"
    transaction = crud.create_transaction(db=db, transaction=income, user_id=current_user.id)
    
    # Send email notification
    user_name = current_user.name or current_user.email.split('@')[0]
    EmailService.send_transaction_email(
        user_email=current_user.email,
        user_name=user_name,
        transaction_type="income",
        amount=income.amount,
        category=income.category or "Uncategorized",
        description=income.comment or ""
    )
    
    # Log the transaction
    crud.create_system_log(
        db=db,
        user_id=current_user.id,
        action="income_created",
        details=f"Created income: {income.title} - ${income.amount}"
    )
    
    return transaction

@router.get("/dashboard/stats", response_model=transaction_schema.DashboardStats)
def read_dashboard_stats(db: Session = Depends(get_db), current_user: user_model.User = Depends(get_current_user)):
    return crud.get_dashboard_stats(db, user_id=current_user.id)

# Adding the /expenses/categories endpoint as requested by apiClient
@router.get("/expenses/categories")
def get_categories():
    return ["Alimentation", "Transport", "Logement", "Loisirs", "Santé", "Éducation", "Autre"]

# Adding /dashboard/summary aliased to stats to support apiClient
@router.get("/dashboard/summary", response_model=transaction_schema.DashboardStats)
def read_dashboard_summary(db: Session = Depends(get_db), current_user: user_model.User = Depends(get_current_user)):
    return crud.get_dashboard_stats(db, user_id=current_user.id)

@router.delete("/expenses/{transaction_id}", response_model=dict)
def delete_expense(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user),
    request: Request = None
):
    """
    Delete an expense. Only the owner can delete. 
    """
    from ..models import transaction as transaction_model
    transaction = db.query(transaction_model.Transaction).filter(
        transaction_model.Transaction.id == transaction_id
    ).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Ownership check - only owner or admin can delete
    if transaction.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this transaction")
    
    db.delete(transaction)
    db.commit()
    
    # Log the deletion
    crud.create_system_log(
        db=db,
        user_id=current_user.id,
        action="expense_deleted",
        details=f"Deleted expense: ID {transaction_id} - ${transaction.amount}",
        ip_address=request.client.host if request else None
    )
    
    return {"message": f"Expense {transaction_id} has been deleted"}

@router.delete("/income/{transaction_id}", response_model=dict)
def delete_income(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user),
    request: Request = None
):
    """
    Delete an income. Only the owner can delete.
    """
    from ..models import transaction as transaction_model
    transaction = db.query(transaction_model.Transaction).filter(
        transaction_model.Transaction.id == transaction_id
    ).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Ownership check - only owner or admin can delete
    if transaction.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this transaction")
    
    db.delete(transaction)
    db.commit()
    
    # Log the deletion
    crud.create_system_log(
        db=db,
        user_id=current_user.id,
        action="income_deleted",
        details=f"Deleted income: ID {transaction_id} - ${transaction.amount}",
        ip_address=request.client.host if request else None
    )
    
    return {"message": f"Income {transaction_id} has been deleted"}
