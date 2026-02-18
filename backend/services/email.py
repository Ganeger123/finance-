import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from datetime import datetime
from ..config import settings

logger = logging.getLogger(__name__)

class EmailService:
    """
    SMTP-based email service to send notifications
    """
    
    @staticmethod
    def send_email(
        recipient: str,
        subject: str,
        html_body: str,
        text_body: Optional[str] = None
    ) -> bool:
        """
        Send email using SMTP configuration from settings
        
        Args:
            recipient: Email address to send to
            subject: Email subject
            html_body: HTML content of email
            text_body: Plain text fallback (optional)
            
        Returns:
            True if sent successfully, False otherwise
        """
        try:
            # Check if SMTP is configured
            if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
                logger.warning("Email service not configured. Skipping email send.")
                return False
            
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = settings.SMTP_FROM_EMAIL
            message["To"] = recipient
            
            # Add text and HTML parts
            if text_body:
                message.attach(MIMEText(text_body, "plain"))
            message.attach(MIMEText(html_body, "html"))
            
            # Send email
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(
                    settings.SMTP_FROM_EMAIL,
                    recipient,
                    message.as_string()
                )
            
            logger.info(f"Email sent to {recipient}: {subject}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {recipient}: {str(e)}")
            return False
    
    @staticmethod
    def send_registration_email(user_email: str, user_name: str) -> bool:
        """Send welcome email to new registered user"""
        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2563eb;">Welcome to FinCore, {user_name}!</h2>
                    <p>Your account has been created successfully.</p>
                    <p><strong>Email:</strong> {user_email}</p>
                    <p><strong>Action:</strong> Registration</p>
                    <p><strong>Timestamp:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
                    <p style="margin-top: 30px; color: #666; font-size: 12px;">
                        Your account is currently pending approval. You will receive a notification once an administrator reviews your registration.
                    </p>
                </div>
            </body>
        </html>
        """
        
        text_body = f"""
Welcome to FinCore, {user_name}!

Your account has been created successfully.
Email: {user_email}
Action: Registration
Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}

Your account is currently pending approval. You will receive a notification once an administrator reviews your registration.
        """
        
        return EmailService.send_email(
            recipient=user_email,
            subject="Welcome to FinCore - Account Created",
            html_body=html_body,
            text_body=text_body
        )
    
    @staticmethod
    def send_login_email(user_email: str, user_name: str, ip: Optional[str] = None) -> bool:
        """Send login notification email"""
        ip_info = f"<p><strong>IP Address:</strong> {ip}</p>" if ip else ""
        
        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2563eb;">Login Notification</h2>
                    <p>Hello {user_name},</p>
                    <p><strong>Email:</strong> {user_email}</p>
                    <p><strong>Action:</strong> Login</p>
                    <p><strong>Timestamp:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
                    {ip_info}
                    <p style="margin-top: 30px; color: #999; font-size: 12px;">
                        If you did not make this login attempt, please change your password immediately.
                    </p>
                </div>
            </body>
        </html>
        """
        
        return EmailService.send_email(
            recipient=user_email,
            subject="Login Notification - FinCore",
            html_body=html_body
        )
    
    @staticmethod
    def send_logout_email(user_email: str, user_name: str) -> bool:
        """Send logout notification email"""
        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2563eb;">Logout Notification</h2>
                    <p>Hello {user_name},</p>
                    <p><strong>Email:</strong> {user_email}</p>
                    <p><strong>Action:</strong> Logout</p>
                    <p><strong>Timestamp:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
                </div>
            </body>
        </html>
        """
        
        return EmailService.send_email(
            recipient=user_email,
            subject="Logout Notification - FinCore",
            html_body=html_body
        )
    
    @staticmethod
    def send_password_changed_email(user_email: str, user_name: str) -> bool:
        """Send password change notification email"""
        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2563eb;">Password Changed</h2>
                    <p>Hello {user_name},</p>
                    <p><strong>Email:</strong> {user_email}</p>
                    <p><strong>Action:</strong> Password Changed</p>
                    <p><strong>Timestamp:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
                    <p style="margin-top: 30px; color: #999; font-size: 12px;">
                        If you did not make this change, please contact support immediately.
                    </p>
                </div>
            </body>
        </html>
        """
        
        return EmailService.send_email(
            recipient=user_email,
            subject="Password Changed - FinCore",
            html_body=html_body
        )
    
    @staticmethod
    def send_transaction_email(
        user_email: str,
        user_name: str,
        transaction_type: str,
        amount: float,
        category: str,
        description: str = ""
    ) -> bool:
        """Send transaction notification email"""
        transaction_label = "Income" if transaction_type == "income" else "Expense"
        
        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2563eb;">Transaction Created</h2>
                    <p>Hello {user_name},</p>
                    <p><strong>Email:</strong> {user_email}</p>
                    <p><strong>Action:</strong> {transaction_label} Added</p>
                    <p><strong>Amount:</strong> ${amount:.2f}</p>
                    <p><strong>Category:</strong> {category}</p>
                    {f'<p><strong>Description:</strong> {description}</p>' if description else ''}
                    <p><strong>Timestamp:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
                </div>
            </body>
        </html>
        """
        
        return EmailService.send_email(
            recipient=user_email,
            subject=f"New {transaction_label} Created - FinCore",
            html_body=html_body
        )
    
    @staticmethod
    def send_account_approved_email(user_email: str, user_name: str) -> bool:
        """Send account approval notification"""
        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #10b981;">Account Approved!</h2>
                    <p>Hello {user_name},</p>
                    <p>Your FinCore account has been approved!</p>
                    <p><strong>Email:</strong> {user_email}</p>
                    <p><strong>Action:</strong> Account Approved</p>
                    <p><strong>Timestamp:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
                    <p style="margin-top: 20px;">You can now log in and start managing your finances.</p>
                </div>
            </body>
        </html>
        """
        
        return EmailService.send_email(
            recipient=user_email,
            subject="Your Account Has Been Approved - FinCore",
            html_body=html_body
        )
    
    @staticmethod
    def send_admin_notification(
        action: str,
        user_email: str,
        details: str,
        recipient: Optional[str] = None
    ) -> bool:
        """Send admin notification email"""
        if not recipient:
            recipient = settings.ADMIN_EMAIL
        
        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #dc2626;">Admin Alert</h2>
                    <p><strong>User Email:</strong> {user_email}</p>
                    <p><strong>Action:</strong> {action}</p>
                    <p><strong>Details:</strong> {details}</p>
                    <p><strong>Timestamp:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
                </div>
            </body>
        </html>
        """
        
        return EmailService.send_email(
            recipient=recipient,
            subject=f"Admin Alert - {action}",
            html_body=html_body
        )
