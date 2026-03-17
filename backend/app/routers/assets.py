from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas
from ..database import get_db
from ..dependencies import check_role, get_current_active_user, get_current_user, SITE_ROLES
from ..services.audit_service import create_audit_log
from ..services.inventory_service import sync_inventory

router = APIRouter(tags=["Asset Management"])

@router.post("/assets/", response_model=schemas.Asset)
def create_asset(asset: schemas.AssetCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    role = db.query(models.Role).filter(models.Role.id == current_user.role_id).first()
    
    if not asset.asset_tag:
        count = db.query(models.Asset).count()
        asset.asset_tag = f"MW-TAG-{count + 1:03d}"
    
    asset_data = asset.dict()
    if role and role.name in SITE_ROLES:
        asset_data["property_id"] = current_user.property_id
        
    db_asset = models.Asset(**asset_data)
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    
    sync_inventory(db, db_asset.asset_type_id)
    create_audit_log(db, current_user.id, "REGISTER_ASSET", "ASSET", db_asset.id, f"Registered asset {db_asset.asset_tag}")
    
    return db_asset

@router.get("/assets/", response_model=List[schemas.Asset])
def read_assets(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    role = db.query(models.Role).filter(models.Role.id == current_user.role_id).first()
    query = db.query(models.Asset)
    
    if role and role.name in SITE_ROLES:
        query = query.filter(models.Asset.property_id == current_user.property_id)
        
    assets = query.offset(skip).limit(limit).all()
    return assets

@router.patch("/assets/{asset_id}", response_model=schemas.Asset)
def update_asset(asset_id: str, asset: schemas.AssetUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
    if not db_asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    old_status = db_asset.status
    update_data = asset.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_asset, key, value)
    
    db.commit()
    db.refresh(db_asset)
    
    if "status" in update_data or "asset_type_id" in update_data:
        sync_inventory(db, db_asset.asset_type_id)
    
    details = f"Updated asset {db_asset.asset_tag}."
    if "status" in update_data and update_data["status"] != old_status:
        details += f" Status changed from {old_status} to {db_asset.status}."
    
    create_audit_log(db, current_user.id, "UPDATE_ASSET", "ASSET", db_asset.id, details)
    
    return db_asset
