import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')

DEBUG = os.environ.get('DEBUG', 'True').lower() in ('1', 'true', 'yes')

ALLOWED_HOSTS = ['*']

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'rest_framework',
    'api',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'api.middleware.AuditLoggingMiddleware',  # Custom audit logging
]

ROOT_URLCONF = 'config.urls'

WSGI_APPLICATION = 'config.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

AUTH_USER_MODEL = 'api.User'

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# CORS: allow frontend origins (local + Render)
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
    'https://panace-web.onrender.com',
]
_extra = os.environ.get('BACKEND_CORS_ORIGINS', '')
if _extra:
    CORS_ALLOWED_ORIGINS.extend(x.strip() for x in _extra.split(',') if x.strip())
CORS_ALLOW_CREDENTIALS = True

# JWT (match FastAPI token shape)
JWT_SECRET_KEY = os.environ.get('SECRET_KEY', SECRET_KEY)
JWT_ALGORITHM = 'HS256'
JWT_ACCESS_EXPIRE_MINUTES = 24 * 60  # 1440

REST_FRAMEWORK = {
    'UNAUTHENTICATED_USER': None,
}

# SMTP for email alerts
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
SMTP_TLS = os.environ.get('SMTP_TLS', 'true').lower() in ('1', 'true', 'yes')
EMAILS_FROM_EMAIL = os.environ.get('EMAILS_FROM_EMAIL', SMTP_USER)
EMAILS_FROM_NAME = os.environ.get('EMAILS_FROM_NAME', 'Panacée FinSys')
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', SMTP_USER)

# Rate limiting: failed login threshold before alerting admin
FAILED_LOGIN_ALERT_THRESHOLD = 5
FAILED_LOGIN_WINDOW_MINUTES = 15

# Cache for rate limiting (use local memory for dev)
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    }
}
