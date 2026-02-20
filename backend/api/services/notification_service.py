import logging
from django.core.mail import send_mail
from django.conf import settings
from .models import AdminSettings

logger = logging.getLogger(__name__)

def send_email_alert(subject, message, recipient_list=None):
    """
    Sends an email alert to the admin if email alerts are enabled in settings.
    This should be called as a background task if possible.
    """
    if not AdminSettings.get('email_alerts_enabled', 'false').lower() == 'true':
        logger.info(f"Email alerts disabled. Skipping: {subject}")
        return

    admin_email = AdminSettings.get('admin_email', getattr(settings, 'ADMIN_EMAIL', ''))
    if not admin_email:
        logger.warning("No admin email configured. Skipping alert.")
        return

    final_recipients = recipient_list or [admin_email]
    
    try:
        send_mail(
            subject=f"[FinTrack Alert] {subject}",
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=final_recipients,
            fail_silently=False,
        )
        logger.info(f"Email alert sent: {subject}")
    except Exception as e:
        logger.error(f"Failed to send email alert: {e}")

def notify_admin_of_event(event_type, user_email, details=""):
    """Higher level helper to format common alerts."""
    subject = f"Security Event: {event_type}"
    message = f"""
    A security event has occurred in FinTrack.
    
    Event: {event_type}
    User: {user_email}
    Details: {details}
    
    Please check the admin dashboard for more information.
    """
    send_email_alert(subject, message)
