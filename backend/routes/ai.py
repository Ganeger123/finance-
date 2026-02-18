from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, List
from ..database import get_db
from .auth import get_current_user
from ..models import user as user_model, transaction as transaction_model
from ..services.ai_parser import AITransactionParser
from ..services.recurring_suggester import RecurringExpenseSuggester
from sqlalchemy.orm import Session

router = APIRouter()

class TransactionParseRequest(BaseModel):
    """Request model for AI transaction parsing"""
    text: str

class TransactionParseResponse(BaseModel):
    """Response model for AI transaction parsing"""
    type: str  # 'expense' or 'income'
    amount: Optional[float]
    category: str
    date: str  # YYYY-MM-DD format
    note: str
    confidence: float

class ParseSuggestionsResponse(BaseModel):
    """Response model for parser suggestions"""
    examples: list
    supported_categories: list
    date_formats: list
    currency_formats: list

class RecurringSuggestion(BaseModel):
    """Response model for recurring expense suggestions"""
    category: str
    amount: float
    frequency: str
    message: str
    confidence: float
    occurrences: int

@router.post("/parse-transaction", response_model=TransactionParseResponse)
def parse_transaction(
    request: TransactionParseRequest,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user)
):
    """
    AI-powered transaction parser
    
    Parses natural language input to extract transaction details.
    
    Examples:
    - "I paid $45 for internet yesterday"
    - "Spent 50 dollars on lunch today"
    - "Earned $200 from freelance work"
    - "Coffee at Starbucks for $5"
    - "Received payment of $1,500 last week"
    - "Electricity bill $120 on Jan 15"
    
    Returns structured transaction data that can be auto-saved.
    """
    result = AITransactionParser.parse(request.text)
    return TransactionParseResponse(**result)

@router.get("/parse-suggestions", response_model=ParseSuggestionsResponse)
def get_parser_suggestions(
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user)
):
    """
    Get suggestions for transaction parser input formats.
    
    Returns examples of supported formats, categories, and date patterns
    to help users write better natural language inputs.
    """
    suggestions = AITransactionParser.get_suggestions()
    return ParseSuggestionsResponse(**suggestions)

@router.get("/recurring-suggestions", response_model=List[RecurringSuggestion])
def get_recurring_suggestions(
    days_back: int = 90,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user)
):
    """
    Get AI suggestions for recurring expenses based on spending patterns.
    
    Analyzes the user's transaction history to identify:
    - Monthly recurring expenses (rent, utilities, subscriptions)
    - Bi-weekly expenses (salaries, paychecks)
    - Weekly recurring expenses (groceries)
    - Daily habits (coffee, lunch)
    
    Query Parameters:
    - days_back: Days of history to analyze (default: 90)
    
    Returns suggestions with:
    - Category and average amount
    - Frequency (daily, weekly, bi-weekly, monthly)
    - Human-readable message
    - Confidence score (0-1)
    - Number of occurrences detected
    """
    # Get user's transactions
    transactions = db.query(transaction_model.Transaction).filter(
        transaction_model.Transaction.user_id == current_user.id
    ).all()
    
    # Convert to dicts for analysis
    txn_list = [
        {
            'date': t.date or t.created_at.strftime('%Y-%m-%d') if t.created_at else __import__('datetime').datetime.now().strftime('%Y-%m-%d'),
            'amount': t.amount,
            'category': t.category or 'Other',
            'type': t.type,
            'comment': t.comment
        }
        for t in transactions
    ]
    
    # Get suggestions
    suggestions = RecurringExpenseSuggester.find_recurring_patterns(txn_list, days_back)
    
    return [RecurringSuggestion(**s) for s in suggestions]

