import logging
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import and_, extract, func
from datetime import datetime, date
from app.models.base import get_db
from app.models.transaction import Transaction, TransactionType
from app.models.user import User
from app.models.audit import AuditLog
from app.api.deps import get_current_user, require_approved_user
from app.models.vendor import Vendor
import json

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/transactions", tags=["Transactions"])

class TransactionCreate(dict):
    title: str
    description: str = None
    amount: float
    category: str
    type: TransactionType
    date: date = None
    vendor_id: int = None

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_transaction(
    data: dict,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_approved_user)
):
    """Create a new transaction (income or expense)."""
    try:
        # Validate required fields
        if not all(k in data for k in ['title', 'amount', 'category', 'type']):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing required fields: title, amount, category, type"
            )
        
        # Validate amount
        try:
            amount = float(data['amount'])
            if amount <= 0:
                raise ValueError()
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Amount must be a positive number"
            )
        
        # Validate type
        if data['type'] not in [TransactionType.income.value, TransactionType.expense.value]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Type must be 'income' or 'expense'"
            )
        
        # Parse date or use current date
        trans_date = datetime.fromisoformat(data.get('date')).date() if data.get('date') else date.today()
        
        # Check vendor exists if provided
        vendor_id = data.get('vendor_id')
        if vendor_id:
            vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
            if not vendor:
                raise HTTPException(status_code=404, detail="Vendor not found")
        
        # Create transaction
        transaction = Transaction(
            title=data['title'],
            description=data.get('description'),
            amount=amount,
            category=data['category'],
            type=TransactionType[data['type']],
            date=trans_date,
            user_id=user.id,
            vendor_id=vendor_id
        )
        
        db.add(transaction)
        db.commit()
        db.refresh(transaction)
        
        # Log the action
        client_ip = request.client.host if request.client else "unknown"
        audit_log = AuditLog(
            action="CREATE_TRANSACTION",
            user_email=user.email,
            user_id=user.id,
            ip_address=client_ip,
            details=f"Created {data['type']} transaction: {data['title']} - {amount} HTG"
        )
        db.add(audit_log)
        db.commit()
        
        logger.info(f"Transaction created: {transaction.id} by {user.email}")
        
        return {
            "id": transaction.id,
            "title": transaction.title,
            "amount": transaction.amount,
            "category": transaction.category,
            "type": transaction.type.value,
            "date": transaction.date.isoformat(),
            "created_at": transaction.created_at.isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error creating transaction: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating transaction"
        )

@router.get("/")
def get_user_transactions(
    skip: int = 0,
    limit: int = 100,
    type_filter: str = None,
    category_filter: str = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_approved_user)
):
    """Get user's transactions with optional filters."""
    query = db.query(Transaction).filter(Transaction.user_id == user.id)
    
    if type_filter and type_filter in [TransactionType.income.value, TransactionType.expense.value]:
        query = query.filter(Transaction.type == TransactionType[type_filter])
    
    if category_filter:
        query = query.filter(Transaction.category == category_filter)
    
    total = query.count()
    transactions = query.order_by(Transaction.date.desc()).offset(skip).limit(limit).all()
    
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "transactions": [
            {
                "id": t.id,
                "title": t.title,
                "amount": t.amount,
                "category": t.category,
                "type": t.type.value,
                "date": t.date.isoformat(),
                "created_at": t.created_at.isoformat()
            }
            for t in transactions
        ]
    }

@router.get("/{transaction_id}")
def get_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_approved_user)
):
    """Get a specific transaction."""
    transaction = db.query(Transaction).filter(
        and_(
            Transaction.id == transaction_id,
            Transaction.user_id == user.id
        )
    ).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return {
        "id": transaction.id,
        "title": transaction.title,
        "description": transaction.description,
        "amount": transaction.amount,
        "category": transaction.category,
        "type": transaction.type.value,
        "date": transaction.date.isoformat(),
        "created_at": transaction.created_at.isoformat(),
        "updated_at": transaction.updated_at.isoformat()
    }

@router.put("/{transaction_id}")
def update_transaction(
    transaction_id: int,
    data: dict,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_approved_user)
):
    """Update a transaction."""
    transaction = db.query(Transaction).filter(
        and_(
            Transaction.id == transaction_id,
            Transaction.user_id == user.id
        )
    ).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Update fields
    if 'title' in data:
        transaction.title = data['title']
    if 'description' in data:
        transaction.description = data['description']
    if 'amount' in data:
        try:
            amount = float(data['amount'])
            if amount <= 0:
                raise ValueError()
            transaction.amount = amount
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="Invalid amount")
    if 'category' in data:
        transaction.category = data['category']
    if 'date' in data:
        transaction.date = datetime.fromisoformat(data['date']).date()
    
    transaction.updated_at = datetime.utcnow()
    db.commit()
    
    # Log the action
    client_ip = request.client.host if request.client else "unknown"
    audit_log = AuditLog(
        action="UPDATE_TRANSACTION",
        user_email=user.email,
        user_id=user.id,
        ip_address=client_ip,
        details=f"Updated transaction {transaction_id}"
    )
    db.add(audit_log)
    db.commit()
    
    return {"message": "Transaction updated successfully"}

@router.delete("/{transaction_id}")
def delete_transaction(
    transaction_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_approved_user)
):
    """Delete a transaction."""
    transaction = db.query(Transaction).filter(
        and_(
            Transaction.id == transaction_id,
            Transaction.user_id == user.id
        )
    ).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    db.delete(transaction)
    db.commit()
    
    # Log the action
    client_ip = request.client.host if request.client else "unknown"
    audit_log = AuditLog(
        action="DELETE_TRANSACTION",
        user_email=user.email,
        user_id=user.id,
        ip_address=client_ip,
        details=f"Deleted transaction {transaction_id}: {transaction.title}"
    )
    db.add(audit_log)
    db.commit()
    
    return {"message": "Transaction deleted successfully"}

@router.get("/stats/monthly-summary")
def get_monthly_summary(
    year: int = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_approved_user)
):
    """Get monthly income/expense summary."""
    if not year:
        year = datetime.now().year
    
    results = []
    for month in range(1, 13):
        income = db.query(func.sum(Transaction.amount)).filter(
            and_(
                Transaction.user_id == user.id,
                Transaction.type == TransactionType.income,
                extract("month", Transaction.date) == month,
                extract("year", Transaction.date) == year
            )
        ).scalar() or 0
        
        expense = db.query(func.sum(Transaction.amount)).filter(
            and_(
                Transaction.user_id == user.id,
                Transaction.type == TransactionType.expense,
                extract("month", Transaction.date) == month,
                extract("year", Transaction.date) == year
            )
        ).scalar() or 0
        
        profit = income - expense
        margin = (profit / income * 100) if income > 0 else 0
        
        results.append({
            "month": month,
            "income": income,
            "expense": expense,
            "profit": profit,
            "margin_percent": round(margin, 2)
        })
    
    return {
        "year": year,
        "monthly_data": results
    }

@router.get("/stats/summary")
def get_transaction_summary(
    db: Session = Depends(get_db),
    user: User = Depends(require_approved_user)
):
    """Get overall transaction summary."""
    income = db.query(func.sum(Transaction.amount)).filter(
        and_(
            Transaction.user_id == user.id,
            Transaction.type == TransactionType.income
        )
    ).scalar() or 0
    
    expense = db.query(func.sum(Transaction.amount)).filter(
        and_(
            Transaction.user_id == user.id,
            Transaction.type == TransactionType.expense
        )
    ).scalar() or 0
    
    profit = income - expense
    margin = (profit / income * 100) if income > 0 else 0
    
    return {
        "total_income": income,
        "total_expense": expense,
        "net_profit": profit,
        "margin_percent": round(margin, 2)
    }
