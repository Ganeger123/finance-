from fastapi import APIRouter, Depends, HTTPException, status, Form, Request
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from typing import Optional
from ..database import get_db
from ..schemas import auth as auth_schema
from ..services import crud, auth as auth_service
from ..config import settings
from ..models import user as user_model

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = crud.get_user_by_email(db, email=email)
    if user is None:
        raise credentials_exception
    return user

def require_role(role: str):
    def role_checker(current_user: user_model.User = Depends(get_current_user)):
        if current_user.role != role and current_user.role != "super_admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted"
            )
        return current_user
    return role_checker

@router.post("/register", response_model=auth_schema.UserResponse)
def register(user: auth_schema.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db=db, user=user)

@router.post("/login", response_model=auth_schema.Token)
async def login(
    request: Request,
    db: Session = Depends(get_db),
    # Support JSON
    user_in: Optional[auth_schema.UserLogin] = None,
    # Support Form (apiClient.ts)
    email: Optional[str] = Form(None),
    password: Optional[str] = Form(None)
):
    """
    Handles login from both JSON body and Form-data.
    """
    login_email = None
    login_password = None

    # Check Form data first (apiClient.ts uses URLSearchParams)
    if email and password:
        login_email = email
        login_password = password
    # Fallback to JSON body
    elif user_in:
        login_email = user_in.email
        login_password = user_in.password
    else:
        # If neither, try manual parsing for safety
        try:
            content_type = request.headers.get("content-type", "")
            if "application/json" in content_type:
                body = await request.json()
                login_email = body.get("email")
                login_password = body.get("password")
            elif "application/x-www-form-urlencoded" in content_type:
                form = await request.form()
                login_email = form.get("email")
                login_password = form.get("password")
        except Exception:
            pass

    if not login_email or not login_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and password required"
        )

    user = crud.get_user_by_email(db, email=login_email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not auth_service.verify_password(login_password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if user.status != "approved":
        raise HTTPException(status_code=403, detail="Account not approved")

    access_token = auth_service.create_access_token(
        data={"sub": user.email, "id": user.id, "role": user.role}
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=auth_schema.UserResponse)
def read_users_me(current_user: user_model.User = Depends(get_current_user)):
    return current_user
