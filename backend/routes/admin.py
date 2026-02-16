from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..schemas import auth as auth_schema
from ..services import crud
from .auth import require_role
from ..models import user as user_model

router = APIRouter()

@router.get("/users/", response_model=List[auth_schema.UserResponse])
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
    return crud.get_users(db, skip=skip, limit=limit, status=status)

@router.post("/users/{user_id}/approve", response_model=auth_schema.UserResponse)
def approve_user(
    user_id: int, 
    db: Session = Depends(get_db), 
    admin: user_model.User = Depends(require_role("admin"))
):
    """
    Approve a pending user. Admin only.
    """
    user = crud.update_user_status(db, user_id=user_id, status="approved")
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.post("/users/{user_id}/reject", response_model=auth_schema.UserResponse)
def reject_user(
    user_id: int, 
    db: Session = Depends(get_db), 
    admin: user_model.User = Depends(require_role("admin"))
):
    """
    Reject a user. Admin only.
    """
    user = crud.update_user_status(db, user_id=user_id, status="rejected")
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

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
