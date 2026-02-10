from datetime import datetime, timedelta
from typing import Optional, Union, Any
from jose import jwt
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        # Handle case where hashed_password is not actually a hash (fallback for plain passwords)
        # This shouldn't happen in production but helps during development/migration
        if isinstance(e, Exception) and "hash could not be identified" in str(e):
            # Fallback: if hash verification fails, try plain comparison (dangerous, only for fallback)
            if hashed_password == plain_password:
                return True
        return False

def get_password_hash(password: str) -> str:
    # Bcrypt has a 72-byte limit on password input
    try:
        # Ensure password is a string and limit to 72 bytes
        if isinstance(password, bytes):
            password = password.decode('utf-8')
        password = password[:72]
        return pwd_context.hash(password)
    except Exception as e:
        # Fallback: just ensure it's at most 72 bytes and try again
        if len(str(password)) > 72:
            password = str(password)[:72]
        return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        # Refresh token expires in 7 days by default
        expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt
