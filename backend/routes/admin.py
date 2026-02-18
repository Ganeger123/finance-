from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..schemas import auth as auth_schema
from ..services import crud, auth as auth_service
from ..services.email import EmailService
from .auth import require_role, get_current_user
from ..models import user as user_model

router = APIRouter()

@router.get("/users/", response_model=auth_schema.UsersListResponse)
def read_users(
    status: Optional[str] = None, 
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db), 
    admin: user_model.User = Depends(require_role("admin"))
):
    """
    List users with optional status filter. Admin only.
    """
    users = crud.get_users(db, skip=skip, limit=limit, status=status)
    return {"users": users}

@router.post("/users/{user_id}/approve", response_model=auth_schema.UserResponse)
def approve_user(
    user_id: int, 
    db: Session = Depends(get_db), 
    admin: user_model.User = Depends(require_role("admin")),
    request: Request = None
):
    """
    Approve a pending user. Admin only.
    """
    user = crud.update_user_status(db, user_id=user_id, status="approved")
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Send approval email
    user_name = user.name or user.email.split('@')[0]
    EmailService.send_account_approved_email(user.email, user_name)
    
    # Log the action
    ip_address = request.client.host if request else None
    crud.create_system_log(
        db=db,
        user_id=admin.id,
        action="user_approved",
        details=f"Admin approved user {user.email}",
        ip_address=ip_address
    )
    
    return user

@router.post("/users/{user_id}/reject", response_model=auth_schema.UserResponse)
def reject_user(
    user_id: int, 
    db: Session = Depends(get_db), 
    admin: user_model.User = Depends(require_role("admin")),
    request: Request = None
):
    """
    Reject a user. Admin only.
    """
    user = crud.update_user_status(db, user_id=user_id, status="rejected")
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Log the action
    ip_address = request.client.host if request else None
    crud.create_system_log(
        db=db,
        user_id=admin.id,
        action="user_rejected",
        details=f"Admin rejected user {user.email}",
        ip_address=ip_address
    )
    
    return user

@router.post("/users/{user_id}/delete", response_model=dict)
def delete_user(
    user_id: int, 
    db: Session = Depends(get_db), 
    admin: user_model.User = Depends(require_role("admin")),
    request: Request = None
):
    """
    Delete a user (admin only). This is a destructive operation.
    """
    user = db.query(user_model.User).filter(user_model.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_email = user.email
    crud.delete_user(db, user_id=user_id)
    
    # Log the deletion
    ip_address = request.client.host if request else None
    crud.create_system_log(
        db=db,
        user_id=admin.id,
        action="user_deleted",
        details=f"Admin deleted user {user_email}",
        ip_address=ip_address
    )
    
    return {"message": f"User {user_email} has been deleted"}

@router.post("/users/{user_id}/reset-password", response_model=dict)
def reset_user_password(
    user_id: int,
    new_password: str,
    db: Session = Depends(get_db),
    admin: user_model.User = Depends(require_role("admin")),
    request: Request = None
):
    """
    Reset a user's password (admin only).
    """
    user = db.query(user_model.User).filter(user_model.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Hash the new password
    hashed_password = auth_service.get_password_hash(new_password)
    user.password = hashed_password
    db.commit()
    db.refresh(user)
    
    # Send password reset notification
    user_name = user.name or user.email.split('@')[0]
    EmailService.send_password_changed_email(user.email, user_name)
    
    # Log the action
    ip_address = request.client.host if request else None
    crud.create_system_log(
        db=db,
        user_id=admin.id,
        action="password_reset",
        details=f"Admin reset password for user {user.email}",
        ip_address=ip_address
    )
    
    return {"message": f"Password reset for {user.email}"}

@router.patch("/users/{user_id}/status", response_model=auth_schema.UserResponse)
def update_status(
    user_id: int, 
    update: auth_schema.UserStatusUpdate,
    db: Session = Depends(get_db), 
    admin: user_model.User = Depends(require_role("admin"))
):
    """
    Manually update user status. Admin only.
    """
    user = crud.update_user_status(db, user_id=user_id, status=update.status)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.get("/logs", response_model=List[dict])
def get_logs(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    admin: user_model.User = Depends(require_role("admin"))
):
    """
    Get system logs. Admin only.
    """
    logs = crud.get_system_logs(db, skip=skip, limit=limit)
    return [
        {
            "id": log.id,
            "user_id": log.user_id,
            "action": log.action,
            "details": log.details,
            "ip_address": log.ip_address,
            "timestamp": log.timestamp.isoformat() if hasattr(log, 'timestamp') else None
        }
        for log in logs
    ]
