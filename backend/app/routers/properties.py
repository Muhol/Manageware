from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from .. import models, schemas
from ..database import get_db
from ..dependencies import get_current_active_user, SITE_ROLES
from ..services.audit_service import create_audit_log

router = APIRouter(tags=["Portfolio Management"])

@router.post("/properties/", response_model=schemas.Property)
def create_property(property: schemas.PropertyCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    db_property = models.Property(**property.dict())
    db.add(db_property)
    db.commit()
    db.refresh(db_property)
    create_audit_log(db, current_user.id, "CREATE_PROPERTY", "PROPERTY", db_property.id, f"Registered new estate: {db_property.name}")
    return db_property

@router.get("/properties/", response_model=List[schemas.Property])
def read_properties(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    role = db.query(models.Role).filter(models.Role.id == current_user.role_id).first()
    query = db.query(models.Property).options(joinedload(models.Property.manager))
    
    if role and role.name in SITE_ROLES:
        query = query.filter(models.Property.id == current_user.property_id)
        
    properties = query.offset(skip).limit(limit).all()
    return properties

# --- Asset Types ---

@router.post("/asset-types/", response_model=schemas.AssetType)
def create_asset_type(asset_type: schemas.AssetTypeCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    db_asset_type = models.AssetType(**asset_type.dict())
    db.add(db_asset_type)
    db.commit()
    db.refresh(db_asset_type)
    create_audit_log(db, current_user.id, "CREATE_ASSET_TYPE", "ASSET_TYPE", db_asset_type.id, f"Defined new hardware category: {db_asset_type.name}")
    return db_asset_type

@router.get("/asset-types/", response_model=List[schemas.AssetType])
def read_asset_types(db: Session = Depends(get_db)):
    return db.query(models.AssetType).all()
