import logging
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
from app.models.base import get_db
from app.models.user import User, UserStatus, UserRole
from app.schemas.user import UserCreate, UserOut
from app.schemas.auth import Token
from app.auth.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token
)
from app.api.deps import get_current_user, oauth2_scheme, require_admin
from jose import jwt, JWTError
from app.core.config import settings
from app.services.email import send_new_user_email, send_approval_email
from app.models.audit import AuditLog
from app.core.rate_limit import limiter

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/health")
def auth_health():
    return {"status": "ok", "message": "Auth router is working"}

@router.post("/register", response_model=UserOut)
@limiter.limit("3/hour")
def register(request: Request, user_in: UserCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Register a new user. Status is PENDING until admin approves."""
    db_user = db.query(User).filter(User.email == user_in.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The user with this email already exists in the system",
        )
    
    hashed_password = get_password_hash(user_in.password)
    db_user = User(
        email=user_in.email,
        hashed_password=hashed_password,
        full_name=user_in.full_name,
        role=UserRole.USER,
        status=UserStatus.PENDING
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Log the registration action
    client_ip = request.client.host if request.client else "unknown"
    audit_log = AuditLog(
        action="REGISTER",
        user_email=db_user.email,
        user_id=db_user.id,
        ip_address=client_ip,
        details=f"User {db_user.email} registered and is pending approval"
    )
    db.add(audit_log)
    db.commit()
    
    # Send welcome email in background
    background_tasks.add_task(send_new_user_email, db_user.email, db_user.full_name)
    
    return db_user

@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
def login(request: Request, db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    """Login user. Only approved users can login."""
    client_ip = request.client.host if request.client else "unknown"
    
    try:
        user = db.query(User).filter(User.email == form_data.username).first()
        
        if not user:
            logger.warning(f"Login failed: no user for email={form_data.username}")
            audit_log = AuditLog(
                action="LOGIN_FAILED",
                user_email=form_data.username,
                ip_address=client_ip,
                details="User not found"
            )
            db.add(audit_log)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if not verify_password(form_data.password, user.hashed_password):
            logger.warning(f"Login failed: bad password for email={form_data.username}")
            audit_log = AuditLog(
                action="LOGIN_FAILED",
                user_email=form_data.username,
                user_id=user.id,
                ip_address=client_ip,
                details="Invalid password"
            )
            db.add(audit_log)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Check if user is approved
        if user.status != UserStatus.APPROVED:
            logger.warning(f"Login failed: user not approved. email={form_data.username}, status={user.status}")
            audit_log = AuditLog(
                action="LOGIN_FAILED",
                user_email=form_data.username,
                user_id=user.id,
                ip_address=client_ip,
                details=f"User account not approved. Status: {user.status}"
            )
            db.add(audit_log)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Account not approved yet. Status: {user.status}",
            )
        
        # Check if user is active
        if not user.is_active:
            logger.warning(f"Login failed: user inactive. email={form_data.username}")
            audit_log = AuditLog(
                action="LOGIN_FAILED",
                user_email=form_data.username,
                user_id=user.id,
                ip_address=client_ip,
                details="User account is inactive"
            )
            db.add(audit_log)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is inactive",
            )
        
        # Update last login
        user.last_login = datetime.utcnow()
        db.commit()
        
        # Create tokens
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email, "role": user.role.value, "status": user.status.value, "version": user.token_version},
            expires_delta=access_token_expires
        )
        refresh_token = create_refresh_token(
            data={"sub": user.email, "version": user.token_version}
        )
        
        # Log successful login
        audit_log = AuditLog(
            action="LOGIN",
            user_email=user.email,
            user_id=user.id,
            ip_address=client_ip
        )
        db.add(audit_log)
        db.commit()
        
        logger.info(f"Login success: email={user.email}")
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during login. Please try again.",
        )

@router.post("/refresh", response_model=Token)
def refresh_token(refresh_token_str: str, db: Session = Depends(get_db)):
    """Refresh access token using refresh token."""
    try:
        payload = jwt.decode(refresh_token_str, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        email: str = payload.get("sub")
        
        user = db.query(User).filter(User.email == email).first()
        if not user or user.token_version != payload.get("version"):
            raise HTTPException(status_code=401, detail="Token version mismatch")
        
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email, "role": user.role.value, "status": user.status.value, "version": user.token_version},
            expires_delta=access_token_expires
        )
        
        new_refresh_token = create_refresh_token(
            data={"sub": user.email, "version": user.token_version}
        )
        
        return {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer"
        }
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Logout user - increment token version to invalidate all tokens."""
    current_user.token_version += 1
    db.commit()
    
    # Log the logout action
    audit_log = AuditLog(
        action="LOGOUT",
        user_email=current_user.email,
        user_id=current_user.id
    )
    db.add(audit_log)
    db.commit()
    
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=UserOut)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user
