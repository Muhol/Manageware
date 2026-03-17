from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
import random
import string
import os
from .. import models, schemas
from ..database import get_db
from ..dependencies import check_role, get_current_active_user, SITE_ROLES
from ..services.audit_service import create_audit_log
from ..services.pdf_service import generate_po_pdf
from fastapi.responses import FileResponse

router = APIRouter(tags=["Procurement Workflow"])

@router.post("/purchase-requests/", response_model=schemas.PurchaseRequest)
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

@router.get("/purchase-requests/", response_model=List[schemas.PurchaseRequest])
def read_purchase_requests(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    role = db.query(models.Role).filter(models.Role.id == current_user.role_id).first()
    query = db.query(models.PurchaseRequest).options(
        joinedload(models.PurchaseRequest.items).joinedload(models.PurchaseRequestItem.asset_type),
        joinedload(models.PurchaseRequest.property)
    )
    
    if role and role.name in SITE_ROLES:
        query = query.filter(models.PurchaseRequest.property_id == current_user.property_id)
        
    return query.order_by(models.PurchaseRequest.created_at.desc()).all()

@router.patch("/purchase-requests/{request_id}/approve", response_model=schemas.PurchaseRequest)
def approve_purchase_request(request_id: str, approval_data: schemas.ApprovalCreate, db: Session = Depends(get_db), current_user: models.User = Depends(check_role(["Finance Director", "Administrator"]))):
    db_request = db.query(models.PurchaseRequest).filter(models.PurchaseRequest.id == request_id).first()
    if not db_request:
        raise HTTPException(status_code=404, detail="Purchase request not found")
    
    db_request.status = "Approved"
    
    db_approval = models.Approval(
        purchase_request_id=request_id,
        approved_by=current_user.id,
        status="Approved",
        approval_notes=approval_data.approval_notes
    )
    db.add(db_approval)
    
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
    
    for req_item in db_request.items:
        db_po_item = models.PurchaseOrderItem(
            purchase_order_id=db_po.id,
            asset_type_id=req_item.asset_type_id,
            quantity=req_item.quantity,
            unit_price=req_item.estimated_price,
            total_price=req_item.quantity * req_item.estimated_price
        )
        db.add(db_po_item)
    
    db.commit()
    db.refresh(db_po)
    
    property_name = db_request.property.name if db_request.property else "Global"
    pdf_path = generate_po_pdf(db_po, db_po.items, property_name)
    db_po.generated_pdf_path = pdf_path
    db.add(db_po)
    
    db_finance_log = models.FinancialIntegrationLog(
        purchase_order_id=db_po.id,
        status="PROCESSED",
        response_message="Synced with external accounting system."
    )
    db.add(db_finance_log)
    
    db.commit()
    create_audit_log(db, current_user.id, "APPROVE_REQUEST", "PURCHASE_REQUEST", request_id, 
                     f"Approved request {request_id} and generated PO {po_number}")
    
    db.refresh(db_request)
    return db_request

@router.patch("/purchase-requests/{request_id}/reject", response_model=schemas.PurchaseRequest)
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

@router.get("/purchase-orders/{po_id}/download")
def download_purchase_order(po_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    db_po = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.id == po_id).first()
    if not db_po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")
    
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

@router.get("/purchase-orders/", response_model=List[schemas.PurchaseOrder])
def list_purchase_orders(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    return db.query(models.PurchaseOrder).options(
        joinedload(models.PurchaseOrder.items).joinedload(models.PurchaseOrderItem.asset_type),
        joinedload(models.PurchaseOrder.purchase_request).joinedload(models.PurchaseRequest.property)
    ).order_by(models.PurchaseOrder.created_at.desc()).all()

@router.get("/purchase-requests/{request_id}/po", response_model=schemas.PurchaseOrder)
def get_request_po(request_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    po = db.query(models.PurchaseOrder).options(
        joinedload(models.PurchaseOrder.items).joinedload(models.PurchaseOrderItem.asset_type),
        joinedload(models.PurchaseOrder.purchase_request)
    ).filter(models.PurchaseOrder.purchase_request_id == request_id).first()
    
    if not po:
        # Auto-generate a PO for requests that are Approved but don't have one yet
        # (e.g. seeded data or requests approved before PO generation was implemented)
        db_request = db.query(models.PurchaseRequest).options(
            joinedload(models.PurchaseRequest.items).joinedload(models.PurchaseRequestItem.asset_type),
            joinedload(models.PurchaseRequest.property)
        ).filter(models.PurchaseRequest.id == request_id).first()
        
        if not db_request:
            raise HTTPException(status_code=404, detail="Purchase request not found")
        if db_request.status != "Approved":
            raise HTTPException(status_code=404, detail="No Purchase Order exists for this request. It has not been approved yet.")
        
        # Generate the missing PO on-the-fly
        po_number = "PO-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
        total_amount = sum(item.quantity * item.estimated_price for item in db_request.items)
        
        po = models.PurchaseOrder(
            purchase_request_id=request_id,
            po_number=po_number,
            total_amount=total_amount,
            status="Generated"
        )
        db.add(po)
        db.commit()
        db.refresh(po)
        
        for req_item in db_request.items:
            db_po_item = models.PurchaseOrderItem(
                purchase_order_id=po.id,
                asset_type_id=req_item.asset_type_id,
                quantity=req_item.quantity,
                unit_price=req_item.estimated_price,
                total_price=req_item.quantity * req_item.estimated_price
            )
            db.add(db_po_item)
        
        db.commit()
        db.refresh(po)
        
        try:
            property_name = db_request.property.name if db_request.property else "Global"
            pdf_path = generate_po_pdf(po, po.items, property_name)
            po.generated_pdf_path = pdf_path
            db.add(po)
            db.commit()
        except Exception:
            pass  # PDF generation failure is non-fatal; the PO record still exists
        
        db.refresh(po)
    
    return po
