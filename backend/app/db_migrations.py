"""
Database migration utilities for adding missing columns.
This handles schema evolution without Alembic for MVP simplicity.
"""
import logging
from sqlalchemy import text
from app.models.base import engine

logger = logging.getLogger(__name__)

def run_migrations():
    """Run any pending database migrations."""
    logger.info("🔧 Checking for database migrations...")
    
    try:
        with engine.begin() as conn:
            # Check if last_seen column exists in users table
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='users' AND column_name='last_seen'
            """))
            
            if result.fetchone() is None:
                logger.info("Adding 'last_seen' column to users table...")
                conn.execute(text("""
                    ALTER TABLE users 
                    ADD COLUMN last_seen TIMESTAMP
                """))
                logger.info("✅ Added 'last_seen' column")
            
            # Check if token_version column exists
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='users' AND column_name='token_version'
            """))
            
            if result.fetchone() is None:
                logger.info("Adding 'token_version' column to users table...")
                conn.execute(text("""
                    ALTER TABLE users 
                    ADD COLUMN token_version INTEGER DEFAULT 1
                """))
                logger.info("✅ Added 'token_version' column")

            # Check if status column exists
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='users' AND column_name='status'
            """))
            
            if result.fetchone() is None:
                logger.info("Adding 'status' column to users table...")
                conn.execute(text("""
                    ALTER TABLE users 
                    ADD COLUMN status VARCHAR(20) DEFAULT 'PENDING'
                """))
                # Auto-approve existing admins
                conn.execute(text("""
                    UPDATE users 
                    SET status = 'APPROVED' 
                    WHERE role = 'ADMIN'
                """))
                logger.info("✅ Checked 'status' column")

            # Check and add columns for expenses and incomes explicitly
            # Using a more robust check for PostgreSQL
            for table in ['expenses', 'incomes']:
                for col in ['creator_id', 'workspace_id']:
                    try:
                        # Check if column exists
                        result = conn.execute(text(f"""
                            SELECT 1 
                            FROM information_schema.columns 
                            WHERE table_name = '{table}' AND column_name = '{col}'
                        """))
                        
                        if result.fetchone() is None:
                            logger.info(f"🚀 Migration: Adding column '{col}' to table '{table}'...")
                            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} INTEGER"))
                            logger.info(f"✅ Successfully added '{col}' to '{table}'")
                        else:
                            logger.info(f"ℹ️ Column '{col}' already exists in '{table}'")
                    except Exception as col_error:
                        logger.warning(f"⚠️ Could not add {col} to {table}: {col_error}")
            
            # Alter expenses category to String to allow custom categories
            try:
                # Check if category is enum (this is complex, so we just attempt alter)
                # For PostgreSQL
                conn.execute(text("ALTER TABLE expenses ALTER COLUMN category TYPE VARCHAR(255)"))
                logger.info("✅ Altered expenses category to VARCHAR")
            except Exception as e:
                logger.warning(f"⚠️ Could not alter category column (might already be string or SQLite): {e}")

        logger.info("✅ Database migrations completed successfully")
        return True
        
    except Exception as e:
        logger.error(f"❌ Database migration failed: {e}")
        return False
