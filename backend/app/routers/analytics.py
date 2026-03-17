from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from typing import List
from .. import models, schemas
from ..database import get_db
from ..dependencies import get_current_active_user, SITE_ROLES

router = APIRouter(tags=["Analytics & Dashboard"])

@router.get("/dashboard/stats")
async def get_dashboard_stats(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    role = db.query(models.Role).filter(models.Role.id == current_user.role_id).first()
    
    query_assets = db.query(models.Asset)
    query_properties = db.query(models.Property)
    query_requests = db.query(models.PurchaseRequest)
    
    if role and role.name in SITE_ROLES:
        query_assets = query_assets.filter(models.Asset.property_id == current_user.property_id)
        query_properties = query_properties.filter(models.Property.id == current_user.property_id)
        query_requests = query_requests.filter(models.PurchaseRequest.property_id == current_user.property_id)
    
    total_assets = query_assets.count()
    total_properties = query_properties.count()
    pending_requests = query_requests.filter(models.PurchaseRequest.status == "Pending").count()
    maintenance_assets = query_assets.filter(models.Asset.status == "Maintenance").count()
    
    return {
        "total_assets": total_assets,
        "total_properties": total_properties,
        "pending_requests": pending_requests,
        "maintenance_assets": maintenance_assets
    }

@router.get("/analytics/asset-mix")
async def get_asset_mix(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    role = db.query(models.Role).filter(models.Role.id == current_user.role_id).first()
    
    query = db.query(
        models.AssetType.name,
        func.count(models.Asset.id)
    ).join(models.Asset, models.Asset.asset_type_id == models.AssetType.id)
    
    if role and role.name in SITE_ROLES:
        query = query.filter(models.Asset.property_id == current_user.property_id)
        
    results = query.group_by(models.AssetType.name).all()
    
    return [{"name": r[0], "value": r[1]} for r in results]

@router.get("/analytics/property-distribution")
async def get_property_distribution(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    role = db.query(models.Role).filter(models.Role.id == current_user.role_id).first()
    
    query = db.query(
        models.Property.name,
        func.count(models.Asset.id)
    ).join(models.Asset, models.Asset.property_id == models.Property.id)
    
    if role and role.name in SITE_ROLES:
        query = query.filter(models.Property.id == current_user.property_id)
        
    results = query.group_by(models.Property.name).all()
    
    return [{"name": r[0], "value": r[1]} for r in results]

@router.get("/analytics/fiscal-trend")
async def get_fiscal_trend(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    role = db.query(models.Role).filter(models.Role.id == current_user.role_id).first()
    
    query = db.query(models.PurchaseOrder).order_by(models.PurchaseOrder.created_at.desc())
    
    if role and role.name in SITE_ROLES:
        query = query.join(models.PurchaseRequest).filter(models.PurchaseRequest.property_id == current_user.property_id)
        
    pos = query.limit(10).all()
    pos.sort(key=lambda x: x.created_at)
    
    return [{"name": po.created_at.strftime("%b %d"), "total": float(po.total_amount), "budget": float(po.total_amount * 1.1)} for po in pos]

@router.get("/analytics/asset-aging")
async def get_asset_aging(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    role = db.query(models.Role).filter(models.Role.id == current_user.role_id).first()
    
    query = db.query(
        models.Asset.purchase_date,
        func.count(models.Asset.id)
    )
    
    if role and role.name in SITE_ROLES:
        query = query.filter(models.Asset.property_id == current_user.property_id)
        
    results = query.group_by(models.Asset.purchase_date).all()
    
    aging = {}
    now = datetime.now()
    for purchase_date, count in results:
        year = purchase_date.year if purchase_date else now.year
        age = now.year - year
        label = f"{age} Yrs"
        aging[label] = aging.get(label, 0) + count
        
    return [{"name": k, "value": v} for k, v in aging.items()]
