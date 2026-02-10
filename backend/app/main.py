import time
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.core.config import settings
import os

from app.api import auth, expenses, income, dashboard, workspaces, forms, users, reports, vendors
from app.models.base import engine, Base, SessionLocal, get_db
# Import all models to ensure they are registered with Base.metadata
from app.models.user import User, UserRole, UserStatus
from app.models.workspace import Workspace
from app.models.expense import Expense
from app.models.income import Income
from app.models.form_builder import ExpenseForm, ExpenseField, ExpenseEntry
from app.auth.security import get_password_hash
from app.db_migrations import run_migrations

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_db():
    """Initialize database and create tables with retry logic."""
    max_retries = 5
    retry_delay = 5
    
    for i in range(max_retries):
        try:
            logger.info(f"Database initialization attempt {i+1}/{max_retries}...")
            Base.metadata.create_all(bind=engine)
            
            # Create default admin user if not exists
            db = SessionLocal()
            try:
                if not db.query(User).filter(User.email == "hachllersocials@gmail.com").first():
                    admin_user = User(
                        email="hachllersocials@gmail.com",
                        hashed_password=get_password_hash("12122007"),
                        full_name="Administrator",
                        role=UserRole.ADMIN,
                        status=UserStatus.APPROVED
                    )
                    db.add(admin_user)
                    db.commit()
                    logger.info("Default admin user created.")
                
                if not db.query(User).filter(User.email == "staff@finsys.ht").first():
                    staff_user = User(
                        email="staff@finsys.ht",
                        hashed_password=get_password_hash("staff123"),
                        full_name="Staff User",
                        role=UserRole.STANDARD
                    )
                    db.add(staff_user)
                    db.commit()
                    logger.info("Default staff user created.")
            finally:
                db.close()
                
            logger.info("Database initialization successful.")
            return True
        except Exception as e:
            logger.error(f"Database initialization failed: {e}")
            if i < max_retries - 1:
                logger.info(f"Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
            else:
                logger.error("Max retries reached. Database initialization failed.")
                return False

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    db_url = settings.DATABASE_URL
    masked_db = db_url.split("@")[-1] if "@" in db_url else "sqlite/local"
    logger.info(f"🚀 Starting App with DB: ...@{masked_db}")
    logger.info(f"🔒 Allowed CORS Origins: {settings.BACKEND_CORS_ORIGINS}")
    
    # Create tables first, then run migrations to add any missing columns
    init_db()
    run_migrations()
    yield
    # Shutdown logic (none needed for now)

app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)

# Routes first
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(workspaces.router, prefix="/api/workspaces", tags=["Workspaces"])
app.include_router(forms.router, prefix="/api/expense-forms", tags=["Expense Forms"])
app.include_router(expenses.router, prefix="/api/expenses", tags=["Expenses"])
app.include_router(income.router, prefix="/api/income", tags=["Income"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(users.router, prefix="/api/users", tags=["User Management"])
app.include_router(vendors.router, prefix="/api/vendors", tags=["Vendor Management"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])

@app.get("/")
def read_root():
    return {"message": f"Welcome to {settings.PROJECT_NAME} API"}

@app.get("/api/health-check")
def health_check():
    return {
        "status": "healthy",
        "cors_origins": settings.BACKEND_CORS_ORIGINS,
        "project_name": settings.PROJECT_NAME
    }

@app.get("/api/db-check")
def db_check(db: Session = Depends(get_db)):
    try:
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        return {"status": "connected", "database": "reachable"}
    except Exception as e:
        logger.error(f"❌ Database check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Database unreachable: {str(e)}")

# Request logging and exception handling
@app.middleware("http")
async def log_requests(request: Request, call_next):
    origin = request.headers.get("origin")
    logger.info(f"📡 Request: {request.method} {request.url.path} | Origin: {origin}")
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        import traceback
        logger.error(f"❌ UNHANDLED ERROR during {request.method} {request.url.path}")
        logger.error(f"Error type: {type(e).__name__}")
        logger.error(f"Error message: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

@app.middleware("http")
async def add_cors_logging(request: Request, call_next):
    origin = request.headers.get("origin")
    logger.info(f"Origin: {origin}")
    response = await call_next(request)
    return response
