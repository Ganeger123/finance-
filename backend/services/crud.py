from sqlalchemy.orm import Session
from sqlalchemy import func
from ..models import user as user_model
from ..models import transaction as transaction_model
from ..schemas import auth as auth_schema
from ..schemas import transaction as transaction_schema
from .auth import get_password_hash

def get_user_by_email(db: Session, email: str):
    return db.query(user_model.User).filter(user_model.User.email == email).first()

def create_user(db: Session, user: auth_schema.UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = user_model.User(
        email=user.email,
        password=hashed_password,
        name=user.name,
        role="user",
        status="approved" # Defaulting to approved as per code logic in JS usually
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_transactions(db: Session, user_id: int, skip: int = 0, limit: int = 100, type: str = None):
    query = db.query(transaction_model.Transaction).filter(transaction_model.Transaction.user_id == user_id)
    if type:
        query = query.filter(transaction_model.Transaction.type == type)
    return query.offset(skip).limit(limit).all()

def create_transaction(db: Session, transaction: transaction_schema.TransactionCreate, user_id: int):
    db_transaction = transaction_model.Transaction(**transaction.dict(), user_id=user_id)
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

def get_dashboard_stats(db: Session, user_id: int):
    income = db.query(func.sum(transaction_model.Transaction.amount)).filter(
        transaction_model.Transaction.user_id == user_id,
        transaction_model.Transaction.type == 'income'
    ).scalar() or 0.0

    expense = db.query(func.sum(transaction_model.Transaction.amount)).filter(
        transaction_model.Transaction.user_id == user_id,
        transaction_model.Transaction.type == 'expense'
    ).scalar() or 0.0
    
    return {
        "income": income,
        "expense": expense,
        "profit": income - expense
    }
