from sqlalchemy.orm import Session
from app.models.audit import AuditLog
from typing import Dict, Any, Optional

class AuditService:
    @staticmethod
    def log_action(
        db: Session,
        user_id: Optional[int],
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None
    ):
        """
        Create a new audit log entry.
        """
        try:
            log_entry = AuditLog(
                user_id=user_id,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                details=details,
                ip_address=ip_address
            )
            db.add(log_entry)
            db.commit()
            return log_entry
        except Exception as e:
            # Audit logging should ideally not fail the main request, but we should log the error
            print(f"Failed to create audit log: {e}")
            db.rollback()
