import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "FinCore Backend"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("JWT_SECRET", "your-super-secret-key-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # CORS Origins - allow frontend origins
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",      # Local dev Vite
        "http://127.0.0.1:5173",      # Local dev Vite (127.0.0.1)
        "http://localhost:8085",      # Alternative port
        "http://127.0.0.1:8085",      # Alternative port (127.0.0.1)
        "http://localhost:3000",      # Fallback
        "https://panace-web.onrender.com",  # Production frontend
    ]
    
    # Database
    DATABASE_URL: str = "sqlite:///./fincore.db"
    
    # Email Configuration
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "noreply@panace.com")
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "lindamorency123@gmail.com")

    class Config:
        env_file = ".env"

settings = Settings()
