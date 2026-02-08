from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.models.base import get_db
from app.models.user import User, UserRole, UserStatus
from app.schemas.user import UserOut, UserUpdate, UserPasswordReset
from app.api.deps import get_current_user, get_current_active_admin
from app.auth.security import get_password_hash

router = APIRouter()

@router.get("/", response_model=List[UserOut])
def read_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_admin)
):
    return db.query(User).all()

@router.get("/pending", response_model=List[UserOut])
def get_pending_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_admin)
):
    """Admin only: Get all pending users."""
    return db.query(User).filter(User.status == UserStatus.PENDING).all()

@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can update users")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user_in.full_name is not None:
        user.full_name = user_in.full_name
    if user_in.role is not None:
        # Prevent admin from removing their own admin role
        if user.id == current_user.id and user_in.role != UserRole.ADMIN:
             raise HTTPException(status_code=400, detail="Admins cannot remove their own administrator role")
        user.role = user_in.role
    if user_in.status is not None:
        user.status = user_in.status
        
    db.commit()
    db.refresh(user)
    return user

@router.post("/{user_id}/approve")
def approve_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_admin)
):
    """Admin only: Approve a pending user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.status = UserStatus.APPROVED
    db.commit()
    return {"message": f"User {user.email} approved successfully"}

@router.post("/{user_id}/reject")
def reject_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_admin)
):
    """Admin only: Reject a pending user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.status = UserStatus.REJECTED
    # Optional: Invalidate old tokens if they exist
    user.token_version += 1
    db.commit()
    return {"message": f"User {user.email} rejected"}

@router.post("/{user_id}/reset-password")
def reset_password(
    user_id: int,
    password_in: UserPasswordReset,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can reset passwords")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.hashed_password = get_password_hash(password_in.new_password)
    # Invalidate all existing sessions on password reset
    user.token_version += 1
    
    db.commit()
    return {"message": "Password reset successfully and all sessions invalidated"}

@router.post("/{user_id}/logout-everywhere")
def logout_everywhere(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can force logout")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.token_version += 1
    db.commit()
    return {"message": "User sessions invalidated successfully"}

@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can delete users"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot delete themselves"
        )
    
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}
