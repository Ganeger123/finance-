from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.models.base import get_db
from app.models.workspace import Workspace
from app.models.user import User
from app.schemas.workspace import WorkspaceCreate, WorkspaceOut, WorkspaceUpdate
from app.api.deps import get_current_user, require_approved_user

router = APIRouter()

@router.post("/", response_model=WorkspaceOut)
def create_workspace(
    workspace_in: WorkspaceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_approved_user)
):
    # Check if slug exists
    if db.query(Workspace).filter(Workspace.slug == workspace_in.slug).first():
        raise HTTPException(status_code=400, detail="Workspace with this slug already exists")
    
    db_workspace = Workspace(
        name=workspace_in.name,
        slug=workspace_in.slug,
        owner_id=current_user.id
    )
    db.add(db_workspace)
    db.commit()
    db.refresh(db_workspace)
    return db_workspace

@router.get("/", response_model=List[WorkspaceOut])
def read_workspaces(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_approved_user)
):
    return db.query(Workspace).all()

@router.get("/{workspace_id}", response_model=WorkspaceOut)
def read_workspace(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_workspace = db.query(Workspace).filter(
        Workspace.id == workspace_id, 
        Workspace.owner_id == current_user.id
    ).first()
    if not db_workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return db_workspace

@router.delete("/{workspace_id}")
def delete_workspace(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_workspace = db.query(Workspace).filter(
        Workspace.id == workspace_id, 
        Workspace.owner_id == current_user.id
    ).first()
    if not db_workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    db.delete(db_workspace)
    db.commit()
    return {"message": "Workspace deleted successfully"}
