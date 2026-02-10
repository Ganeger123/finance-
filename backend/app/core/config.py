import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import Optional, Union

def _parse_cors_origins(v: Union[list[str], str]) -> list[str]:
    """Parse CORS origins from env: support list or comma-separated string (e.g. on Render)."""
    if isinstance(v, list):
        return [x.strip() for x in v if x and isinstance(x, str)]
    if isinstance(v, str):
        return [x.strip() for x in v.split(",") if x.strip()]
    return []

class Settings(BaseSettings):
    PROJECT_NAME: str = "Panacée Financial Management"
    SECRET_KEY: str = "your-super-secret-key-change-it-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    DATABASE_URL: str = "sqlite:///./finance.db"
    
    # Email Settings
    SMTP_TLS: bool = True
    SMTP_PORT: int = 587
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_USER: str = "hachllersocials@gmail.com"
    SMTP_PASSWORD: Optional[str] = None
    EMAILS_FROM_EMAIL: str = "hachllersocials@gmail.com"
    EMAILS_FROM_NAME: str = "Panacée FinSys"
    
    # CORS: list or comma-separated string from env (e.g. Render)
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
        "http://127.0.0.1:5173",
        "http://0.0.0.0:3000",
        "http://0.0.0.0:3001",
        "http://0.0.0.0:3002",
        "http://0.0.0.0:5173",
        "https://panace-web.onrender.com",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[list[str], str]) -> list[str]:
        return _parse_cors_origins(v) if v else []

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def sync_database_url(self) -> str:
        if self.DATABASE_URL.startswith("postgres://"):
            return self.DATABASE_URL.replace("postgres://", "postgresql://", 1)
        return self.DATABASE_URL

settings = Settings()
