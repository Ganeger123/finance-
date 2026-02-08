from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.income import Income
from app.models.expense import Expense
from app.models.enums import IncomeType, IncomeSubtype
from typing import Dict, Any

class FinanceService:
    @staticmethod
    def calculate_income_amount(income_type: IncomeType, subtype: IncomeSubtype, student_count: int) -> float:
        if income_type in [IncomeType.FORMATION_CAMERA, IncomeType.FORMATION_ELECTRICITE]:
            if subtype == IncomeSubtype.INSCRIPTION:
                return student_count * 1000.0
            elif subtype == IncomeSubtype.PARTICIPATION:
                return student_count * 10000.0
        return 0.0

    @staticmethod
    def calculate_commissions(income_type: IncomeType, subtype: IncomeSubtype, student_count: int) -> float:
        """
        15% on inscription fees
        5% on participation fees
        """
        if income_type in [IncomeType.FORMATION_CAMERA, IncomeType.FORMATION_ELECTRICITE]:
            if subtype == IncomeSubtype.INSCRIPTION:
                base_amount = student_count * 1000.0
                return base_amount * 0.15
            elif subtype == IncomeSubtype.PARTICIPATION:
                base_amount = student_count * 10000.0
                return base_amount * 0.05
        return 0.0

    @staticmethod
    def _get_custom_expense_amounts(db: Session, month: int = None, year: int = None) -> float:
        """Helper to total amounts from dynamic ExpenseEntry JSON data."""
        from app.models.form_builder import ExpenseEntry, ExpenseField, ExpenseForm
        from sqlalchemy import extract
        
        query = db.query(ExpenseEntry)
        if month:
            query = query.filter(extract('month', ExpenseEntry.created_at) == month)
        if year:
            query = query.filter(extract('year', ExpenseEntry.created_at) == year)
            
        entries = query.all()
        total = 0.0
        
        # We need to know which fields are 'Amount' fields
        amount_fields = db.query(ExpenseField).filter(
            func.lower(ExpenseField.label).in_(['montant', 'amount', 'prix', 'total'])
        ).all()
        amount_field_ids = [str(f.id) for f in amount_fields]
        
        for entry in entries:
            for fid in amount_field_ids:
                val = entry.data.get(fid)
                if val:
                    try:
                        total += float(val)
                    except (ValueError, TypeError):
                        continue
        return total

    @staticmethod
    def get_dashboard_summary(db: Session) -> Dict[str, Any]:
        total_income = db.query(func.sum(Income.amount)).scalar() or 0.0
        standard_expenses = db.query(func.sum(Expense.amount)).scalar() or 0.0
        custom_expenses = FinanceService._get_custom_expense_amounts(db)
        
        total_expenses = standard_expenses + custom_expenses
        net_result = total_income - total_expenses
        
        margin = (net_result / total_income * 100) if total_income > 0 else 0.0

        return {
            "total_income": total_income,
            "total_expenses": total_expenses,
            "net_result": net_result,
            "margin": round(margin, 2),
            "observation": "Bénéfice" if net_result >= 0 else "Perte"
        }

    @staticmethod
    def get_monthly_stats(db: Session, year: int) -> list:
        from sqlalchemy import extract
        
        data = []
        for month in range(1, 13):
            monthly_income = db.query(func.sum(Income.amount)).filter(
                extract('month', Income.date) == month,
                extract('year', Income.date) == year
            ).scalar() or 0.0
            
            standard_expense = db.query(func.sum(Expense.amount)).filter(
                extract('month', Expense.date) == month,
                extract('year', Expense.date) == year
            ).scalar() or 0.0
            
            custom_expense = FinanceService._get_custom_expense_amounts(db, month=month, year=year)
            
            data.append({
                "month": month,
                "income": monthly_income,
                "expense": standard_expense + custom_expense
            })
            
        return data
