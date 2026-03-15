import os
import sys

# Add the backend to path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app import models
import random
import string

def backfill():
    db = SessionLocal()
    try:
        # Find all approved requests
        approved_requests = db.query(models.PurchaseRequest).filter(models.PurchaseRequest.status == "Approved").all()
        count = 0
        for req in approved_requests:
            # Check if PO exists
            if not req.purchase_order:
                print(f"Backfilling PO for request {req.id}")
                po_number = "PO-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
                total_amount = sum(item.quantity * item.estimated_price for item in req.items) if req.items else 0.0
                
                db_po = models.PurchaseOrder(
                    purchase_request_id=req.id,
                    po_number=po_number,
                    total_amount=total_amount,
                    status="Generated"
                )
                db.add(db_po)
                db.commit()
                db.refresh(db_po)
                
                for req_item in req.items:
                    db_po_item = models.PurchaseOrderItem(
                        purchase_order_id=db_po.id,
                        asset_type_id=req_item.asset_type_id,
                        quantity=req_item.quantity,
                        unit_price=req_item.estimated_price,
                        total_price=req_item.quantity * req_item.estimated_price
                    )
                    db.add(db_po_item)
                db.commit()
                count += 1
        print(f"Successfully backfilled {count} Purchase Orders.")
    finally:
        db.close()

if __name__ == "__main__":
    backfill()
