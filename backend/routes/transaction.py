from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..schemas import transaction as transaction_schema
from ..services import crud
from .auth import get_current_user
from ..models import user as user_model

router = APIRouter()

@router.get("/expenses/", response_model=List[transaction_schema.TransactionResponse])
def read_expenses(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: user_model.User = Depends(get_current_user)):
    return crud.get_transactions(db, user_id=current_user.id, skip=skip, limit=limit, type="expense")

@router.post("/expenses/", response_model=transaction_schema.TransactionResponse)
def create_expense(expense: transaction_schema.TransactionCreate, db: Session = Depends(get_db), current_user: user_model.User = Depends(get_current_user)):
    expense.type = "expense"
    return crud.create_transaction(db=db, transaction=expense, user_id=current_user.id)

@router.get("/income/", response_model=List[transaction_schema.TransactionResponse])
def read_incomes(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: user_model.User = Depends(get_current_user)):
    return crud.get_transactions(db, user_id=current_user.id, skip=skip, limit=limit, type="income")

@router.post("/income/", response_model=transaction_schema.TransactionResponse)
def create_income(income: transaction_schema.TransactionCreate, db: Session = Depends(get_db), current_user: user_model.User = Depends(get_current_user)):
    income.type = "income"
    return crud.create_transaction(db=db, transaction=income, user_id=current_user.id)

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
