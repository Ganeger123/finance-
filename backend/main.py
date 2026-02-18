import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .database import engine, Base
from .routes import auth, transaction, admin, assistant, profile, ai, websocket_routes
# Import models to ensure they're registered with the database
from .models import user, transaction as transaction_model, logs
from .config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create database tables
# In a real production app, we would use Alembic for migrations
Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.PROJECT_NAME)

# CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Static Files for Media
app.mount("/media", StaticFiles(directory="backend/media"), name="media")

# Include Routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(transaction.router, prefix="/api", tags=["Transactions"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(assistant.router, prefix="/api/assistant", tags=["Assistant"])
app.include_router(profile.router, prefix="/api/profile", tags=["Profile"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI"])
app.include_router(websocket_routes.router, prefix="/api", tags=["WebSocket"])

@app.get("/")
def read_root():
    return {"status": "FinCore backend running (Python/FastAPI)"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
