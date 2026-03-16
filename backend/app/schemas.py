from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

# --- User Minimal Schemas ---
class UserMinimal(BaseModel):
    id: str
    name: str
    email: EmailStr
    class Config:
        from_attributes = True

# --- Property Schemas ---

class PropertyBase(BaseModel):
    name: str
    location: str
    description: Optional[str] = None
    manager_id: Optional[str] = None

class PropertyCreate(PropertyBase):
    pass

class Property(PropertyBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    manager: Optional[UserMinimal] = None
    class Config:
        from_attributes = True

# --- Base Schemas ---

class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None

class RoleCreate(RoleBase):
    pass

class Role(RoleBase):
    id: str
    created_at: datetime
    class Config:
        from_attributes = True

class UserBase(BaseModel):
    name: str
    email: EmailStr
    role_id: str
    property_id: Optional[str] = None
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role_id: Optional[str] = None
    property_id: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

class User(UserBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    role: Optional[Role] = None
    assigned_property: Optional[Property] = None
    class Config:
        from_attributes = True

# --- Asset Schemas ---

class AssetTypeBase(BaseModel):
    name: str
    description: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None

class AssetTypeCreate(AssetTypeBase):
    pass

class AssetType(AssetTypeBase):
    id: str
    created_at: datetime
    class Config:
        from_attributes = True

class AssetBase(BaseModel):
    asset_tag: Optional[str] = None
    serial_number: str
    asset_type_id: str
    property_id: str
    status: str
    purchase_date: Optional[datetime] = None
    warranty_expiry: Optional[datetime] = None

class AssetCreate(AssetBase):
    pass

class AssetUpdate(BaseModel):
    asset_tag: Optional[str] = None
    serial_number: Optional[str] = None
    status: Optional[str] = None
    property_id: Optional[str] = None
    asset_type_id: Optional[str] = None
    purchase_date: Optional[datetime] = None
    warranty_expiry: Optional[datetime] = None

class Asset(AssetBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    asset_type: Optional[AssetType] = None
    property: Optional[Property] = None
    class Config:
        from_attributes = True

# --- Inventory Schemas ---

class InventoryBase(BaseModel):
    asset_type_id: str
    quantity: int
    threshold_level: int

class InventoryUpdate(BaseModel):
    quantity: Optional[int] = None
    threshold_level: Optional[int] = None

class Inventory(InventoryBase):
    id: str
    last_updated: datetime
    class Config:
        from_attributes = True

# --- Procurement Schemas ---

class PurchaseRequestItemBase(BaseModel):
    asset_type_id: str
    quantity: int
    estimated_price: float

class PurchaseRequestItemCreate(PurchaseRequestItemBase):
    pass

class PurchaseRequestItem(PurchaseRequestItemBase):
    id: str
    asset_type: Optional[AssetType] = None
    class Config:
        from_attributes = True

class PurchaseRequestBase(BaseModel):
    property_id: str
    justification: str

class PurchaseRequestCreate(PurchaseRequestBase):
    requested_by: str
    items: List[PurchaseRequestItemCreate]

class PurchaseRequest(PurchaseRequestBase):
    id: str
    requested_by: str
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    items: List[PurchaseRequestItem]
    property: Optional[Property] = None
    requester: Optional[UserBase] = None
    class Config:
        from_attributes = True

# --- Financial Approval ---

class ApprovalBase(BaseModel):
    purchase_request_id: str
    status: str
    approval_notes: Optional[str] = None

class ApprovalCreate(ApprovalBase):
    pass

class Approval(ApprovalBase):
    id: str
    approved_by: str
    approved_at: datetime
    approver: Optional[User] = None
    
    class Config:
        from_attributes = True

# --- Purchase Orders ---

class PurchaseOrderItemBase(BaseModel):
    asset_type_id: str
    quantity: int
    unit_price: float

class PurchaseOrderItemCreate(PurchaseOrderItemBase):
    pass

class PurchaseOrderItem(PurchaseOrderItemBase):
    id: str
    total_price: float
    asset_type: Optional[AssetType] = None
    
    class Config:
        from_attributes = True

class PurchaseOrderBase(BaseModel):
    purchase_request_id: str
    po_number: str
    total_amount: float
    status: str = "Generated"
    generated_pdf_path: Optional[str] = None

class PurchaseOrderCreate(PurchaseOrderBase):
    items: List[PurchaseOrderItemCreate]

class PurchaseOrder(PurchaseOrderBase):
    id: str
    created_at: datetime
    items: List[PurchaseOrderItem]
    purchase_request: Optional[PurchaseRequest] = None
    
    class Config:
        from_attributes = True

# --- Authentication Schemas ---

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class PasswordChange(BaseModel):
    old_password: str
    new_password: str

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

# --- Audit Logging Schemas ---

class AuditLogBase(BaseModel):
    user_id: Optional[str] = None
    action: str
    resource_type: str
    resource_id: str
    details: Optional[str] = None

class AuditLog(AuditLogBase):
    id: str
    timestamp: datetime
    user: Optional[UserBase] = None
    
    class Config:
        from_attributes = True
