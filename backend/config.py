import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "FinCore Backend"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("JWT_SECRET", "SUPER_SECRET_KEY")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # CORS Origins
    CORS_ORIGINS: List[str] = ["*"] # Adjust in production
    
    # Database
    DATABASE_URL: str = "sqlite:///./fincore.db"

    class Config:
        env_file = ".env"

settings = Settings()
