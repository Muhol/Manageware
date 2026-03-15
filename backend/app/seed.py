from .database import SessionLocal
from . import models, auth
import random
from datetime import datetime, timedelta

def seed():
    db = SessionLocal()
    
    # 1. Seed Roles
    print("Seeding roles...")
    roles_data = [
        {"name": "Administrator", "description": "Full system access and management."},
        {"name": "Property Manager", "description": "Responsible for requesting and tracking hardware assets."},
        {"name": "Finance Director", "description": "Responsible for reviewing and approving procurement requests."},
        {"name": "IT Specialist", "description": "Manages hardware asset tracking and technical aspects."},
        {"name": "Inventory Clerk", "description": "Handles physical tagging and stock-taking at the property level."},
        {"name": "Maintenance Technician", "description": "Updates health and status of assets in the field."},
        {"name": "Site Procurement Officer", "description": "Prepares draft purchase requests for managers."}
    ]
    
    db_roles = {}
    for r in roles_data:
        role = db.query(models.Role).filter(models.Role.name == r["name"]).first()
        if not role:
            role = models.Role(**r)
            db.add(role)
            db.commit()
            db.refresh(role)
        db_roles[r["name"]] = role

    # 2. Seed Properties (15 properties)
    print("Seeding properties...")
    properties_data = [
        {"name": "Westlands Mall", "location": "Nairobi, Westlands", "description": "Commercial Retail Center"},
        {"name": "Kilimani Towers", "location": "Nairobi, Kilimani", "description": "Luxury Residential"},
        {"name": "Mombasa Port Office", "location": "Mombasa, Port South", "description": "Logistics Hub"},
        {"name": "Lavington Green", "location": "Nairobi, Lavington", "description": "Suburban Retail"},
        {"name": "Eldoret Tech Plaza", "location": "Eldoret, CBD", "description": "Tech Hub"},
        {"name": "Kisumu Lake View", "location": "Kisumu, Milimani", "description": "Residential Estate"},
        {"name": "Nakuru Ridge Mall", "location": "Nakuru, Free Area", "description": "Regional Shopping Mall"},
        {"name": "Upper Hill Heights", "location": "Nairobi, Upper Hill", "description": "Corporate Head Office"},
        {"name": "Parklands Medical", "location": "Nairobi, Parklands", "description": "Medical Suites"},
        {"name": "Karen Square", "location": "Nairobi, Karen", "description": "Boutique Retail"},
        {"name": "Thika Road Mall", "location": "Nairobi, Roysambu", "description": "Mixed Use Development"},
        {"name": "Nanyuki Airbase", "location": "Nanyuki, Central", "description": "Strategic Infrastructure"},
        {"name": "Diani Beach Resort", "location": "Kwale, Diani", "description": "Hospitality Asset"},
        {"name": "Machakos People's Plaza", "location": "Machakos, Town", "description": "Civic Center"},
        {"name": "Garissa Crossings", "location": "Garissa, Hub", "description": "Commercial Border Post"},
    ]
    db_properties = []
    for p in properties_data:
        prop = db.query(models.Property).filter(models.Property.name == p["name"]).first()
        if not prop:
            prop = models.Property(**p)
            db.add(prop)
            db.commit()
            db.refresh(prop)
        db_properties.append(prop)

    # 3. Seed Users (25 users for better distribution)
    print("Seeding users...")
    users_data = [
        {"name": "System Admin", "email": "admin@manageware.com", "role": "Administrator"},
        {"name": "John Manager", "email": "john.manager@manageware.com", "role": "Property Manager", "prop": "Westlands Mall"},
        {"name": "Alice Clerk", "email": "alice.clerk@manageware.com", "role": "Inventory Clerk", "prop": "Westlands Mall"},
        {"name": "Bob Tech", "email": "bob.tech@manageware.com", "role": "Maintenance Technician", "prop": "Westlands Mall"},
        {"name": "Jane Finance", "email": "jane.finance@manageware.com", "role": "Finance Director"},
        {"name": "Eve IT", "email": "eve.it@manageware.com", "role": "IT Specialist"},
        {"name": "Charlie Manager", "email": "charlie.manager@manageware.com", "role": "Property Manager", "prop": "Kilimani Towers"},
        {"name": "David Clerk", "email": "david.clerk@manageware.com", "role": "Inventory Clerk", "prop": "Kilimani Towers"},
        {"name": "Frank Tech", "email": "frank.tech@manageware.com", "role": "Maintenance Technician", "prop": "Kilimani Towers"},
        {"name": "Grace Procurement", "email": "grace.proc@manageware.com", "role": "Site Procurement Officer", "prop": "Kilimani Towers"},
    ]
    
    # Add more users to fill properties
    for i in range(1, 15):
        prop_label = properties_data[i]["name"]
        users_data.append({"name": f"Manager {i}", "email": f"manager{i}@manageware.com", "role": "Property Manager", "prop": prop_label})
        users_data.append({"name": f"Clerk {i}", "email": f"clerk{i}@manageware.com", "role": "Inventory Clerk", "prop": prop_label})

    for u in users_data:
        user = db.query(models.User).filter(models.User.email == u["email"]).first()
        prop_obj = next((p for p in db_properties if p.name == u.get("prop")), None)
        
        if not user:
            user = models.User(
                name=u["name"],
                email=u["email"],
                password_hash=auth.get_password_hash("password123" if "admin" not in u["email"] else "admin123"),
                role_id=db_roles[u["role"]].id,
                property_id=prop_obj.id if prop_obj else None
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        
        # If user is a manager, link to property
        if u["role"] == "Property Manager" and prop_obj:
            prop_obj.manager_id = user.id
            db.add(prop_obj)
    
    db.commit()

    # 4. Seed Asset Types (15 types)
    print("Seeding asset types...")
    asset_types_data = [
        {"name": "Laptop Pro", "description": "Developer grade laptop", "manufacturer": "Apple", "model": "MacBook Pro M2"},
        {"name": "Laptop Workstation", "description": "Business laptop", "manufacturer": "Lenovo", "model": "ThinkPad X1"},
        {"name": "Standard Laptop", "description": "General office laptop", "manufacturer": "Dell", "model": "Latitude 5430"},
        {"name": "Desktop PC", "description": "Workstation desktop", "manufacturer": "HP", "model": "EliteDesk 800"},
        {"name": "Enterprise Router", "description": "Main gateway router", "manufacturer": "Cisco", "model": "ISR 4431"},
        {"name": "Layer 3 Switch", "description": "Core switch", "manufacturer": "Ubiquiti", "model": "UniFi Pro 48"},
        {"name": "IP Camera Dome", "description": "Ceiling mounted security", "manufacturer": "Hikvision", "model": "DS-2CD2143G0"},
        {"name": "IP Camera Bullet", "description": "Outdoor surveillance", "manufacturer": "Dahua", "model": "IPC-HFW2431S"},
        {"name": "Biometric Reader", "description": "Access control finger/face", "manufacturer": "ZKTeco", "model": "MB460"},
        {"name": "Point of Sale Terminal", "description": "Retail checkout unit", "manufacturer": "Toast", "model": "Go 2"},
        {"name": "Receipt Printer", "description": "Thermal printer", "manufacturer": "Epson", "model": "TM-T88VI"},
        {"name": "Wi-Fi Access Point", "description": "Ceiling AP", "manufacturer": "TP-Link", "model": "EAP660 HD"},
        {"name": "Network Server", "description": "Rack mount server", "manufacturer": "Dell", "model": "PowerEdge R740"},
        {"name": "Uninterruptible Power Supply", "description": "Backup power", "manufacturer": "APC", "model": "Smart-UPS 1500"},
        {"name": "Barcode Scanner", "description": "Handheld scanner", "manufacturer": "Zebra", "model": "DS2200"},
    ]
    db_asset_types = []
    for at in asset_types_data:
        asset_type = db.query(models.AssetType).filter(models.AssetType.name == at["name"]).first()
        if not asset_type:
            asset_type = models.AssetType(**at)
            db.add(asset_type)
            db.commit()
            db.refresh(asset_type)
        db_asset_types.append(asset_type)

    # 5. Seed Assets (15+ assets)
    print("Seeding assets...")
    statuses = ["Deployed", "In Stock", "Maintenance", "Retired"]
    for i in range(1, 31): # 30 assets
        tag = f"MW-TAG-{i:03d}"
        asset = db.query(models.Asset).filter(models.Asset.asset_tag == tag).first()
        if not asset:
            asset = models.Asset(
                asset_tag=tag,
                serial_number=f"SN-{random.randint(100000, 999999)}",
                asset_type_id=random.choice(db_asset_types).id,
                property_id=random.choice(db_properties).id,
                status=random.choice(statuses),
                purchase_date=datetime.now() - timedelta(days=random.randint(30, 730))
            )
            db.add(asset)
    db.commit()

    # 6. Seed Inventory (15+ lines)
    print("Seeding inventory...")
    for at in db_asset_types:
        inv = db.query(models.Inventory).filter(models.Inventory.asset_type_id == at.id).first()
        if not inv:
            inv = models.Inventory(
                asset_type_id=at.id,
                quantity=random.randint(5, 50),
                threshold_level=random.randint(2, 10)
            )
            db.add(inv)
    db.commit()

    # 7. Seed Purchase Requests (15 requests)
    print("Seeding purchase requests...")
    users = db.query(models.User).filter(models.User.email != "admin@manageware.com").all()
    req_statuses = ["Pending", "Approved", "Rejected"]
    for i in range(1, 16):
        req = models.PurchaseRequest(
            requested_by=random.choice(users).id,
            property_id=random.choice(db_properties).id,
            status=random.choice(req_statuses),
            justification=f"Acquisition for hardware refresh in block {i}.",
            created_at=datetime.now() - timedelta(days=random.randint(1, 30))
        )
        db.add(req)
        db.commit()
        db.refresh(req)
        
        # Add random item to request
        item = models.PurchaseRequestItem(
            purchase_request_id=req.id,
            asset_type_id=random.choice(db_asset_types).id,
            quantity=random.randint(1, 5),
            estimated_price=random.uniform(10000, 200000)
        )
        db.add(item)
    db.commit()

    db.close()
    print("Robust seeding with 15+ entries completed successfully.")

if __name__ == "__main__":
    seed()
