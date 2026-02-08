from fastapi import Depends, HTTPException, status
from typing import List, Optional
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.base import get_db
from app.models.user import User, UserRole, UserStatus
from app.schemas.auth import TokenData

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

from datetime import datetime

def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "access":
            raise credentials_exception
        email: str = payload.get("sub")
        version: Optional[int] = payload.get("version")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.email == token_data.email).first()
    if user is None:
        raise credentials_exception
        
    # Check token version (backward compatible)
    if version is not None and version != user.token_version:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token version mismatch. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # Update last seen
    user.last_seen = datetime.utcnow()
    db.commit()
    
    return user

def get_current_active_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user does not have enough privileges"
        )
    return current_user

# Alias for backward compatibility/consistency with vendors.py
require_admin = get_current_active_admin

def require_approved_user(current_user: User = Depends(get_current_user)) -> User:
    """Ensure user is approved before accessing protected resources. Admins are exempt."""
    if current_user.role != UserRole.ADMIN and current_user.status != UserStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is pending approval. Please contact an administrator."
        )
    return current_user

from app.services.audit import AuditService
from fastapi import Request

def get_audit_logger(
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    def log(action: str, resource_type: str, resource_id: str = None, details: dict = None):
        user_id = current_user.id if current_user else None
        ip = request.client.host
        return AuditService.log_action(db, user_id, action, resource_type, resource_id, details, ip)
    return log

def get_user_workspace(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_approved_user)
) -> int:
    """Resolve the user's workspace ID, creating a default one if none exists."""
    from app.models.workspace import Workspace
    
    # Try to find an existing workspace owned by the user
    workspace = db.query(Workspace).filter(Workspace.owner_id == current_user.id).first()
    
    if not workspace:
        # Create a default workspace
        user_slug = current_user.email.split('@')[0].lower() + "-" + str(current_user.id)
        workspace = Workspace(
            name=f"{current_user.full_name or 'My'}'s Workspace",
            slug=user_slug,
            owner_id=current_user.id
        )
        db.add(workspace)
        db.commit()
        db.refresh(workspace)
        
    return workspace.id
