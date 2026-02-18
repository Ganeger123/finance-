from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import jwt, JWTError
from fastapi import HTTPException, status
from ..config import settings

# Try bcrypt, fallback to plaintext for testing
try:
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
except:
    pwd_context = None

def verify_password(plain_password, hashed_password):
    """Verify password - supports both hashed and plain passwords for dev/testing"""
    # If it looks like a hashed password, try to verify it
    if hashed_password.startswith('$2') or hashed_password.startswith('$2a') or hashed_password.startswith('$2b'):
        try:
            if pwd_context:
                return pwd_context.verify(plain_password, hashed_password)
        except:
            pass
    
    # Fallback: direct comparison for plain passwords (dev/testing only)
    return plain_password == hashed_password

def get_password_hash(password):
    """Hash password - uses bcrypt if available, plain text for testing"""
    if pwd_context:
        try:
            return pwd_context.hash(password)
        except:
            return password
    return password

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> dict:
    """Decode and verify a JWT token. Returns the payload dict or raises HTTPException."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

