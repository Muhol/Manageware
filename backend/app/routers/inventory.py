from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from .. import models, schemas
from ..database import get_db
from ..dependencies import check_role, get_current_active_user, SITE_ROLES
from ..services.audit_service import create_audit_log
from ..services.inventory_service import sync_inventory

router = APIRouter(prefix="/inventory", tags=["Inventory Management"])

@router.get("/", response_model=List[schemas.Inventory])
def read_inventory(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    role = db.query(models.Role).filter(models.Role.id == current_user.role_id).first()
    
    if role and role.name in SITE_ROLES:
        inventory_counts = db.query(
            models.Asset.asset_type_id,
            func.count(models.Asset.id).label("quantity")
        ).filter(
            models.Asset.property_id == current_user.property_id,
            models.Asset.status == "In Stock"
        ).group_by(models.Asset.asset_type_id).all()
        
        site_inventory = []
        for asset_type_id, quantity in inventory_counts:
            global_inv = db.query(models.Inventory).filter(models.Inventory.asset_type_id == asset_type_id).first()
            threshold = global_inv.threshold_level if global_inv else 5
            
            site_inventory.append({
                "id": f"site-inv-{asset_type_id}",
                "asset_type_id": asset_type_id,
                "quantity": quantity,
                "threshold_level": threshold,
                "asset_type": db.query(models.AssetType).filter(models.AssetType.id == asset_type_id).first()
            })
        return site_inventory

    return db.query(models.Inventory).all()

@router.patch("/{inventory_id}", response_model=schemas.Inventory)
def update_inventory(inventory_id: str, inventory: schemas.InventoryUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(check_role(["Administrator", "IT Specialist"]))):
    db_inventory = db.query(models.Inventory).filter(models.Inventory.id == inventory_id).first()
    if not db_inventory:
        raise HTTPException(status_code=404, detail="Inventory record not found")
    
    update_data = inventory.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_inventory, key, value)
    
    db.commit()
    db.refresh(db_inventory)
    create_audit_log(db, current_user.id, "UPDATE_INVENTORY", "INVENTORY", db_inventory.id, f"Updated stock parameters for {db_inventory.asset_type.name if db_inventory.asset_type else 'hardware'}")
    return db_inventory

@router.post("/sync")
def trigger_manual_sync(db: Session = Depends(get_db), current_user: models.User = Depends(check_role(["Administrator", "IT Specialist"]))):
    asset_types = db.query(models.AssetType).all()
    for at in asset_types:
        sync_inventory(db, at.id)
    
    create_audit_log(db, current_user.id, "MANUAL_INVENTORY_SYNC", "SYSTEM", "GLOBAL", "Triggered manual re-aggregation of all hardware stock levels.")
    return {"message": f"Successfully synced inventory for {len(asset_types)} hardware categories."}
