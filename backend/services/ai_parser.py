import re
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

class AITransactionParser:
    """
    Parse natural language input to extract transaction details.
    Handles phrases like: "I paid $45 for internet yesterday"
    """
    
    # Category mappings based on keywords
    CATEGORY_KEYWORDS = {
        'Utilities': ['electricity', 'internet', 'water', 'gas', 'phone', 'wifi', 'broadband', 'power', 'bill'],
        'Groceries': ['grocery', 'groceries', 'food', 'supermarket', 'market', 'shopping', 'milk', 'bread'],
        'Transport': ['gas', 'petrol', 'fuel', 'car', 'taxi', 'uber', 'transport', 'bus', 'train', 'parking'],
        'Entertainment': ['movie', 'cinema', 'game', 'entertainment', 'show', 'concert', 'ticket', 'fun'],
        'Dining': ['restaurant', 'lunch', 'dinner', 'breakfast', 'cafe', 'coffee', 'eat', 'meal'],
        'Health': ['doctor', 'medicine', 'pharmacy', 'hospital', 'health', 'medical', 'dental', 'gym'],
        'Shopping': ['clothes', 'dress', 'shirt', 'shoes', 'shopping', 'store', 'mall', 'amazon'],
        'Education': ['school', 'tuition', 'course', 'education', 'training', 'book', 'university'],
        'Insurance': ['insurance', 'premium', 'policy'],
        'Rent': ['rent', 'lease', 'landlord', 'mortgage'],
        'Entertainment': ['subscription', 'netflix', 'spotify', 'hbo', 'gaming'],
    }
    
    # Amount patterns (matches $45.99, 45 dollars, etc.)
    AMOUNT_PATTERN = r'\$?\s*(\d+(?:[.,]\d{2})?)\s*(?:dollars?|€|pounds?)?|(\d+(?:[.,]\d{2})?)\s*(?:dollars?|€|pounds?)'
    
    # Relative date patterns
    DATE_PATTERNS = {
        'today': 0,
        'yesterday': -1,
        'last week': -7,
        'last month': -30,
        'last year': -365,
        'last monday': None,  # Special handling
        'tomorrow': 1,
    }
    
    # Transaction type keywords
    EXPENSE_KEYWORDS = ['paid', 'spent', 'buy', 'bought', 'purchase', 'cost', 'expense', 'money']
    INCOME_KEYWORDS = ['earned', 'got', 'received', 'income', 'made', 'sold', 'payment']
    
    @staticmethod
    def parse(text: str) -> Dict[str, Any]:
        """
        Parse natural language transaction description.
        
        Args:
            text: Natural language input (e.g., "I paid $45 for internet yesterday")
            
        Returns:
            Dictionary with keys: type, amount, category, date, note
        """
        if not text or not text.strip():
            return {
                'type': 'expense',
                'amount': None,
                'category': 'Other',
                'date': datetime.now().strftime('%Y-%m-%d'),
                'note': '',
                'confidence': 0
            }
        
        text_lower = text.lower()
        
        # Detect transaction type
        transaction_type = 'expense'
        for keyword in AITransactionParser.INCOME_KEYWORDS:
            if keyword in text_lower:
                transaction_type = 'income'
                break
        
        # Extract amount
        amount_match = re.search(AITransactionParser.AMOUNT_PATTERN, text)
        amount = None
        if amount_match:
            amount_str = amount_match.group(1) or amount_match.group(2)
            # Handle both . and , as decimal separator
            amount_str = amount_str.replace(',', '.')
            try:
                amount = float(amount_str)
            except ValueError:
                amount = None
        
        # Extract date
        date_str = AITransactionParser._extract_date(text_lower)
        
        # Detect category
        category = AITransactionParser._detect_category(text_lower)
        
        # Calculate confidence score
        confidence = 0
        if amount:
            confidence += 0.3
        if category != 'Other':
            confidence += 0.4
        if date_str != datetime.now().strftime('%Y-%m-%d'):
            confidence += 0.2
        confidence += 0.1  # Base confidence
        
        return {
            'type': transaction_type,
            'amount': amount,
            'category': category,
            'date': date_str,
            'note': text,
            'confidence': round(min(confidence, 1.0), 2)
        }
    
    @staticmethod
    def _detect_category(text: str) -> str:
        """
        Detect transaction category based on keywords in text.
        
        Args:
            text: Lowercase text to analyze
            
        Returns:
            Category name
        """
        # Find best matching category based on keyword overlap
        best_category = 'Other'
        best_score = 0
        
        for category, keywords in AITransactionParser.CATEGORY_KEYWORDS.items():
            score = sum(1 for keyword in keywords if keyword in text)
            if score > best_score:
                best_score = score
                best_category = category
        
        # Special cases for better accuracy
        if 'subscription' in text or 'netflix' in text or 'spotify' in text:
            return 'Entertainment'
        if 'salary' in text or 'paycheck' in text or 'payment' in text:
            return 'Income'
        if 'transfer' in text or 'deposit' in text:
            return 'Banking'
        
        return best_category
    
    @staticmethod
    def _extract_date(text: str) -> str:
        """
        Extract date from text.
        
        Args:
            text: Lowercase text to analyze
            
        Returns:
            Date string in YYYY-MM-DD format
        """
        now = datetime.now()
        
        # Check for relative date patterns
        for pattern, days_offset in AITransactionParser.DATE_PATTERNS.items():
            if pattern in text:
                if days_offset is not None:
                    date = now + timedelta(days=days_offset)
                    return date.strftime('%Y-%m-%d')
        
        # Check for specific date patterns (e.g., "on jan 15", "12/25/2024")
        
        # MM/DD/YYYY or DD/MM/YYYY format
        date_match = re.search(r'(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})', text)
        if date_match:
            try:
                month, day, year = date_match.groups()
                year = int(year)
                if year < 100:
                    year += 2000
                date = datetime(year, int(month), int(day))
                return date.strftime('%Y-%m-%d')
            except ValueError:
                pass
        
        # Month name patterns (e.g., "january 15", "jan 15")
        month_names = {
            'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
            'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12,
            'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
            'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
        }
        
        for month_name, month_num in month_names.items():
            if month_name in text:
                # Find day number following the month
                day_match = re.search(f'{month_name}\\s*(\\d{{1,2}})', text)
                if day_match:
                    try:
                        day = int(day_match.group(1))
                        date = datetime(now.year, month_num, day)
                        # If date is in the future, use last year
                        if date > now:
                            date = datetime(now.year - 1, month_num, day)
                        return date.strftime('%Y-%m-%d')
                    except ValueError:
                        pass
        
        # Default to today
        return now.strftime('%Y-%m-%d')
    
    @staticmethod
    def get_suggestions() -> Dict[str, Any]:
        """Return example formats and supported categories"""
        return {
            'examples': [
                'I paid $45 for internet',
                'Spent 50 dollars on lunch yesterday',
                'Earned $200 from freelance work',
                'Coffee at Starbucks for $5 today',
                'Received payment of $1,500 last week',
                'Electricity bill $120 on Jan 15'
            ],
            'supported_categories': list(AITransactionParser.CATEGORY_KEYWORDS.keys()),
            'date_formats': [
                'today', 'yesterday', 'last week', 'last month', 'last year',
                'January 15', 'Jan 15', '01/15/2024', '15-01-2024'
            ],
            'currency_formats': ['$45', '$45.99', '45 dollars', '€50', '50 euros']
        }
