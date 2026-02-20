"""Activity logging, email alerts, and PDF reporting services."""
import threading
import logging
import os
from io import BytesIO
from datetime import datetime, timedelta
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from .models import ActivityLog, AdminSettings

# ReportLab imports
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.units import inch

logger = logging.getLogger(__name__)

def get_client_ip(request):
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')

def get_user_agent(request):
    return request.META.get('HTTP_USER_AGENT', '')[:500]

def log_activity(user_id, user_email, user_name, action, request, status='Success', details=''):
    ip = get_client_ip(request)
    device = get_user_agent(request)
    ActivityLog.objects.create(
        user_id=user_id or None,
        user_email=user_email or '',
        user_name=user_name or '',
        action=action,
        ip_address=ip or None,
        device=device,
        status=status,
        details=details[:2000] if details else '',
    )

def _send_email_async(to_email, subject, body):
    def _do():
        try:
            send_mail(
                subject=subject,
                message=body,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', settings.EMAIL_HOST_USER),
                recipient_list=[to_email],
                fail_silently=False,
            )
            logger.info(f"Email sent to {to_email}: {subject}")
        except Exception as e:
            logger.exception('Email send failed: %s', e)
    threading.Thread(target=_do, daemon=True).start()

def send_alert_to_admin(action, user_email, user_name='', ip='', device='', time_str='', extra=''):
    """Send real-time email to admin when alerts are enabled."""
    if AdminSettings.get('email_alerts_enabled', 'true').lower() not in ('true', '1', 'yes'):
        return
    admin_email = AdminSettings.get('admin_email', getattr(settings, 'ADMIN_EMAIL', ''))
    if not admin_email:
        return
    subject = f'🔔 FinTrack Activity: {action}'
    body = f'''User: {user_email}
Name: {user_name or user_email}
Action: {action}
Time: {time_str}
IP: {ip}
Device/Browser: {device[:200] if device else "N/A"}

{extra}
'''
    _send_email_async(admin_email, subject, body)

def count_recent_failed_logins(ip, minutes=15):
    since = timezone.now() - timedelta(minutes=minutes)
    return ActivityLog.objects.filter(
        action='LOGIN_FAILED',
        ip_address=ip,
        created_at__gte=since,
    ).count()

# --- PDF Reporting Service ---

def generate_monthly_report_pdf(user_name, year, month, total_income, total_expenses, transactions, profile_photo_path=None):
    """Generates a professional financial report in PDF format."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor("#374b91"),
        alignment=1,
        spaceAfter=30
    )
    
    heading_style = ParagraphStyle(
        'HeadingStyle',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor("#2dd4bf"),
        spaceBefore=12,
        spaceAfter=12
    )

    elements = []
    elements.append(Paragraph("FinTrack Monthly Report", title_style))
    
    month_name = datetime(year, month, 1).strftime("%B")
    info_text = f"<b>Client:</b> {user_name}<br/><b>Reporting Period:</b> {month_name} {year}<br/><b>Status:</b> Official"
    elements.append(Paragraph(info_text, styles["Normal"]))
    
    if profile_photo_path and os.path.exists(profile_photo_path):
        try:
            img = Image(profile_photo_path, width=1*inch, height=1*inch)
            img.hAlign = 'RIGHT'
            elements.append(img)
        except:
            pass
            
    elements.append(Spacer(1, 20))

    summary_data = [
        ["Metric", "Value"],
        ["Total Income", f"${total_income:,.2f}"],
        ["Total Expenses", f"${total_expenses:,.2f}"],
        ["Net Savings", f"${(total_income - total_expenses):,.2f}"],
        ["Savings Rate", f"{((total_income - total_expenses) / total_income * 100 if total_income > 0 else 0):.1f}%"]
    ]
    
    summary_table = Table(summary_data, colWidths=[2*inch, 2*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#374b91")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.whitesmoke),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey)
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 30))

    elements.append(Paragraph("Detailed Transactions", heading_style))
    
    txn_data = [["Date", "Category", "Type", "Amount"]]
    for tx in transactions[:50]:  # Increased limit
        is_income = (tx.type == 'INCOME')
        txn_data.append([
            tx.date.strftime("%Y-%m-%d"),
            tx.category,
            "Income" if is_income else "Expense",
            f"${tx.amount:,.2f}"
        ])
        
    if not transactions:
        txn_data.append(["No records", "-", "-", "-"])

    txn_table = Table(txn_data, colWidths=[1.2*inch, 2*inch, 1*inch, 1.2*inch])
    txn_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f8fafc")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor("#64748b")),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('INNERGRID', (0, 0), (-1, -1), 0.25, colors.grey),
        ('BOX', (0, 0), (-1, -1), 0.25, colors.grey),
    ]))
    elements.append(txn_table)

    elements.append(Spacer(1, 50))
    footer_text = "Generated by FinTrack System. All rights reserved."
    elements.append(Paragraph(footer_text, styles["Italic"]))

    doc.build(elements)
    buffer.seek(0)
    return buffer
