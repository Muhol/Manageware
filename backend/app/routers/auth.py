from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime
from .. import models, schemas, auth
from ..database import get_db
from ..dependencies import get_current_user
from ..services.audit_service import create_audit_log

router = APIRouter(tags=["Authentication"])

@router.post("/token", response_model=schemas.Token)
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

@router.get("/users/me", response_model=schemas.User)
async def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@router.post("/users/change-password")
async def change_password(data: schemas.PasswordChange, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not auth.verify_password(data.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect old password")
    
    current_user.password_hash = auth.get_password_hash(data.new_password)
    db.commit()
    
    create_audit_log(db, current_user.id, "CHANGE_PASSWORD", "USER", current_user.id, "User changed their own password.")
    return {"detail": "Password updated successfully"}

@router.post("/auth/forgot-password")
async def forgot_password(data: schemas.PasswordResetRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user:
        return {"detail": "If the account exists, a reset link has been sent."}
    
    import uuid
    reset_token = "MOCK-RESET-" + user.id[:8].upper()
    
    print(f"--- [SMTP ALERT: PASSWORD RESET] ---")
    print(f"To: {user.email}")
    print(f"Subject: ManageWare Password Reset")
    print(f"Body: Use the following token to reset your password: {reset_token}")
    print(f"------------------------------------")
    
    create_audit_log(db, None, "REQUEST_PASSWORD_RESET", "USER", user.id, f"Password reset requested for {user.email}")
    return {"detail": "If the account exists, a reset link has been sent."}

@router.post("/auth/reset-password")
async def reset_password(data: schemas.PasswordResetConfirm, db: Session = Depends(get_db)):
    user_id_prefix = data.token.replace("MOCK-RESET-", "").lower()
    user = db.query(models.User).filter(models.User.id.like(f"{user_id_prefix}%")).first()
    
    if not user or data.token != "MOCK-RESET-" + user.id[:8].upper():
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    user.password_hash = auth.get_password_hash(data.new_password)
    db.commit()
    
    create_audit_log(db, None, "RESET_PASSWORD_SUCCESS", "USER", user.id, f"Password successfully reset via recovery token.")
    return {"detail": "Password has been reset successfully. You can now login with your new password."}
