from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from typing import List
from . import models, schemas, auth
from .database import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

SITE_ROLES = {"Property Manager", "Inventory Clerk", "Maintenance Technician", "Site Procurement Officer"}

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
