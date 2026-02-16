import logging
from django.core.mail import send_mail
from django.conf import settings
from .models import AuditLog
from django.utils import timezone

logger = logging.getLogger(__name__)

class EmailService:
    @staticmethod
    def send_welcome_email(user_email, full_name):
        subject = "Welcome to Panacée FinSys - Account Pending Approval"
        message = f"""
Hello {full_name},

Your account has been successfully created on Panacée FinSys financial management dashboard.

Your account is currently pending admin approval. You will be able to log in and start 
tracking your transactions once an administrator approves your account.

We will send you an email confirmation as soon as your account is approved.

Thank you for joining Panacée FinSys.

Best regards,
The Panacée Team
        """
        try:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [user_email],
                fail_silently=False,
            )
            logger.info(f"Welcome email sent to {user_email}")
        except Exception as e:
            logger.error(f"Error sending email: {e}")

    @staticmethod
    def send_approval_email(user_email, full_name):
        subject = "Your Panacée FinSys Account Has Been Approved!"
        message = f"""
Hello {full_name},

Great news! Your account on Panacée FinSys has been approved by an administrator.

You can now log in and start tracking your income, expenses, and financial reports.

Visit: https://panace-web.onrender.com to get started.

If you have any questions, please contact our support team.

Best regards,
The Panacée Team
        """
        try:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [user_email],
                fail_silently=False,
            )
            logger.info(f"Approval email sent to {user_email}")
        except Exception as e:
            logger.error(f"Error sending approval email: {e}")

class AuditService:
    @staticmethod
    def log_action(user, action, details=None, ip_address=None):
        try:
            AuditLog.objects.create(
                user=user,
                user_email=user.email if user else None,
                action=action,
                details=details,
                ip_address=ip_address,
                timestamp=timezone.now()
            )
        except Exception as e:
            logger.error(f"Failed to create audit log: {e}")
