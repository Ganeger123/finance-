
from datetime import datetime
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

def send_new_user_email(user_email: str, full_name: str):
    """
    Sends a welcome email to a newly registered user.
    """
    if not all([settings.SMTP_HOST, settings.SMTP_USER, settings.SMTP_PASSWORD]):
        print("SMTP settings not fully configured. Email not sent.")
        return

    message = MIMEMultipart()
    message["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
    message["To"] = user_email
    message["Subject"] = "Welcome to Panacée FinSys - Account Pending Approval"

    body = f"""
    Hello {full_name},

    Your account has been successfully created on Panacée FinSys financial management dashboard.
    
    Your account is currently pending admin approval. You will be able to log in and start 
    tracking your transactions once an administrator approves your account.
    
    We will send you an email confirmation as soon as your account is approved.
    
    Thank you for joining Panacée FinSys.
    
    Best regards,
    The Panacée Team
    """
    message.attach(MIMEText(body, "plain"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            if settings.SMTP_TLS:
                server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(message)
            print(f"Welcome email sent to {user_email}")
    except Exception as e:
        print(f"Error sending email: {e}")

def send_approval_email(user_email: str, full_name: str):
    """
    Sends a confirmation email when a user account is approved.
    """
    if not all([settings.SMTP_HOST, settings.SMTP_USER, settings.SMTP_PASSWORD]):
        print("SMTP settings not fully configured. Email not sent.")
        return

    message = MIMEMultipart()
    message["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
    message["To"] = user_email
    message["Subject"] = "Your Panacée FinSys Account Has Been Approved!"

    body = f"""
    Hello {full_name},

    Great news! Your account on Panacée FinSys has been approved by an administrator.
    
    You can now log in and start tracking your income, expenses, and financial reports.
    
    Visit: https://panace-web.onrender.com to get started.
    
    If you have any questions, please contact our support team.
    
    Best regards,
    The Panacée Team
    """
    message.attach(MIMEText(body, "plain"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            if settings.SMTP_TLS:
                server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(message)
            print(f"Approval email sent to {user_email}")
    except Exception as e:
        print(f"Error sending approval email: {e}")

def send_rejection_email(user_email: str, full_name: str):
    """
    Sends a rejection email when a user account is rejected.
    """
    if not all([settings.SMTP_HOST, settings.SMTP_USER, settings.SMTP_PASSWORD]):
        print("SMTP settings not fully configured. Email not sent.")
        return

    message = MIMEMultipart()
    message["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
    message["To"] = user_email
    message["Subject"] = "Panacée FinSys Account Application Status"

    body = f"""
    Hello {full_name},

    Thank you for your interest in Panacée FinSys. Unfortunately, your account application 
    has been rejected by our administrators.
    
    If you believe this is in error or would like more information, please contact our support team.
    
    Best regards,
    The Panacée Team
    """
    message.attach(MIMEText(body, "plain"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            if settings.SMTP_TLS:
                server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(message)
            print(f"Rejection email sent to {user_email}")
    except Exception as e:
        print(f"Error sending rejection email: {e}")

def send_expense_notification_email(admin_email: str, expense_data: dict, creator_name: str):
    """
    Sends a notification email to the admin when a new expense is logged.
    """
    if not all([settings.SMTP_HOST, settings.SMTP_USER, settings.SMTP_PASSWORD]):
        print("SMTP settings not fully configured. Notification NOT sent.")
        return

    message = MIMEMultipart()
    message["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
    message["To"] = admin_email
    message["Subject"] = f"New Expense Logged: {expense_data['category']} ({expense_data['amount']} HTG)"

    body = f"""
A new expense has been recorded in Panacée FinSys.

Transaction Details:
--------------------
Category: {expense_data['category']}
Amount: {expense_data['amount']} HTG
Comment: {expense_data.get('comment', 'None')}
Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Recorded by: {creator_name}

Best regards,
Panacée Admin
    """
    message.attach(MIMEText(body, "plain"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            if settings.SMTP_TLS:
                server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(message)
            print(f"Expense notification sent to {admin_email}")
    except Exception as e:
        print(f"Error sending notification email: {e}")
