"""
Database migration utilities for adding missing columns.
This handles schema evolution without Alembic for MVP simplicity.
"""
import logging
from sqlalchemy import text, inspect
from app.models.base import engine
from app.core.config import settings

logger = logging.getLogger(__name__)

def run_migrations():
    """Run any pending database migrations."""
    logger.info("🔧 Checking for database migrations...")
    
    try:
        # Detect if using SQLite or PostgreSQL
        db_url = settings.DATABASE_URL
        is_sqlite = 'sqlite' in db_url.lower()
        
        with engine.begin() as conn:
            if is_sqlite:
                logger.info("ℹ️ Using SQLite database - using PRAGMA for schema inspection")
                _run_sqlite_migrations(conn)
            else:
                logger.info("ℹ️ Using PostgreSQL database - using information_schema")
                _run_postgres_migrations(conn)
        
        logger.info("✅ Database migrations completed successfully")
        return True
        
    except Exception as e:
        logger.error(f"❌ Database migration failed: {e}")
        return False

def _run_sqlite_migrations(conn):
    """Run migrations for SQLite."""
    def column_exists(table_name: str, column_name: str) -> bool:
        try:
            result = conn.execute(text(f"PRAGMA table_info({table_name})"))
            columns = {row[1] for row in result}
            return column_name in columns
        except:
            return False
    
    # Check if last_seen column exists in users table
    if not column_exists('users', 'last_seen'):
        logger.info("Adding 'last_seen' column to users table...")
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN last_seen TIMESTAMP"))
            logger.info("✅ Added 'last_seen' column")
        except Exception as e:
            logger.warning(f"⚠️ Could not add last_seen: {e}")
    
    # Check if token_version column exists
    if not column_exists('users', 'token_version'):
        logger.info("Adding 'token_version' column to users table...")
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN token_version INTEGER DEFAULT 1"))
            logger.info("✅ Added 'token_version' column")
        except Exception as e:
            logger.warning(f"⚠️ Could not add token_version: {e}")
    
    # Check if status column exists
    if not column_exists('users', 'status'):
        logger.info("Adding 'status' column to users table...")
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'PENDING'"))
            # Auto-approve existing admins
            conn.execute(text("UPDATE users SET status = 'APPROVED' WHERE role = 'ADMIN'"))
            logger.info("✅ Added 'status' column")
        except Exception as e:
            logger.warning(f"⚠️ Could not add status: {e}")

def _run_postgres_migrations(conn):
    """Run migrations for PostgreSQL."""
    def column_exists(table_name: str, column_name: str) -> bool:
        try:
            result = conn.execute(text(f"""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='{table_name}' AND column_name='{column_name}'
            """))
            return result.fetchone() is not None
        except:
            return False
    
    # Check if last_seen column exists in users table
    if not column_exists('users', 'last_seen'):
        logger.info("Adding 'last_seen' column to users table...")
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN last_seen TIMESTAMP"))
            logger.info("✅ Added 'last_seen' column")
        except Exception as e:
            logger.warning(f"⚠️ Could not add last_seen: {e}")
    
    # Check if token_version column exists
    if not column_exists('users', 'token_version'):
        logger.info("Adding 'token_version' column to users table...")
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN token_version INTEGER DEFAULT 1"))
            logger.info("✅ Added 'token_version' column")
        except Exception as e:
            logger.warning(f"⚠️ Could not add token_version: {e}")
    
    # Check if status column exists
    if not column_exists('users', 'status'):
        logger.info("Adding 'status' column to users table...")
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'PENDING'"))
            # Auto-approve existing admins
            conn.execute(text("UPDATE users SET status = 'APPROVED' WHERE role = 'ADMIN'"))
            logger.info("✅ Added 'status' column")
        except Exception as e:
            logger.warning(f"⚠️ Could not add status: {e}")
