from fastapi import APIRouter, Depends, HTTPException, status, Form, Request
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from typing import Optional
import logging
from ..database import get_db
from ..schemas import auth as auth_schema
from ..services import crud, auth as auth_service
from ..services.email import EmailService
from ..config import settings
from ..models import user as user_model

logger = logging.getLogger(__name__)

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
def register(user: auth_schema.UserCreate, db: Session = Depends(get_db), request: Request = None):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    created_user = crud.create_user(db=db, user=user)
    
    # Send registration email
    user_name = user.name or user.email.split('@')[0]
    EmailService.send_registration_email(user.email, user_name)
    
    # Log the registration
    ip_address = request.client.host if request else None
    crud.create_system_log(
        db=db,
        user_id=created_user.id,
        action="user_registered",
        details=f"User registered with email {user.email}",
        ip_address=ip_address
    )
    
    return created_user

@router.post("/login", response_model=auth_schema.Token)
async def login(
    request: Request,
    db: Session = Depends(get_db),
    # Support JSON
    user_in: Optional[auth_schema.UserLogin] = None,
    # Support Form (apiClient.ts uses URLSearchParams with username/email)
    email: Optional[str] = Form(None),
    password: Optional[str] = Form(None),
    username: Optional[str] = Form(None),
):
    """
    Secure login endpoint - handles both JSON and Form-data.
    Returns proper error responses instead of 500 errors.
    """
    try:
        # ========== STEP 1: Extract credentials ==========
        login_email = None
        login_password = None

        # Priority 1: Form data (URLSearchParams from apiClient.ts)
        if (email or username) and password:
            login_email = email or username
            login_password = password
            logger.debug(f"Login attempt via Form with email: {login_email}")
        
        # Priority 2: JSON body
        elif user_in and user_in.email and user_in.password:
            login_email = user_in.email
            login_password = user_in.password
            logger.debug(f"Login attempt via JSON with email: {login_email}")
        
        # Priority 3: Manual parsing
        else:
            try:
                content_type = request.headers.get("content-type", "").lower()
                if "application/json" in content_type:
                    body = await request.json()
                    login_email = body.get("email") or body.get("username")
                    login_password = body.get("password")
                    logger.debug(f"Login attempt via manual JSON parse: {login_email}")
                elif "application/x-www-form-urlencoded" in content_type:
                    form = await request.form()
                    login_email = form.get("email") or form.get("username")
                    login_password = form.get("password")
                    logger.debug(f"Login attempt via manual form parse: {login_email}")
            except Exception as parse_err:
                logger.warning(f"Failed to parse request body: {parse_err}")
                pass

        # ========== STEP 2: Validate credentials provided ==========
        if not login_email or not login_password:
            logger.warning("Login rejected: Missing email or password")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email and password required"
            )

        # Normalize email
        login_email = login_email.strip().lower()
        login_password = login_password.strip()

        # ========== STEP 3: Find user in database ==========
        try:
            user = crud.get_user_by_email(db, email=login_email)
        except Exception as db_err:
            logger.error(f"Database error fetching user: {db_err}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database error - please try again"
            )

        if not user:
            logger.warning(f"Login rejected: User not found for email: {login_email}")
            # Security: Don't reveal whether email exists
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        # ========== STEP 4: Verify password ==========
        try:
            password_valid = auth_service.verify_password(login_password, user.password)
        except Exception as pwd_err:
            logger.error(f"Password verification error: {pwd_err}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        if not password_valid:
            logger.warning(f"Login rejected: Invalid password for user: {login_email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        # ========== STEP 5: Check account status ==========
        if user.status != "approved":
            logger.warning(f"Login rejected: Account status '{user.status}' for user: {login_email}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Account is {user.status}. Please contact support."
            )

        # ========== STEP 6: Create JWT token ==========
        try:
            if not settings.SECRET_KEY:
                logger.error("SECRET_KEY not configured!")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Server configuration error"
                )

            access_token = auth_service.create_access_token(
                data={
                    "sub": user.email,
                    "id": user.id,
                    "role": user.role,
                    "status": user.status
                }
            )
            logger.info(f"Login successful for user: {login_email}")
        except Exception as jwt_err:
            logger.error(f"JWT token creation failed: {jwt_err}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Token creation failed"
            )

        # ========== STEP 7: Send notifications (optional, don't fail if error) ==========
        try:
            user_name = user.name or user.email.split('@')[0]
            ip_address = request.client.host if request and request.client else "unknown"
            
            # Send async email (fire and forget)
            try:
                EmailService.send_login_email(user.email, user_name, ip_address)
            except Exception as email_err:
                logger.warning(f"Failed to send login email: {email_err}")
            
            # Log the login event
            try:
                crud.create_system_log(
                    db=db,
                    user_id=user.id,
                    action="user_login",
                    details=f"User logged in from {ip_address}",
                    ip_address=ip_address
                )
            except Exception as log_err:
                logger.warning(f"Failed to create login log: {log_err}")
        except Exception as notify_err:
            logger.warning(f"Non-critical notification error: {notify_err}")
            # Don't fail the login if email/logging fails

        # ========== STEP 8: Return token ==========
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "refresh_token": None  # Optional: implement refresh token if needed
        }

    except HTTPException:
        # Re-raise HTTP exceptions (intentional errors)
        raise
    except Exception as unhandled_err:
        # Catch ALL unhandled exceptions and return 500 with logging
        logger.critical(f"Unhandled error in login endpoint: {unhandled_err}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed - server error"
        )

@router.get("/me", response_model=auth_schema.UserResponse)
def read_users_me(current_user: user_model.User = Depends(get_current_user)):
    return current_user

@router.post("/logout")
def logout(
    request: Request,
    current_user: user_model.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Handle user logout - send notification and log the action
    """
    user_name = current_user.name or current_user.email.split('@')[0]
    ip_address = request.client.host if request else None
    
    # Send logout notification email
    EmailService.send_logout_email(current_user.email, user_name)
    
    # Log the logout
    crud.create_system_log(
        db=db,
        user_id=current_user.id,
        action="user_logout",
        details=f"User logged out",
        ip_address=ip_address
    )
    
    return {"message": "Logged out successfully"}
