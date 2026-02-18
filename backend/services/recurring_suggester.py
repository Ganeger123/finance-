from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from collections import defaultdict
from sqlalchemy.orm import Session
import logging

logger = logging.getLogger(__name__)

class RecurringExpenseSuggester:
    """
    AI service to detect recurring expense patterns and suggest automations.
    Analyzes transaction history to identify:
    - Monthly recurring expenses (rent, subscriptions, utilities)
    - Bi-weekly expenses (salaries/paychecks)
    - Weekly recurring expenses (groceries)
    - Even daily habits (coffee, lunch)
    """
    
    # Minimum occurrences to consider as recurring
    MIN_OCCURRENCES = 2
    
    # Confidence threshold (0-1)
    CONFIDENCE_THRESHOLD = 0.6
    
    @staticmethod
    def find_recurring_patterns(
        transactions: List[Dict[str, Any]],
        days_back: int = 90
    ) -> List[Dict[str, Any]]:
        """
        Analyze transactions to find recurring patterns.
        
        Args:
            transactions: List of transaction dicts with date, amount, category
            days_back: Days of history to analyze
            
        Returns:
            List of suggested recurring transactions
        """
        if not transactions or len(transactions) < RecurringExpenseSuggester.MIN_OCCURRENCES:
            return []
        
        # Filter to recent transactions
        cutoff_date = datetime.now() - timedelta(days=days_back)
        recent_txns = [
            t for t in transactions
            if datetime.fromisoformat(t.get('date', '')) >= cutoff_date
        ]
        
        if len(recent_txns) < RecurringExpenseSuggester.MIN_OCCURRENCES:
            return []
        
        # Group by category and amount for pattern detection
        suggestions = []
        
        # Detect monthly patterns
        suggestions.extend(
            RecurringExpenseSuggester._detect_monthly_patterns(recent_txns)
        )
        
        # Detect bi-weekly patterns
        suggestions.extend(
            RecurringExpenseSuggester._detect_biweekly_patterns(recent_txns)
        )
        
        # Detect weekly patterns
        suggestions.extend(
            RecurringExpenseSuggester._detect_weekly_patterns(recent_txns)
        )
        
        # Sort by confidence
        suggestions.sort(key=lambda x: x['confidence'], reverse=True)
        
        # Remove duplicates and keep only high-confidence suggestions
        unique_suggestions = []
        seen_keys = set()
        for s in suggestions:
            key = (s['category'], s['amount'], s['frequency'])
            if key not in seen_keys and s['confidence'] >= RecurringExpenseSuggester.CONFIDENCE_THRESHOLD:
                unique_suggestions.append(s)
                seen_keys.add(key)
        
        return unique_suggestions[:5]  # Return top 5 suggestions
    
    @staticmethod
    def _detect_monthly_patterns(transactions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Detect monthly recurring expenses (e.g., rent, utilities)"""
        suggestions = []
        
        # Group by category
        by_category = defaultdict(list)
        for txn in transactions:
            if txn.get('type') == 'expense':
                by_category[txn.get('category', 'Other')].append(txn)
        
        for category, txns in by_category.items():
            if len(txns) >= RecurringExpenseSuggester.MIN_OCCURRENCES:
                # Calculate average amount and day of month
                amounts = [t.get('amount', 0) for t in txns]
                avg_amount = sum(amounts) / len(amounts)
                
                # Extract days of month
                days_of_month = []
                for txn in txns:
                    try:
                        date = datetime.fromisoformat(txn.get('date', ''))
                        days_of_month.append(date.day)
                    except:
                        pass
                
                if days_of_month:
                    most_common_day = max(set(days_of_month), key=days_of_month.count)
                    day_count = days_of_month.count(most_common_day)
                    
                    # Calculate confidence
                    confidence = min(len(txns) / 3, 1.0) * (day_count / len(txns))
                    
                    if confidence >= RecurringExpenseSuggester.CONFIDENCE_THRESHOLD:
                        suggestions.append({
                            'category': category,
                            'amount': round(avg_amount, 2),
                            'frequency': 'monthly',
                            'day_of_month': most_common_day,
                            'occurrences': len(txns),
                            'confidence': round(confidence, 2),
                            'message': f'You usually pay {category.lower()} on the {most_common_day}th'
                        })
        
        return suggestions
    
    @staticmethod
    def _detect_biweekly_patterns(transactions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Detect bi-weekly recurring expenses (e.g., paychecks)"""
        suggestions = []
        
        # Group income transactions by category
        income_txns = [t for t in transactions if t.get('type') == 'income']
        
        if len(income_txns) >= RecurringExpenseSuggester.MIN_OCCURRENCES:
            # Get dates and calculate intervals
            dates = []
            for txn in sorted(income_txns, key=lambda x: x.get('date', '')):
                try:
                    date = datetime.fromisoformat(txn.get('date', ''))
                    dates.append(date)
                except:
                    pass
            
            if len(dates) >= 2:
                # Calculate intervals between transactions
                intervals = []
                for i in range(1, len(dates)):
                    delta = (dates[i] - dates[i-1]).days
                    intervals.append(delta)
                
                if intervals:
                    avg_interval = sum(intervals) / len(intervals)
                    
                    # Check if roughly biweekly (14 days ± 3 days)
                    if 11 <= avg_interval <= 17:
                        avg_amount = sum(t.get('amount', 0) for t in income_txns) / len(income_txns)
                        confidence = 0.75  # High confidence for regular income
                        
                        suggestions.append({
                            'category': income_txns[0].get('category', 'Salary'),
                            'amount': round(avg_amount, 2),
                            'frequency': 'bi-weekly',
                            'interval_days': round(avg_interval),
                            'occurrences': len(income_txns),
                            'confidence': confidence,
                            'message': f'You receive {round(avg_amount)} every ~{round(avg_interval)} days'
                        })
        
        return suggestions
    
    @staticmethod
    def _detect_weekly_patterns(transactions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Detect weekly recurring expenses (e.g., groceries)"""
        suggestions = []
        
        # Group by category for weekly analysis
        by_category = defaultdict(list)
        for txn in transactions:
            if txn.get('type') == 'expense':
                by_category[txn.get('category', 'Other')].append(txn)
        
        for category, txns in by_category.items():
            if len(txns) >= 3:  # Need at least 3 to detect weekly
                # Get dates
                dates = []
                for txn in txns:
                    try:
                        date = datetime.fromisoformat(txn.get('date', ''))
                        dates.append(date)
                    except:
                        pass
                
                if len(dates) >= 3:
                    # Calculate intervals
                    intervals = []
                    for i in range(1, len(dates)):
                        delta = (dates[i] - dates[i-1]).days
                        intervals.append(delta)
                    
                    if intervals:
                        avg_interval = sum(intervals) / len(intervals)
                        
                        # Check if roughly weekly (7 days ± 2 days)
                        if 5 <= avg_interval <= 9:
                            amounts = [t.get('amount', 0) for t in txns]
                            avg_amount = sum(amounts) / len(amounts)
                            
                            # Confidence based on consistency
                            amount_variance = max(amounts) - min(amounts)
                            consistency = 1 - (amount_variance / avg_amount) if avg_amount > 0 else 0
                            confidence = consistency * 0.7 + 0.3
                            
                            if confidence >= 0.5:
                                suggestions.append({
                                    'category': category,
                                    'amount': round(avg_amount, 2),
                                    'frequency': 'weekly',
                                    'interval_days': round(avg_interval),
                                    'occurrences': len(txns),
                                    'confidence': round(min(confidence, 1.0), 2),
                                    'message': f'You spend {round(avg_amount)} on {category.lower()} weekly'
                                })
        
        return suggestions
    
    @staticmethod
    def get_next_due_date(frequency: str, day_of_month: Optional[int] = None) -> str:
        """
        Calculate next due date for a recurring expense.
        
        Args:
            frequency: 'daily', 'weekly', 'bi-weekly', 'monthly'
            day_of_month: Day of month (for monthly expenses)
            
        Returns:
            Date string in YYYY-MM-DD format
        """
        today = datetime.now().date()
        
        if frequency == 'daily':
            next_date = today + timedelta(days=1)
        elif frequency == 'weekly':
            next_date = today + timedelta(days=7)
        elif frequency == 'bi-weekly':
            next_date = today + timedelta(days=14)
        elif frequency == 'monthly':
            if day_of_month:
                # Calculate next occurrence of day_of_month
                current_month_date = datetime(today.year, today.month, min(day_of_month, 28)).date()
                if current_month_date > today:
                    next_date = current_month_date
                else:
                    # Next month
                    if today.month == 12:
                        next_date = datetime(today.year + 1, 1, min(day_of_month, 28)).date()
                    else:
                        next_date = datetime(today.year, today.month + 1, min(day_of_month, 28)).date()
            else:
                # Default to today + 30 days
                next_date = today + timedelta(days=30)
        else:
            next_date = today
        
        return next_date.strftime('%Y-%m-%d')
