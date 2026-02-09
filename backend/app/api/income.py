from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.models.base import get_db
from app.models.income import Income
from app.models.user import User
from app.schemas.income import IncomeCreate, IncomeOut
from app.api.deps import require_approved_user, get_user_workspace
from app.services.finance import FinanceService
from app.models.enums import IncomeType, IncomeSubtype

router = APIRouter()

@router.post("/", response_model=IncomeOut)
def create_income(
    income_in: IncomeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_approved_user),
    workspace_id: int = Depends(get_user_workspace)
):
    amount = income_in.amount
    
    # Auto-calculate amount for formations if student_count is provided
    if income_in.type in [IncomeType.FORMATION_CAMERA, IncomeType.FORMATION_ELECTRICITE] and income_in.student_count > 0:
        if income_in.subtype in [IncomeSubtype.INSCRIPTION, IncomeSubtype.PARTICIPATION]:
            amount = FinanceService.calculate_income_amount(
                income_in.type, income_in.subtype, income_in.student_count
            )
            
    db_income = Income(
        **income_in.dict(exclude={"date", "amount", "workspace_id"}),
        amount=amount,
        date=income_in.date or datetime.utcnow(),
        creator_id=current_user.id,
        workspace_id=workspace_id
    )
    db.add(db_income)
    db.commit()
    db.refresh(db_income)
    return db_income

@router.get("/", response_model=List[IncomeOut])
def read_incomes(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_approved_user),
    workspace_id: Optional[int] = None,
    income_type: Optional[IncomeType] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
):
    query = db.query(Income)

    if workspace_id:
        query = query.filter(Income.workspace_id == workspace_id)
    
    if income_type:
        query = query.filter(Income.type == income_type)
    
    if start_date:
        query = query.filter(Income.date >= start_date)
    
    if end_date:
        query = query.filter(Income.date <= end_date)
        
    return query.all()

@router.delete("/{income_id}")
def delete_income(
    income_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_approved_user)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can delete income records")
    
    db_income = db.query(Income).filter(Income.id == income_id).first()
    if not db_income:
        raise HTTPException(status_code=404, detail="Income record not found")
    
    db.delete(db_income)
    db.commit()
    return {"message": "Income record deleted successfully"}
