from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer, Float, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from .database import Base

def generate_uuid():
    return str(uuid.uuid4())

# --- Authentication & Users ---

class Role(Base):
    __tablename__ = "roles"
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, unique=True, index=True)
    description = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    users = relationship("User", back_populates="role")

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role_id = Column(String, ForeignKey("roles.id"))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    role = relationship("Role", back_populates="users")
    property_id = Column(String, ForeignKey("properties.id"), nullable=True)
    assigned_property = relationship("Property", foreign_keys=[property_id], back_populates="staff")
    
    purchase_requests = relationship("PurchaseRequest", back_populates="requester")
    approvals = relationship("Approval", back_populates="approver")

# --- Property Management ---

class Property(Base):
    __tablename__ = "properties"
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, index=True)
    location = Column(String)
    description = Column(String)
    manager_id = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    manager = relationship("User", foreign_keys=[manager_id], uselist=False)
    staff = relationship("User", foreign_keys=[User.property_id], back_populates="assigned_property")
    assets = relationship("Asset", back_populates="property")
    purchase_requests = relationship("PurchaseRequest", back_populates="property")

# --- Asset Management ---

class AssetType(Base):
    __tablename__ = "asset_types"
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, unique=True, index=True)
    description = Column(String)
    manufacturer = Column(String)
    model = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    assets = relationship("Asset", back_populates="asset_type")
    inventory = relationship("Inventory", back_populates="asset_type")

class Asset(Base):
    __tablename__ = "assets"
    id = Column(String, primary_key=True, default=generate_uuid)
    asset_tag = Column(String, unique=True, index=True)
    serial_number = Column(String, unique=True)
    asset_type_id = Column(String, ForeignKey("asset_types.id"))
    property_id = Column(String, ForeignKey("properties.id"))
    status = Column(String) # In Stock, Deployed, Maintenance, Retired
    purchase_date = Column(DateTime)
    warranty_expiry = Column(DateTime)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    asset_type = relationship("AssetType", back_populates="assets")
    property = relationship("Property", back_populates="assets")

# --- Inventory Tracking ---

class Inventory(Base):
    __tablename__ = "inventory"
    id = Column(String, primary_key=True, default=generate_uuid)
    asset_type_id = Column(String, ForeignKey("asset_types.id"))
    quantity = Column(Integer, default=0)
    threshold_level = Column(Integer, default=5)
    last_updated = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    asset_type = relationship("AssetType", back_populates="inventory")

# --- Procurement Workflow ---

class PurchaseRequest(Base):
    __tablename__ = "purchase_requests"
    id = Column(String, primary_key=True, default=generate_uuid)
    requested_by = Column(String, ForeignKey("users.id"))
    property_id = Column(String, ForeignKey("properties.id"))
    status = Column(String, default="Pending") # Pending, Approved, Rejected
    justification = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    requester = relationship("User", back_populates="purchase_requests")
    property = relationship("Property", back_populates="purchase_requests")
    items = relationship("PurchaseRequestItem", back_populates="purchase_request")
    approvals = relationship("Approval", back_populates="purchase_request")
    purchase_order = relationship("PurchaseOrder", back_populates="purchase_request", uselist=False)

class PurchaseRequestItem(Base):
    __tablename__ = "purchase_request_items"
    id = Column(String, primary_key=True, default=generate_uuid)
    purchase_request_id = Column(String, ForeignKey("purchase_requests.id"))
    asset_type_id = Column(String, ForeignKey("asset_types.id"))
    quantity = Column(Integer)
    estimated_price = Column(Float)

    purchase_request = relationship("PurchaseRequest", back_populates="items")
    asset_type = relationship("AssetType")

# --- Financial Approval ---

class Approval(Base):
    __tablename__ = "approvals"
    id = Column(String, primary_key=True, default=generate_uuid)
    purchase_request_id = Column(String, ForeignKey("purchase_requests.id"))
    approved_by = Column(String, ForeignKey("users.id"))
    status = Column(String)
    approval_notes = Column(Text)
    approved_at = Column(DateTime(timezone=True), server_default=func.now())

    purchase_request = relationship("PurchaseRequest", back_populates="approvals")
    approver = relationship("User", back_populates="approvals")

# --- Purchase Orders ---

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"
    id = Column(String, primary_key=True, default=generate_uuid)
    purchase_request_id = Column(String, ForeignKey("purchase_requests.id"))
    po_number = Column(String, unique=True, index=True)
    total_amount = Column(Float)
    status = Column(String, default="Generated")
    generated_pdf_path = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    purchase_request = relationship("PurchaseRequest", back_populates="purchase_order")
    items = relationship("PurchaseOrderItem", back_populates="purchase_order")
    integration_logs = relationship("FinancialIntegrationLog", back_populates="purchase_order")

class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"
    id = Column(String, primary_key=True, default=generate_uuid)
    purchase_order_id = Column(String, ForeignKey("purchase_orders.id"))
    asset_type_id = Column(String, ForeignKey("asset_types.id"))
    quantity = Column(Integer)
    unit_price = Column(Float)
    total_price = Column(Float)

    purchase_order = relationship("PurchaseOrder", back_populates="items")
    asset_type = relationship("AssetType")

# --- Reporting ---

class Report(Base):
    __tablename__ = "reports"
    id = Column(String, primary_key=True, default=generate_uuid)
    report_type = Column(String) # inventory, financial variance, asset aging
    generated_by = Column(String, ForeignKey("users.id"))
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
    file_path = Column(String)

# --- Audit Logging ---

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"))
    action = Column(String)
    resource_type = Column(String)
    resource_id = Column(String)
    details = Column(Text)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")

# --- Financial System Integration ---

class FinancialIntegrationLog(Base):
    __tablename__ = "financial_integration_logs"
    id = Column(String, primary_key=True, default=generate_uuid)
    purchase_order_id = Column(String, ForeignKey("purchase_orders.id"))
    external_reference = Column(String)
    status = Column(String)
    response_message = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    purchase_order = relationship("PurchaseOrder", back_populates="integration_logs")
