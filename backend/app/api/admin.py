import logging
from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from sqlalchemy.orm import Session
from app.models.base import get_db
from app.models.user import User, UserStatus, UserRole
from app.schemas.user import UserOut
from app.api.deps import get_current_user, require_admin, require_super_admin
from app.services.email import send_approval_email, send_rejection_email
from app.models.audit import AuditLog

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/pending-users", response_model=list[UserOut])
def get_pending_users(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Get all pending users (waiting for approval)."""
    pending_users = db.query(User).filter(User.status == UserStatus.PENDING).all()
    return pending_users

@router.get("/all-users", response_model=list[UserOut])
def get_all_users(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Get all users (admin only)."""
    users = db.query(User).all()
    return users

@router.post("/approve/{user_id}")
def approve_user(
    user_id: int,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Approve a pending user account."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.status == UserStatus.APPROVED:
        raise HTTPException(status_code=400, detail="User is already approved")
    
    user.status = UserStatus.APPROVED
    db.commit()
    
    # Log the approval action
    client_ip = request.client.host if request.client else "unknown"
    audit_log = AuditLog(
        action="APPROVE_USER",
        user_email=admin.email,
        user_id=admin.id,
        ip_address=client_ip,
        details=f"Admin approved user {user.email}"
    )
    db.add(audit_log)
    db.commit()
    
    # Send approval email in background
    background_tasks.add_task(send_approval_email, user.email, user.full_name)
    
    logger.info(f"User {user.email} approved by {admin.email}")
    return {"message": f"User {user.email} has been approved"}

@router.post("/reject/{user_id}")
def reject_user(
    user_id: int,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Reject a pending user account."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.status != UserStatus.PENDING:
        raise HTTPException(status_code=400, detail="Can only reject pending users")
    
    user.status = UserStatus.REJECTED
    db.commit()
    
    # Log the rejection action
    client_ip = request.client.host if request.client else "unknown"
    audit_log = AuditLog(
        action="REJECT_USER",
        user_email=admin.email,
        user_id=admin.id,
        ip_address=client_ip,
        details=f"Admin rejected user {user.email}"
    )
    db.add(audit_log)
    db.commit()
    
    # Send rejection email in background
    background_tasks.add_task(send_rejection_email, user.email, user.full_name)
    
    logger.info(f"User {user.email} rejected by {admin.email}")
    return {"message": f"User {user.email} has been rejected"}

@router.post("/create-admin/{user_id}")
def create_admin(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    super_admin: User = Depends(require_super_admin)
):
    """Create an admin user (super_admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.role == UserRole.ADMIN:
        raise HTTPException(status_code=400, detail="User is already an admin")
    
    user.role = UserRole.ADMIN
    db.commit()
    
    # Log the action
    client_ip = request.client.host if request.client else "unknown"
    audit_log = AuditLog(
        action="CREATE_ADMIN",
        user_email=super_admin.email,
        user_id=super_admin.id,
        ip_address=client_ip,
        details=f"Super admin promoted user {user.email} to admin"
    )
    db.add(audit_log)
    db.commit()
    
    logger.info(f"User {user.email} promoted to admin by {super_admin.email}")
    return {"message": f"User {user.email} is now an admin"}

@router.get("/audit-logs")
def get_audit_logs(
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Get audit logs (admin only)."""
    logs = db.query(AuditLog).order_by(
        AuditLog.timestamp.desc()
    ).limit(limit).offset(offset).all()
    
    total = db.query(AuditLog).count()
    
    return {
        "logs": logs,
        "total": total,
        "limit": limit,
        "offset": offset
    }

@router.post("/deactivate-user/{user_id}")
def deactivate_user(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Deactivate a user account."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if admin.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        if admin.id != user_id:  # Users can only deactivate their own account
            raise HTTPException(status_code=403, detail="Cannot deactivate other users")
    
    user.is_active = False
    db.commit()
    
    # Log the action
    client_ip = request.client.host if request.client else "unknown"
    audit_log = AuditLog(
        action="DEACTIVATE_USER",
        user_email=admin.email,
        user_id=admin.id,
        ip_address=client_ip,
        details=f"User {user.email} deactivated"
    )
    db.add(audit_log)
    db.commit()
    
    return {"message": f"User {user.email} has been deactivated"}
