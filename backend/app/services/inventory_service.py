from sqlalchemy.orm import Session
from .. import models
from .audit_service import create_audit_log

def sync_inventory(db: Session, asset_type_id: str):
    # Quantity = count of assets of this type with status 'In Stock'
    count = db.query(models.Asset).filter(
        models.Asset.asset_type_id == asset_type_id,
        models.Asset.status == "In Stock"
    ).count()
    
    db_inventory = db.query(models.Inventory).filter(models.Inventory.asset_type_id == asset_type_id).first()
    if not db_inventory:
        db_inventory = models.Inventory(asset_type_id=asset_type_id, quantity=count)
        db.add(db_inventory)
    else:
        db_inventory.quantity = count
    
    db.commit()

    # REQ-MW-009: SMTP/Email Alerts (Mocked)
    if db_inventory.quantity <= db_inventory.threshold_level:
        asset_type = db.query(models.AssetType).filter(models.AssetType.id == asset_type_id).first()
        print(f"--- [SMTP ALERT] ---")
        print(f"From: alert@manageware.com")
        print(f"To: property.manager@manageware.com")
        print(f"Subject: CRITICAL STOCK ALERT - {asset_type.name}")
        print(f"Body: Asset Type {asset_type.name} has fallen to {db_inventory.quantity} units (Threshold: {db_inventory.threshold_level}). Please restock.")
        print(f"-------------------")
        
        # Log the alert event to the audit trail
        create_audit_log(db, None, "SEND_EMAIL_ALERT", "INVENTORY", db_inventory.id, f"Sent SMTP alert for critical stock level of {asset_type.name}.")
