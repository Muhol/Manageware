from sqlalchemy.orm import Session
from .. import models

def create_audit_log(db: Session, user_id: str = None, action: str = "ACTION", resource_type: str = "RESOURCE", resource_id: str = "ID", details: str = None):
    db_log = models.AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details
    )
    db.add(db_log)
    db.commit()
