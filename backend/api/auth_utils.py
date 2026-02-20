import jwt
from datetime import datetime, timedelta
from django.conf import settings

def get_secret():
    return getattr(settings, 'JWT_SECRET_KEY', settings.SECRET_KEY)

def get_algorithm():
    return getattr(settings, 'JWT_ALGORITHM', 'HS256')

def get_access_expire_minutes():
    return getattr(settings, 'JWT_ACCESS_EXPIRE_MINUTES', 1440)

def _ensure_str(tok):
    if isinstance(tok, bytes):
        return tok.decode("utf-8")
    return tok

def create_access_token(data: dict, expires_delta=None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=get_access_expire_minutes())
    # data expects 'sub' (user_id) and 'version' (token_version)
    to_encode.update({"exp": expire, "type": "access"})
    return _ensure_str(jwt.encode(to_encode, get_secret(), algorithm=get_algorithm()))

def create_refresh_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire, "type": "refresh"})
    return _ensure_str(jwt.encode(to_encode, get_secret(), algorithm=get_algorithm()))

def decode_token(token: str):
    return jwt.decode(token, get_secret(), algorithms=[get_algorithm()])
