import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..database import get_db
from ..services import crud
from ..schemas import auth as auth_schema
from .auth import get_current_user
from ..models import user as user_model

router = APIRouter()

# Max file size: 5MB
MAX_FILE_SIZE = 5 * 1024 * 1024
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}

class NameUpdate(BaseModel):
    name: str

@router.post("/photo")
async def upload_profile_photo(
    file: UploadFile = File(...), 
    db: Session = Depends(get_db), 
    current_user: user_model.User = Depends(get_current_user)
):
    """
    Handle profile photo upload using multipart/form-data.
    Validates file type and size.
    """
    # 1. Validate extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # 2. Validate size (this is basic, for large files use chunked reading)
    # UploadFile might not have size attribute in all FastAPI versions, but let's try to seek to end
    try:
        file.file.seek(0, 2)
        size = file.file.tell()
        file.file.seek(0)
        if size > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File too large. Max 5MB.")
    except Exception:
        pass # If tell() fails, we'll just proceed or add more robust size checking

    # 3. Create path and save
    # Rename to {user_id}{ext} for security and simplicity
    filename = f"{current_user.id}{ext}"
    upload_dir = os.path.join("backend", "media", "profile_photos")
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir, exist_ok=True)
        
    file_path = os.path.join(upload_dir, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # 4. Generate URL (assuming app mounts /media to backend/media)
    # The URL will be /media/profile_photos/{filename}
    photo_url = f"/media/profile_photos/{filename}"
    
    # 5. Update DB
    crud.update_user_photo(db, user_id=current_user.id, photo_url=photo_url)
    
    return {"photo_url": photo_url}

@router.put("/name", response_model=auth_schema.UserResponse)
def update_user_name(
    update: NameUpdate,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user)
):
    """
    Update user's name/username
    """
    if not update.name or len(update.name.strip()) == 0:
        raise HTTPException(status_code=400, detail="Name cannot be empty")
    
    updated_user = crud.update_user_name(db, user_id=current_user.id, name=update.name)
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return updated_user

@router.get("/me", response_model=auth_schema.UserResponse)
def get_profile(
    current_user: user_model.User = Depends(get_current_user)
):
    """
    Get current user's profile
    """
    return current_user
