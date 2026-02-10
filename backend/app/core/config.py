import os
from pydantic_settings import BaseSettings, SettingsConfigDict
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
    BACKEND_CORS_ORIGINS: str = (
        "https://panace-web.onrender.com,https://panace-api.onrender.com,"
        "http://localhost:3000,http://localhost:5173,http://localhost:3005,"
        "http://127.0.0.1:3000,http://127.0.0.1:5173,http://127.0.0.1:3005,"
        "http://localhost:4173,http://127.0.0.1:4173"
    )

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins_list(self) -> list[str]:
        """CORS origins as list with Render production URLs ALWAYS included."""
        # Critical production URLs that must always be included
        critical_origins = [
            "https://panace-web.onrender.com",
            "https://panace-api.onrender.com",
        ]
        
        # Parse configured origins
        parsed = _parse_cors_origins(self.BACKEND_CORS_ORIGINS)
        
        # Ensure all critical origins are included
        result = []
        for origin in critical_origins:
            if origin not in result:
                result.append(origin)
        
        for origin in parsed:
            if origin not in result and origin not in critical_origins:
                result.append(origin)
        
        return result if result else critical_origins

    @property
    def sync_database_url(self) -> str:
        if self.DATABASE_URL.startswith("postgres://"):
            return self.DATABASE_URL.replace("postgres://", "postgresql://", 1)
        return self.DATABASE_URL

settings = Settings()

