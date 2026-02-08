"""
Database Reset Script
Clears all transactions from the database while keeping users and workspaces intact.
"""
import sys
import os

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.base import SessionLocal
from app.models.expense import Expense
from app.models.income import Income
from app.models.form_builder import ExpenseEntry

def clear_all_transactions():
    """Delete all transactions (expenses, income, and custom form entries)"""
    db = SessionLocal()
    try:
        # Delete all expense entries from custom forms
        entry_count = db.query(ExpenseEntry).delete()
        print(f"Deleted {entry_count} custom expense entries")
        
        # Delete all expenses
        expense_count = db.query(Expense).delete()
        print(f"Deleted {expense_count} expenses")
        
        # Delete all income
        income_count = db.query(Income).delete()
        print(f"Deleted {income_count} income records")
        
        db.commit()
        print("\n✅ All transactions cleared successfully!")
        print("Users and workspaces remain intact.")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error clearing transactions: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("🧹 Clearing all transactions from database...")
    print("=" * 50)
    clear_all_transactions()
