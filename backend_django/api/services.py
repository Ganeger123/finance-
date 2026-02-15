"""Activity logging and email alerts to admin."""
import threading
from django.conf import settings
from .models import ActivityLog, AdminSettings

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
            import smtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart
            host = getattr(settings, 'SMTP_HOST', None)
            port = getattr(settings, 'SMTP_PORT', 587)
            user = getattr(settings, 'SMTP_USER', None)
            password = getattr(settings, 'SMTP_PASSWORD', None)
            from_email = getattr(settings, 'EMAILS_FROM_EMAIL', user)
            from_name = getattr(settings, 'EMAILS_FROM_NAME', 'Panacée FinSys')
            if not all([host, user, password]):
                return
            msg = MIMEMultipart()
            msg['From'] = f'{from_name} <{from_email}>'
            msg['To'] = to_email
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'plain'))
            with smtplib.SMTP(host, port) as server:
                if getattr(settings, 'SMTP_TLS', True):
                    server.starttls()
                server.login(user, password)
                server.send_message(msg)
        except Exception as e:
            import logging
            logging.getLogger(__name__).exception('Email send failed: %s', e)
    threading.Thread(target=_do, daemon=True).start()

def send_alert_to_admin(action, user_email, user_name='', ip='', device='', time_str='', extra=''):
    """Send real-time email to admin when alerts are enabled."""
    if AdminSettings.get('email_alerts_enabled', 'true').lower() not in ('true', '1', 'yes'):
        return
    admin_email = getattr(settings, 'ADMIN_EMAIL', None) or AdminSettings.get('ADMIN_EMAIL', '')
    if not admin_email:
        admin_email = getattr(settings, 'SMTP_USER', '')
    if not admin_email:
        return
    subject = '🔔 User Activity Alert'
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
    from django.utils import timezone
    from datetime import timedelta
    since = timezone.now() - timedelta(minutes=minutes)
    return ActivityLog.objects.filter(
        action='LOGIN_FAILED',
        ip_address=ip,
        created_at__gte=since,
    ).count()
