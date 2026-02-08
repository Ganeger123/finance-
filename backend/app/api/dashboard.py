from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.models.base import get_db
from app.api.deps import get_current_active_admin
from app.services.finance import FinanceService

router = APIRouter()

@router.get("/summary")
def get_finance_summary(
    year: int = None,
    db: Session = Depends(get_db),
    admin: bool = Depends(get_current_active_admin)
):
    """
    Get total income, total expenses, net result and financial observation.
    Only accessible by Admin.
    """
    if year is None:
        from datetime import datetime
        year = datetime.now().year
        
    summary = FinanceService.get_dashboard_summary(db)
    monthly_stats = FinanceService.get_monthly_stats(db, year)
    summary["monthly_stats"] = monthly_stats
    return summary

@router.get("/commissions")
def get_commissions_summary(
    db: Session = Depends(get_db),
    admin: bool = Depends(get_current_active_admin)
):
    """
    Placeholder/Summary for vendor commissions logic.
    """
    return {"message": "Commission logic implemented in service layer"}
