from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from io import BytesIO
from sqlalchemy.orm import Session
from sqlalchemy import extract, func
from app.models.income import Income
from app.models.expense import Expense
import datetime

class PdfService:
    @staticmethod
    def generate_monthly_report(db: Session, year: int, month: int) -> BytesIO:
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        elements = []
        styles = getSampleStyleSheet()

        # --- Data Fetching ---
        # Get start and end date for the month
        start_date = datetime.date(year, month, 1)
        if month == 12:
            end_date = datetime.date(year + 1, 1, 1)
        else:
            end_date = datetime.date(year, month + 1, 1)

        incomes = db.query(Income).filter(
            extract('month', Income.date) == month, 
            extract('year', Income.date) == year
        ).all()

        expenses = db.query(Expense).filter(
            extract('month', Expense.date) == month, 
            extract('year', Expense.date) == year
        ).all()

        total_income = sum(i.amount for i in incomes)
        total_expense = sum(e.amount for e in expenses)
        net_result = total_income - total_expense
        margin = (net_result / total_income * 100) if total_income > 0 else 0.0

        # --- PDF Content ---

        # Title
        month_name = datetime.date(year, month, 1).strftime("%B")
        title_style = ParagraphStyle('Title', parent=styles['Heading1'], alignment=1, spaceAfter=20)
        elements.append(Paragraph(f"Rapport Financier Panacée - {month_name} {year}", title_style))
        elements.append(Spacer(1, 12))

        # Executive Summary Table
        elements.append(Paragraph("Executive Summary", styles['Heading2']))
        summary_data = [
            ['Metric', 'Value'],
            ['Total Income', f"{total_income:,.2f} HTG"],
            ['Total Expenses', f"{total_expense:,.2f} HTG"],
            ['Net Result', f"{net_result:,.2f} HTG"],
            ['Margin', f"{margin:.2f}%"],
            ['Observation', "Bénéfice" if net_result >= 0 else "Perte"]
        ]
        
        # Style logic for net result row
        net_result_color = colors.green if net_result >= 0 else colors.red

        t_summary = Table(summary_data, colWidths=[2.5*inch, 2.5*inch])
        t_summary.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('TEXTCOLOR', (1, 3), (1, 3), net_result_color), # Color Net Result
            ('FONTNAME', (1, 3), (1, 3), 'Helvetica-Bold'),
        ]))
        elements.append(t_summary)
        elements.append(Spacer(1, 24))

        # Income Section
        elements.append(Paragraph("Income Breakdown", styles['Heading2']))
        if incomes:
            income_data = [['Date', 'Type', 'Subtype', 'Amount (HTG)']]
            for inc in incomes:
                income_data.append([
                    inc.date.strftime("%Y-%m-%d"),
                    inc.type.value if hasattr(inc.type, 'value') else str(inc.type),
                    inc.subtype.value if inc.subtype and hasattr(inc.subtype, 'value') else "N/A",
                    f"{inc.amount:,.2f}"
                ])
            
            t_income = Table(income_data, colWidths=[1.5*inch, 1.5*inch, 1.5*inch, 1.5*inch])
            t_income.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgreen),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (3, 1), (3, -1), 'RIGHT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ]))
            elements.append(t_income)
        else:
            elements.append(Paragraph("No income recorded for this period.", styles['Normal']))
        
        elements.append(Spacer(1, 24))

        # Expense Section
        elements.append(Paragraph("Expense Breakdown", styles['Heading2']))
        if expenses:
            expense_data = [['Date', 'Category', 'Comment', 'Amount (HTG)']]
            for exp in expenses:
                comment = (exp.comment[:30] + '...') if exp.comment and len(exp.comment) > 30 else (exp.comment or "")
                category = exp.category if isinstance(exp.category, str) else (exp.category.value if hasattr(exp.category, 'value') else str(exp.category))
                
                expense_data.append([
                    exp.date.strftime("%Y-%m-%d"),
                    category,
                    comment,
                    f"{exp.amount:,.2f}"
                ])
            
            t_expense = Table(expense_data, colWidths=[1.2*inch, 1.5*inch, 2.0*inch, 1.3*inch])
            t_expense.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightpink),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (3, 1), (3, -1), 'RIGHT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ]))
            elements.append(t_expense)
        else:
            elements.append(Paragraph("No expenses recorded for this period.", styles['Normal']))

        # Build PDF
        doc.build(elements)
        buffer.seek(0)
        return buffer
