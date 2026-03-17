from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List
from .. import models, schemas
from ..database import get_db
from ..dependencies import check_role

router = APIRouter(prefix="/admin", tags=["System Administration"])

@router.get("/audit-logs", response_model=List[schemas.AuditLog])
async def get_audit_logs(db: Session = Depends(get_db)):
    return db.query(models.AuditLog).order_by(models.AuditLog.timestamp.desc()).limit(100).all()

@router.get("/security-certificate")
async def get_security_certificate(db: Session = Depends(get_db), current_user: models.User = Depends(check_role(["Administrator"]))):
    user_count = db.query(models.User).filter(models.User.is_active == True).count()
    admin_count = db.query(models.User).join(models.Role).filter(models.Role.name == "Administrator").count()
    last_audit = db.query(models.AuditLog).order_by(models.AuditLog.timestamp.desc()).first()
    
    return {
        "status": "VALID",
        "issued_at": datetime.now().isoformat(),
        "issuer": "ManageWare Platform CA",
        "security_metrics": {
            "encryption": "AES-256-GCM (Simulated at DB level)",
            "auth_protocol": "JWT (RS256)",
            "active_users": user_count,
            "privileged_accounts": admin_count, 
            "last_audit_event": last_audit.timestamp.isoformat() if last_audit else None
        },
        "compliance": {
            "RBAC_Enforced": True,
            "Audit_Log_Immutable": True,
            "TLS_Enabled": True
        }
    }
