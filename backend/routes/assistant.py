from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..schemas import assistant as assistant_schema
from ..services import crud
from .auth import get_current_user
from ..models import user as user_model

router = APIRouter()

@router.post("/query", response_model=assistant_schema.AssistantResponse)
def query_assistant(
    query_in: assistant_schema.AssistantQuery, 
    db: Session = Depends(get_db), 
    current_user: user_model.User = Depends(get_current_user)
):
    """
    Rule-based assistant using real financial data.
    """
    q = query_in.query.lower()
    
    if "spent" in q or "expense" in q or "dépensé" in q:
        stats = crud.get_dashboard_stats(db, user_id=current_user.id)
        return {"response": f"You have spent a total of ${stats['expense']:.2f} this month."}
    
    elif "income" in q or "earned" in q or "gagné" in q:
        stats = crud.get_dashboard_stats(db, user_id=current_user.id)
        return {"response": f"Your total income for this period is ${stats['income']:.2f}."}
    
    elif "save" in q or "épargne" in q:
        savings = crud.get_total_savings(db, user_id=current_user.id)
        return {"response": f"You have saved ${savings:.2f} so far. Keep it up!"}
    
    elif "biggest" in q or "plus gros" in q:
        biggest = crud.get_biggest_expense(db, user_id=current_user.id)
        if biggest:
            return {"response": f"Your biggest expense was '{biggest.title}' for ${biggest.amount:.2f}."}
        return {"response": "I couldn't find any expenses in your history."}
        
    return {"response": "I'm not sure how to answer that yet. You can ask about your spending, income, or savings."}
