
from datetime import datetime
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

def send_new_user_email(user_email: str, full_name: str):
    """
    Sends a short welcome email to a newly registered user.
    """
    if not all([settings.SMTP_HOST, settings.SMTP_USER, settings.SMTP_PASSWORD]):
        print("SMTP settings not fully configured. Email not sent.")
        return

    message = MIMEMultipart()
    message["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
    message["To"] = user_email
    message["Subject"] = "Bienvenue sur Panacée FinSys!"

    body = f"""
    Bonjour {full_name},

    Votre compte a été créé avec succès sur le tableau de bord de gestion financière Panacée.
    Vous pouvez maintenant vous connecter pour enregistrer vos transactions.

    L'équipe Panacée.
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
    message["Subject"] = f"Nouvelle Dépense Logguée: {expense_data['category']} ({expense_data['amount']} HTG)"

    body = f"""
    Une nouvelle dépense a été enregistrée dans Panacée FinSys.

    Détails de la transaction:
    --------------------------
    Catégorie: {expense_data['category']}
    Montant: {expense_data['amount']} HTG
    Commentaire: {expense_data.get('comment', 'Aucun')}
    Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
    Enregistré par: {creator_name}

    L'équipe Panacée Admin.
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
