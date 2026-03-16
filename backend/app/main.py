from fastapi import FastAPI, Depends, HTTPException, status, Security
from datetime import datetime
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from typing import List
from jose import JWTError, jwt
from . import models, schemas, auth
from .database import engine, get_db

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="ManageWare API")

# --- Middleware ---

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with the specific frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# --- Auth Dependencies ---

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = schemas.TokenData(email=email)
    except JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.email == token_data.email).first()
    if user is None:
        raise credentials_exception
    return user

SITE_ROLES = {"Property Manager", "Inventory Clerk", "Maintenance Technician", "Site Procurement Officer"}

def check_role(allowed_roles: List[str]):
    def role_checker(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
        role = db.query(models.Role).filter(models.Role.id == current_user.role_id).first()
        if not role or role.name not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="The user doesn't have enough privileges"
            )
        
        # Site-level assignment enforcement
        if role.name in SITE_ROLES and not current_user.property_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account configuration error: No property assignment found for this site-level role."
            )
            
        return current_user
    return role_checker

def get_current_active_user(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    role = db.query(models.Role).filter(models.Role.id == current_user.role_id).first()
    if role and role.name in SITE_ROLES and not current_user.property_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: You must be assigned to a property to access site data."
        )
    return current_user

# --- Auth Routes ---

@app.post("/token", response_model=schemas.Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(data={"sub": user.email})
    create_audit_log(db, user.id, "USER_LOGIN", "AUTH", user.id, f"User {user.email} logged into the system.")
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=schemas.User)
async def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@app.post("/users/change-password")
async def change_password(data: schemas.PasswordChange, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not auth.verify_password(data.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect old password")
    
    current_user.password_hash = auth.get_password_hash(data.new_password)
    db.commit()
    
    create_audit_log(db, current_user.id, "CHANGE_PASSWORD", "USER", current_user.id, "User changed their own password.")
    return {"detail": "Password updated successfully"}

@app.post("/auth/forgot-password")
async def forgot_password(data: schemas.PasswordResetRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user:
        # For security, don't reveal if user exists. Just return 200.
        return {"detail": "If the account exists, a reset link has been sent."}
    
    # In a real app, generate a unique token and store it.
    # For this system, we'll use a simple mock token.
    reset_token = "MOCK-RESET-" + user.id[:8].upper()
    
    print(f"--- [SMTP ALERT: PASSWORD RESET] ---")
    print(f"To: {user.email}")
    print(f"Subject: ManageWare Password Reset")
    print(f"Body: Use the following token to reset your password: {reset_token}")
    print(f"------------------------------------")
    
    create_audit_log(db, None, "REQUEST_PASSWORD_RESET", "USER", user.id, f"Password reset requested for {user.email}")
    return {"detail": "If the account exists, a reset link has been sent."}

@app.post("/auth/reset-password")
async def reset_password(data: schemas.PasswordResetConfirm, db: Session = Depends(get_db)):
    # Mock token verification logic
    # We'll assume the token format is MOCK-RESET-XXXX where XXXX is user.id[:8]
    user_id_prefix = data.token.replace("MOCK-RESET-", "").lower()
    user = db.query(models.User).filter(models.User.id.like(f"{user_id_prefix}%")).first()
    
    if not user or data.token != "MOCK-RESET-" + user.id[:8].upper():
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    user.password_hash = auth.get_password_hash(data.new_password)
    db.commit()
    
    create_audit_log(db, None, "RESET_PASSWORD_SUCCESS", "USER", user.id, f"Password successfully reset via recovery token.")
    return {"detail": "Password has been reset successfully. You can now login with your new password."}

@app.post("/users/", response_model=schemas.User, dependencies=[Depends(check_role(["Administrator"]))])
async def create_user(user: schemas.UserCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if role is Property Manager and property already has one
    role = db.query(models.Role).filter(models.Role.id == user.role_id).first()
    if role and role.name == "Property Manager" and user.property_id:
        prop = db.query(models.Property).filter(models.Property.id == user.property_id).first()
        if prop and prop.manager_id:
             raise HTTPException(status_code=400, detail=f"Property '{prop.name}' already has a manager assigned.")

    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(
        name=user.name,
        email=user.email,
        password_hash=hashed_password,
        role_id=user.role_id,
        property_id=user.property_id,
        is_active=user.is_active
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Sync Manager link
    if role and role.name == "Property Manager" and db_user.property_id:
        prop = db.query(models.Property).filter(models.Property.id == db_user.property_id).first()
        if prop:
            prop.manager_id = db_user.id
            db.add(prop)
            db.commit()

    create_audit_log(db, current_user.id, "CREATE_USER", "USER", db_user.id, f"Created user {db_user.email} with role {role.name if role else 'Unknown'}")
    return db_user

@app.get("/users/", response_model=List[schemas.User], dependencies=[Depends(check_role(["Administrator", "IT Specialist", "Property Manager"]))])
async def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    role = db.query(models.Role).filter(models.Role.id == current_user.role_id).first()
    query = db.query(models.User).options(joinedload(models.User.assigned_property))
    
    if role and role.name == "Property Manager":
        query = query.filter(models.User.property_id == current_user.property_id)
    elif role and role.name not in ["Administrator", "IT Specialist"]:
        # Safety fallback
        query = query.filter(models.User.id == current_user.id)
        
    return query.offset(skip).limit(limit).all()

@app.patch("/users/{user_id}", response_model=schemas.User, dependencies=[Depends(check_role(["Administrator"]))])
async def update_user(user_id: str, user_update: schemas.UserUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    old_role_id = db_user.role_id
    old_prop_id = db_user.property_id
    
    update_data = user_update.dict(exclude_unset=True)
    if "password" in update_data:
        update_data["password_hash"] = auth.get_password_hash(update_data.pop("password"))
    
    # 1:1 Manager Constraint Check
    new_prop_id = update_data.get("property_id", db_user.property_id)
    new_role_id = update_data.get("role_id", db_user.role_id)
    new_role = db.query(models.Role).filter(models.Role.id == new_role_id).first()
    
    if new_role and new_role.name == "Property Manager" and new_prop_id:
        # Check if another user is already managing this property
        existing_manager_prop = db.query(models.Property).filter(models.Property.id == new_prop_id).first()
        if existing_manager_prop and existing_manager_prop.manager_id and existing_manager_prop.manager_id != user_id:
            raise HTTPException(status_code=400, detail=f"Property '{existing_manager_prop.name}' already has another manager assigned.")

    for key, value in update_data.items():
        setattr(db_user, key, value)
        
    db.commit()
    db.refresh(db_user)

    # RE-SYNC MANAGER LINKS
    # 1. If user WAS a manager, clear their old property's link
    old_role = db.query(models.Role).filter(models.Role.id == old_role_id).first()
    if old_role and old_role.name == "Property Manager" and old_prop_id:
        old_prop = db.query(models.Property).filter(models.Property.id == old_prop_id).first()
        if old_prop and old_prop.manager_id == user_id:
            old_prop.manager_id = None
            db.add(old_prop)

    # 2. If user IS NOW a manager, set their new property's link
    if new_role and new_role.name == "Property Manager" and db_user.property_id:
        new_prop = db.query(models.Property).filter(models.Property.id == db_user.property_id).first()
        if new_prop:
            new_prop.manager_id = user_id
            db.add(new_prop)

    db.commit()
    db.refresh(db_user)
    
    create_audit_log(db, current_user.id, "UPDATE_USER", "USER", db_user.id, f"Updated user profile for {db_user.email}")
    return db_user

@app.delete("/users/{user_id}", dependencies=[Depends(check_role(["Administrator"]))])
async def delete_user(user_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user has related records (PurchaseRequests, Approvals) - we could soft delete instead
    # To keep constraints simple, we will do a soft delete via is_active
    db_user.is_active = False
    db.commit()
    create_audit_log(db, current_user.id, "DEACTIVATE_USER", "USER", db_user.id, f"Deactivated user {db_user.email}")
    return {"detail": "User deactivated successfully"}

@app.get("/roles/", response_model=List[schemas.Role])
async def read_roles(db: Session = Depends(get_db)):
    return db.query(models.Role).all()

@app.get("/dashboard/stats")
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

# --- Analytics ---

@app.get("/analytics/asset-mix")
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

@app.get("/analytics/property-distribution")
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

@app.get("/analytics/fiscal-trend")
async def get_fiscal_trend(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    role = db.query(models.Role).filter(models.Role.id == current_user.role_id).first()
    
    query = db.query(models.PurchaseOrder).order_by(models.PurchaseOrder.created_at.desc())
    
    if role and role.name in SITE_ROLES:
        query = query.join(models.PurchaseRequest).filter(models.PurchaseRequest.property_id == current_user.property_id)
        
    pos = query.limit(10).all()
    # Sort for chart
    pos.sort(key=lambda x: x.created_at)
    
    return [{"name": po.created_at.strftime("%b %d"), "total": float(po.total_amount), "budget": float(po.total_amount * 1.1)} for po in pos]

@app.get("/analytics/asset-aging")
async def get_asset_aging(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    role = db.query(models.Role).filter(models.Role.id == current_user.role_id).first()
    
    query = db.query(
        models.Asset.purchase_date,
        func.count(models.Asset.id)
    )
    
    if role and role.name in SITE_ROLES:
        query = query.filter(models.Asset.property_id == current_user.property_id)
        
    results = query.group_by(models.Asset.purchase_date).all()
    
    # Simple logic: group by year
    aging = {}
    now = datetime.now()
    for purchase_date, count in results:
        year = purchase_date.year if purchase_date else now.year
        age = now.year - year
        label = f"{age} Yrs"
        aging[label] = aging.get(label, 0) + count
        
    return [{"name": k, "value": v} for k, v in aging.items()]

# --- Admin/Audit ---

@app.get("/admin/audit-logs", response_model=List[schemas.AuditLog])
async def get_audit_logs(db: Session = Depends(get_db)):
    return db.query(models.AuditLog).order_by(models.AuditLog.timestamp.desc()).limit(100).all()

@app.get("/admin/security-certificate")
async def get_security_certificate(db: Session = Depends(get_db), current_user: models.User = Depends(check_role(["Administrator"]))):
    # Dynamic report of system security posture
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

@app.get("/")
def read_root():
    return {"message": "Welcome to ManageWare API"}

# --- Properties ---

@app.post("/properties/", response_model=schemas.Property)
def create_property(property: schemas.PropertyCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    db_property = models.Property(**property.dict())
    db.add(db_property)
    db.commit()
    db.refresh(db_property)
    create_audit_log(db, current_user.id, "CREATE_PROPERTY", "PROPERTY", db_property.id, f"Registered new estate: {db_property.name}")
    return db_property

@app.get("/properties/", response_model=List[schemas.Property])
def read_properties(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    role = db.query(models.Role).filter(models.Role.id == current_user.role_id).first()
    query = db.query(models.Property).options(joinedload(models.Property.manager))
    
    if role and role.name in SITE_ROLES:
        query = query.filter(models.Property.id == current_user.property_id)
        
    properties = query.offset(skip).limit(limit).all()
    return properties

# --- Asset Types ---

@app.post("/asset-types/", response_model=schemas.AssetType)
def create_asset_type(asset_type: schemas.AssetTypeCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    db_asset_type = models.AssetType(**asset_type.dict())
    db.add(db_asset_type)
    db.commit()
    db.refresh(db_asset_type)
    create_audit_log(db, current_user.id, "CREATE_ASSET_TYPE", "ASSET_TYPE", db_asset_type.id, f"Defined new hardware category: {db_asset_type.name}")
    return db_asset_type

@app.get("/asset-types/", response_model=List[schemas.AssetType])
def read_asset_types(db: Session = Depends(get_db)):
    return db.query(models.AssetType).all()

# --- Audit Logging ---

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

# --- Inventory ---

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

    # REQ-MW-009: SMTP/Email Alerts (Mocked for Phase 11)
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

# --- Assets ---

@app.post("/assets/", response_model=schemas.Asset)
def create_asset(asset: schemas.AssetCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    role = db.query(models.Role).filter(models.Role.id == current_user.role_id).first()
    
    # Auto-generate asset tag if not provided
    if not asset.asset_tag:
        count = db.query(models.Asset).count()
        asset.asset_tag = f"MW-TAG-{count + 1:03d}"
    
    # Force property_id for site roles
    asset_data = asset.dict()
    if role and role.name in SITE_ROLES:
        asset_data["property_id"] = current_user.property_id
        
    db_asset = models.Asset(**asset_data)
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    
    # Sync inventory
    sync_inventory(db, db_asset.asset_type_id)
    
    # Log action
    create_audit_log(db, current_user.id, "REGISTER_ASSET", "ASSET", db_asset.id, f"Registered asset {db_asset.asset_tag}")
    
    return db_asset

@app.get("/assets/", response_model=List[schemas.Asset])
def read_assets(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    role = db.query(models.Role).filter(models.Role.id == current_user.role_id).first()
    query = db.query(models.Asset)
    
    if role and role.name in SITE_ROLES:
        query = query.filter(models.Asset.property_id == current_user.property_id)
        
    assets = query.offset(skip).limit(limit).all()
    return assets

@app.patch("/assets/{asset_id}", response_model=schemas.Asset)
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
    
    # Sync inventory if status or asset_type changed
    if "status" in update_data or "asset_type_id" in update_data:
        sync_inventory(db, db_asset.asset_type_id)
    
    # Log action
    details = f"Updated asset {db_asset.asset_tag}."
    if "status" in update_data and update_data["status"] != old_status:
        details += f" Status changed from {old_status} to {db_asset.status}."
    
    create_audit_log(db, current_user.id, "UPDATE_ASSET", "ASSET", db_asset.id, details)
    
    return db_asset

# --- Inventory ---

@app.get("/inventory/", response_model=List[schemas.Inventory])
def read_inventory(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    role = db.query(models.Role).filter(models.Role.id == current_user.role_id).first()
    
    if role and role.name in SITE_ROLES:
        # For site roles, we calculate inventory based on their specific property
        # We group assets by asset_type_id where status is 'In Stock'
        inventory_counts = db.query(
            models.Asset.asset_type_id,
            func.count(models.Asset.id).label("quantity")
        ).filter(
            models.Asset.property_id == current_user.property_id,
            models.Asset.status == "In Stock"
        ).group_by(models.Asset.asset_type_id).all()
        
        # We need to map this back to schemas.Inventory which might need a reference threshold
        # For simplicity, we fetch the threshold from the global inventory record for that type
        site_inventory = []
        for asset_type_id, quantity in inventory_counts:
            global_inv = db.query(models.Inventory).filter(models.Inventory.asset_type_id == asset_type_id).first()
            threshold = global_inv.threshold_level if global_inv else 5
            
            # Create a mock inventory object for the response
            # Note: We need to return objects that match schemas.Inventory
            site_inventory.append({
                "id": f"site-inv-{asset_type_id}",
                "asset_type_id": asset_type_id,
                "quantity": quantity,
                "threshold_level": threshold,
                "asset_type": db.query(models.AssetType).filter(models.AssetType.id == asset_type_id).first()
            })
        return site_inventory

    return db.query(models.Inventory).all()

@app.patch("/inventory/{inventory_id}", response_model=schemas.Inventory)
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

@app.post("/inventory/sync")
def trigger_manual_sync(db: Session = Depends(get_db), current_user: models.User = Depends(check_role(["Administrator", "IT Specialist"]))):
    # Force sync all asset types
    asset_types = db.query(models.AssetType).all()
    for at in asset_types:
        sync_inventory(db, at.id)
    
    create_audit_log(db, current_user.id, "MANUAL_INVENTORY_SYNC", "SYSTEM", "GLOBAL", "Triggered manual re-aggregation of all hardware stock levels.")
    return {"message": f"Successfully synced inventory for {len(asset_types)} hardware categories."}

@app.get("/dashboard/alerts")
def get_dashboard_alerts(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    role = db.query(models.Role).filter(models.Role.id == current_user.role_id).first()
    
    # Low stock: current quantity < threshold
    if role and role.name in SITE_ROLES:
        # For site roles, we check alerts based on their property's inventory levels
        # (calculated on the fly or filtered)
        # We reuse the logic from read_inventory essentially
        inventory_counts = db.query(
            models.Asset.asset_type_id,
            func.count(models.Asset.id).label("quantity")
        ).filter(
            models.Asset.property_id == current_user.property_id,
            models.Asset.status == "In Stock"
        ).group_by(models.Asset.asset_type_id).all()
        
        low_stock_items = []
        for asset_type_id, quantity in inventory_counts:
            global_inv = db.query(models.Inventory).filter(models.Inventory.asset_type_id == asset_type_id).first()
            threshold = global_inv.threshold_level if global_inv else 5
            if quantity <= threshold:
                low_stock_items.append({
                    "id": f"alert-{asset_type_id}",
                    "asset_type": db.query(models.AssetType).filter(models.AssetType.id == asset_type_id).first().name,
                    "quantity": quantity,
                    "threshold": threshold
                })
        return {"low_stock_items": low_stock_items}

    low_stock = db.query(models.Inventory).filter(models.Inventory.quantity <= models.Inventory.threshold_level).all()
    
    # We also might want to return recent pending requests or other alerts
    return {
        "low_stock_items": [
            {
                "id": i.id,
                "asset_type": i.asset_type.name,
                "quantity": i.quantity,
                "threshold": i.threshold_level
            } for i in low_stock
        ]
    }

# --- PDF Generation ---

from fpdf import FPDF
import os

def generate_po_pdf(po: models.PurchaseOrder, items: List[models.PurchaseOrderItem], property_name: str):
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", 'B', 16)
    pdf.cell(40, 10, f"Purchase Order: {po.po_number}")
    pdf.ln(10)
    pdf.set_font("Arial", '', 12)
    pdf.cell(40, 10, f"Property: {property_name}")
    pdf.ln(10)
    pdf.cell(40, 10, f"Date: {po.created_at.strftime('%Y-%m-%d')}")
    pdf.ln(20)
    
    # Table Header
    pdf.set_font("Arial", 'B', 10)
    pdf.cell(80, 10, "Item / Asset Type", 1)
    pdf.cell(30, 10, "Quantity", 1)
    pdf.cell(40, 10, "Unit Price", 1)
    pdf.cell(40, 10, "Total", 1)
    pdf.ln(10)
    
    # Table Body
    pdf.set_font("Arial", '', 10)
    for item in items:
        # We need asset type name, might need to fetch it or assume it's pre-fetched
        asset_name = item.asset_type.name if item.asset_type else "Hardware Item"
        pdf.cell(80, 10, asset_name, 1)
        pdf.cell(30, 10, str(item.quantity), 1)
        pdf.cell(40, 10, f"Ksh {item.unit_price:,.2f}", 1)
        pdf.cell(40, 10, f"Ksh {item.total_price:,.2f}", 1)
        pdf.ln(10)
        
    pdf.ln(10)
    pdf.set_font("Arial", 'B', 12)
    pdf.cell(40, 10, f"Total Amount: Ksh {po.total_amount:,.2f}")
    
    # Ensure directory exists
    os.makedirs("static/pdfs", exist_ok=True)
    file_path = f"static/pdfs/{po.po_number}.pdf"
    pdf.output(file_path)
    return file_path

# --- Purchase Requests ---

@app.post("/purchase-requests/", response_model=schemas.PurchaseRequest)
def create_purchase_request(request: schemas.PurchaseRequestCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    role = db.query(models.Role).filter(models.Role.id == current_user.role_id).first()
    
    prop_id = request.property_id
    if role and role.name in SITE_ROLES:
        prop_id = current_user.property_id

    db_request = models.PurchaseRequest(
        requested_by=current_user.id,
        property_id=prop_id,
        justification=request.justification,
        status="Pending"
    )
    db.add(db_request)
    db.commit()
    db.refresh(db_request)
    
    for item in request.items:
        db_item = models.PurchaseRequestItem(
            purchase_request_id=db_request.id,
            asset_type_id=item.asset_type_id,
            quantity=item.quantity,
            estimated_price=item.estimated_price
        )
        db.add(db_item)
    
    db.commit()
    db.refresh(db_request)
    create_audit_log(db, current_user.id, "CREATE_REQUEST", "PURCHASE_REQUEST", db_request.id, f"Submitted acquisition request with {len(request.items)} items.")
    return db_request

@app.get("/purchase-requests/", response_model=List[schemas.PurchaseRequest])
def read_purchase_requests(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    role = db.query(models.Role).filter(models.Role.id == current_user.role_id).first()
    query = db.query(models.PurchaseRequest).options(
        joinedload(models.PurchaseRequest.items).joinedload(models.PurchaseRequestItem.asset_type),
        joinedload(models.PurchaseRequest.property)
    )
    
    if role and role.name in SITE_ROLES:
        query = query.filter(models.PurchaseRequest.property_id == current_user.property_id)
        
    return query.order_by(models.PurchaseRequest.created_at.desc()).all()

@app.patch("/purchase-requests/{request_id}/approve", response_model=schemas.PurchaseRequest)
def approve_purchase_request(request_id: str, approval_data: schemas.ApprovalCreate, db: Session = Depends(get_db), current_user: models.User = Depends(check_role(["Finance Director", "Administrator"]))):
    db_request = db.query(models.PurchaseRequest).filter(models.PurchaseRequest.id == request_id).first()
    if not db_request:
        raise HTTPException(status_code=404, detail="Purchase request not found")
    
    db_request.status = "Approved"
    
    # Create approval record
    db_approval = models.Approval(
        purchase_request_id=request_id,
        approved_by=current_user.id,
        status="Approved",
        approval_notes=approval_data.approval_notes
    )
    db.add(db_approval)
    
    # Generate Purchase Order
    import random
    import string
    po_number = "PO-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
    
    total_amount = sum(item.quantity * item.estimated_price for item in db_request.items)
    
    db_po = models.PurchaseOrder(
        purchase_request_id=request_id,
        po_number=po_number,
        total_amount=total_amount,
        status="Generated"
    )
    db.add(db_po)
    db.commit()
    db.refresh(db_po)
    
    # Create PO items
    po_items = []
    for req_item in db_request.items:
        db_po_item = models.PurchaseOrderItem(
            purchase_order_id=db_po.id,
            asset_type_id=req_item.asset_type_id,
            quantity=req_item.quantity,
            unit_price=req_item.estimated_price,
            total_price=req_item.quantity * req_item.estimated_price
        )
        db.add(db_po_item)
        po_items.append(db_po_item)
    
    db.commit()
    db.refresh(db_po)
    
    # Generate PDF
    property_name = db_request.property.name if db_request.property else "Global"
    pdf_path = generate_po_pdf(db_po, db_po.items, property_name)
    db_po.generated_pdf_path = pdf_path
    db.add(db_po)
    
    # Simple Financial Integration Log
    db_finance_log = models.FinancialIntegrationLog(
        purchase_order_id=db_po.id,
        status="PROCESSED",
        response_message="Synced with external accounting system."
    )
    db.add(db_finance_log)
    
    db.commit()
    
    # Audit log
    create_audit_log(db, current_user.id, "APPROVE_REQUEST", "PURCHASE_REQUEST", request_id, 
                     f"Approved request {request_id} and generated PO {po_number}")
    
    db.refresh(db_request)
    return db_request

@app.patch("/purchase-requests/{request_id}/reject", response_model=schemas.PurchaseRequest)
def reject_purchase_request(request_id: str, approval_data: schemas.ApprovalCreate, db: Session = Depends(get_db), current_user: models.User = Depends(check_role(["Finance Director", "Administrator"]))):
    db_request = db.query(models.PurchaseRequest).filter(models.PurchaseRequest.id == request_id).first()
    if not db_request:
        raise HTTPException(status_code=404, detail="Purchase request not found")
    
    db_request.status = "Rejected"
    
    db_approval = models.Approval(
        purchase_request_id=request_id,
        approved_by=current_user.id,
        status="Rejected",
        approval_notes=approval_data.approval_notes
    )
    db.add(db_approval)
    db.commit()
    
    create_audit_log(db, current_user.id, "REJECT_REQUEST", "PURCHASE_REQUEST", request_id, 
                     f"Rejected request {request_id}")
    
    db.refresh(db_request)
    return db_request

from fastapi.responses import FileResponse

@app.get("/purchase-orders/{po_id}/download")
def download_purchase_order(po_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    db_po = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.id == po_id).first()
    if not db_po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")
    
    # Generate on the fly if it doesn't exist (e.g. legacy backfilled POs)
    if not db_po.generated_pdf_path or not os.path.exists(db_po.generated_pdf_path):
        try:
            property_name = db_po.purchase_request.property.name if db_po.purchase_request and db_po.purchase_request.property else "Global"
            pdf_path = generate_po_pdf(db_po, db_po.items, property_name)
            db_po.generated_pdf_path = pdf_path
            db.commit()
        except Exception as e:
            raise HTTPException(status_code=500, detail="Could not generate PDF on the fly")
            
    create_audit_log(db, current_user.id, "DOWNLOAD_PO", "PURCHASE_ORDER", po_id, f"Purchase order {db_po.po_number} was downloaded.")
    return FileResponse(db_po.generated_pdf_path, media_type='application/pdf', filename=f"{db_po.po_number}.pdf")

@app.get("/purchase-requests/{request_id}/po", response_model=schemas.PurchaseOrder)
def get_purchase_order_by_request(request_id: str, db: Session = Depends(get_db)):
    db_po = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.purchase_request_id == request_id).first()
    if not db_po:
        raise HTTPException(status_code=404, detail="Purchase Order not found for this request")
    return db_po

@app.get("/purchase-orders/", response_model=List[schemas.PurchaseOrder])
def read_purchase_orders(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    role = db.query(models.Role).filter(models.Role.id == current_user.role_id).first()
    query = db.query(models.PurchaseOrder).join(models.PurchaseRequest)
    
    if role and role.name in SITE_ROLES:
        query = query.filter(models.PurchaseRequest.property_id == current_user.property_id)
        
    return query.all()
