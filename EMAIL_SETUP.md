# Email Service Configuration Guide

## Overview
The FinCore application uses an SMTP-based email service to send notifications for:
- User registration
- Login alerts
- Account approvals
- Password resets
- Transaction notifications

## Option 1: Gmail Configuration (Recommended for Testing)

### Step 1: Enable 2-Factor Authentication
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable "2-Step Verification" if not already enabled
3. Complete the verification process

### Step 2: Create an App Password
1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
2. Select "Mail" and "Windows Computer" (or your device type)
3. Google will generate a 16-character password
4. **Copy this password** - you'll need it in the next step

### Step 3: Configure Environment Variables
1. Create or edit the `.env` file in the project root:

```bash
# Email Configuration - Gmail SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx    # Your 16-character app password (without spaces)
SMTP_FROM_EMAIL=your-email@gmail.com
ADMIN_EMAIL=admin@example.com
```

2. Replace:
   - `your-email@gmail.com` with your Gmail address
   - `xxxx xxxx xxxx xxxx` with the 16-character app password (remove spaces)
   - `admin@example.com` with your admin email address

### Step 4: Restart the Backend
```bash
.\.venv\Scripts\uvicorn.exe backend.main:app --host 127.0.0.1 --port 8000 --reload
```

## Option 2: SendGrid Configuration (Production)

### Step 1: Create SendGrid Account
1. Sign up at [SendGrid](https://sendgrid.com)
2. Verify your sender email
3. Create an API key from [API Keys](https://app.sendgrid.com/settings/api_keys)

### Step 2: Configure Environment Variables
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SMTP_FROM_EMAIL=noreply@yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com
```

Make sure your domain is verified in SendGrid settings.

## Testing the Email Service

### Method 1: Manual API Test
Use curl to test user registration (which triggers an email):
```bash
curl -X POST "http://127.0.0.1:8000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "TestPassword123",
    "name": "Test User"
  }'
```

Check your configured email for the registration notification.

### Method 2: Test via Frontend
1. Navigate to the login page
2. Click "Sign up"
3. Fill in the registration form
4. Check your email for the welcome notification

## Troubleshooting

### Email Not Sending
1. **Check environment variables are loaded:**
   ```bash
   # In Python
   python -c "from backend.config import settings; print(settings.SMTP_USER)"
   ```

2. **Check Gmail app password is correct:**
   - Remove any spaces from the password
   - Ensure you're using an "App Password", not your regular Gmail password

3. **Check firewall/antivirus:**
   - Some antivirus software blocks SMTP port 587
   - Try port 465 (TLS) if 587 doesn't work

4. **View backend logs:**
   ```bash
   # Logs are printed to console when running with --reload
   # Look for messages like: "Email sent to user@example.com"
   ```

### Gmail Special Cases
- If using Gmail with Two-Factor Authentication, you MUST use an App Password
- Regular passwords will not work
- App passwords are unique and can be revoked at any time

## Email Templates

All email templates are defined in `backend/services/email.py`. You can customize:
- Email subject lines
- HTML styling and layout
- Plain text fallbacks
- Recipient logic

## Environment Variables Reference

| Variable | Default | Purpose |
|----------|---------|---------|
| `SMTP_HOST` | `smtp.gmail.com` | SMTP server address |
| `SMTP_PORT` | `587` | SMTP server port (587 for TLS, 465 for SSL) |
| `SMTP_USER` | Empty | Email address for authentication |
| `SMTP_PASSWORD` | Empty | Password or API key |
| `SMTP_FROM_EMAIL` | `noreply@panace.com` | Sender email address |
| `ADMIN_EMAIL` | Empty | Admin notification email |

## Security Notes
⚠️ **IMPORTANT:**
- Never commit `.env` file to version control
- Use environment variables in production, not hardcoded values
- App passwords are secure but revocable - change them regularly
- SendGrid API keys have usage limits and rates
- Monitor your email sending quota to avoid account suspension

## Production Deployment

For production deployment:
1. Use SendGrid, Mailgun, or AWS SES instead of Gmail
2. Set up domain verification for better deliverability
3. Configure SPF, DKIM, and DMARC records
4. Monitor bounce and complaint rates
5. Use transactional email templates (Handlebars or similar)
6. Implement email queuing for reliability

## Support
For issues with email configuration, check:
- `backend/config.py` - Configuration loading
- `backend/services/email.py` - Email sending logic
- `backend/routes/auth.py` - Email triggers
- Application logs for error messages
