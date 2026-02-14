from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from ..database import get_db
from ..schemas import auth as auth_schema
from ..services import crud, auth as auth_service
from ..config import settings
from ..models import user as user_model

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
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

@router.post("/register", response_model=auth_schema.UserResponse)
def register(user: auth_schema.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db=db, user=user)

@router.post("/login", response_model=auth_schema.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Note: OAuth2PasswordRequestForm expects 'username' field, which is email in our case
    user = crud.get_user_by_email(db, email=form_data.username) # form_data.username will match the 'email' sent if frontend uses FormData, 
    # BUT existing frontend sends JSON {email, password}. 
    # FastAPI's OAuth2PasswordRequestForm expects form-data.
    # To support JSON login as per JS backend commonly used, we might need a separate schema. 
    # Let's check the JS backend again. It accepts JSON.
    # So we should probably use a Pydantic model for login instead of OAuth2PasswordRequestForm if we want to match exact JS behavior.
    pass

# Re-implementing login to accept JSON body to match JS backend
@router.post("/login/json", response_model=auth_schema.Token) 
def login_json(user_credentials: auth_schema.UserLogin, db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, email=user_credentials.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not auth_service.verify_password(user_credentials.password, user.password):
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

# We also need the standard /login endpoint that apiClient might be using if it was updated or if we want to be safe.
# Actually apiClient.ts uses: api.post('/auth/login', data, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
# Wait, looking at apiClient.ts line 110: 
# login: (data: URLSearchParams) => api.post('/auth/login', data, ... application/x-www-form-urlencoded)
# So it IS sending form data! 
# So OAuth2PasswordRequestForm is actually correct for the 'username' field, IF the frontend sends 'username' key.
# But apiClient.ts might be sending 'email' key in the URLSearchParams.
# Let's check `backend/routes/auth.js`: const { email, password } = req.body;
# And `server.js` uses `express.json()`, and `auth.js` pulls from `req.body`.
# The apiClient sends x-www-form-urlencoded. Express parses that too if configured, but server.js ONLY has `app.use(express.json())`. 
# This is a potential existing bug or mismatch I'm seeing. 
# If server.js only assumes JSON, and apiClient sends FormURL, it might fail UNLESS axios automatically serializes to JSON if we pass an object, 
# BUT `data: URLSearchParams` type hint implies it's form data.
# However, the user said "Preserve existing functionality".
# I will implement a generic login that handles JSON input primarily as that is what `server.js` expects (`req.body`). 
# Since I am using FastAPI, I can handle both or just one. obtain_token via OAuth2 usually expects form data.
# I will implement the JSON login at `/login` to match `server.js` logic which expects `req.body.email`.

@router.post("/login", response_model=auth_schema.Token)
def login_main(
    user_credentials: auth_schema.UserLogin, 
    db: Session = Depends(get_db)
):
    return login_json(user_credentials, db)

@router.get("/me", response_model=auth_schema.UserResponse)
def read_users_me(current_user: user_model.User = Depends(get_current_user)):
    return current_user
