from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from .. import models, schemas, auth
from ..database import get_db
from ..dependencies import check_role, get_current_active_user, get_current_user
from ..services.audit_service import create_audit_log

router = APIRouter(prefix="/users", tags=["User Management"])

@router.post("/", response_model=schemas.User, dependencies=[Depends(check_role(["Administrator"]))])
async def create_user(user: schemas.UserCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
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

    if role and role.name == "Property Manager" and db_user.property_id:
        prop = db.query(models.Property).filter(models.Property.id == db_user.property_id).first()
        if prop:
            prop.manager_id = db_user.id
            db.add(prop)
            db.commit()

    create_audit_log(db, current_user.id, "CREATE_USER", "USER", db_user.id, f"Created user {db_user.email} with role {role.name if role else 'Unknown'}")
    return db_user

@router.get("/", response_model=List[schemas.User], dependencies=[Depends(check_role(["Administrator", "IT Specialist", "Property Manager"]))])
async def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    role = db.query(models.Role).filter(models.Role.id == current_user.role_id).first()
    query = db.query(models.User).options(joinedload(models.User.assigned_property))
    
    if role and role.name == "Property Manager":
        query = query.filter(models.User.property_id == current_user.property_id)
    elif role and role.name not in ["Administrator", "IT Specialist"]:
        query = query.filter(models.User.id == current_user.id)
        
    return query.offset(skip).limit(limit).all()

@router.patch("/{user_id}", response_model=schemas.User, dependencies=[Depends(check_role(["Administrator"]))])
async def update_user(user_id: str, user_update: schemas.UserUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    old_role_id = db_user.role_id
    old_prop_id = db_user.property_id
    
    update_data = user_update.dict(exclude_unset=True)
    if "password" in update_data:
        update_data["password_hash"] = auth.get_password_hash(update_data.pop("password"))
    
    new_prop_id = update_data.get("property_id", db_user.property_id)
    new_role_id = update_data.get("role_id", db_user.role_id)
    new_role = db.query(models.Role).filter(models.Role.id == new_role_id).first()
    
    if new_role and new_role.name == "Property Manager" and new_prop_id:
        existing_manager_prop = db.query(models.Property).filter(models.Property.id == new_prop_id).first()
        if existing_manager_prop and existing_manager_prop.manager_id and existing_manager_prop.manager_id != user_id:
            raise HTTPException(status_code=400, detail=f"Property '{existing_manager_prop.name}' already has another manager assigned.")

    for key, value in update_data.items():
        setattr(db_user, key, value)
        
    db.commit()
    db.refresh(db_user)

    old_role = db.query(models.Role).filter(models.Role.id == old_role_id).first()
    if old_role and old_role.name == "Property Manager" and old_prop_id:
        old_prop = db.query(models.Property).filter(models.Property.id == old_prop_id).first()
        if old_prop and old_prop.manager_id == user_id:
            old_prop.manager_id = None
            db.add(old_prop)

    if new_role and new_role.name == "Property Manager" and db_user.property_id:
        new_prop = db.query(models.Property).filter(models.Property.id == db_user.property_id).first()
        if new_prop:
            new_prop.manager_id = user_id
            db.add(new_prop)

    db.commit()
    db.refresh(db_user)
    
    create_audit_log(db, current_user.id, "UPDATE_USER", "USER", db_user.id, f"Updated user profile for {db_user.email}")
    return db_user

@router.delete("/{user_id}", dependencies=[Depends(check_role(["Administrator"]))])
async def delete_user(user_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db_user.is_active = False
    db.commit()
    create_audit_log(db, current_user.id, "DEACTIVATE_USER", "USER", db_user.id, f"Deactivated user {db_user.email}")
    return {"detail": "User deactivated successfully"}

@router.get("/roles", response_model=List[schemas.Role])
def read_roles(db: Session = Depends(get_db)):
    return db.query(models.Role).all()
