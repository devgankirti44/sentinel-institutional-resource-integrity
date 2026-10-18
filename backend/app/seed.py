import os
os.environ["DISABLE_SQLALCHEMY_CEXT"] = "1"

from sqlalchemy.orm import Session
from app.models import (
    Item, Department, Vendor, Transaction, Baseline, TxnType,
    User, UserRole, Asset, AssetStatus, Location, MovementHistory
)
from app.database import SessionLocal, engine, Base
from datetime import datetime, timedelta
import hashlib


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def seed_data():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    if db.query(Department).count() > 0:
        db.close()
        return {"message": "Database already seeded."}

    # ──────────────────────────────────────────────
    # 1. DEPARTMENTS
    # ──────────────────────────────────────────────
    dept_academic    = Department(name="Academic Affairs",      code="ACAD",  budget_total=500000, budget_used=120000)
    dept_hostel      = Department(name="Hostel Administration", code="HSTL",  budget_total=300000, budget_used=40000)
    dept_sports      = Department(name="Sports Department",     code="SPRT",  budget_total=200000, budget_used=30000)
    dept_medical     = Department(name="Medical Center",        code="MED",   budget_total=250000, budget_used=60000)
    dept_mess        = Department(name="Mess & Catering",       code="MESS",  budget_total=600000, budget_used=210000)
    dept_maintenance = Department(name="Maintenance & Works",   code="MAINT", budget_total=350000, budget_used=90000)

    db.add_all([dept_academic, dept_hostel, dept_sports,
                dept_medical, dept_mess, dept_maintenance])
    db.commit()

    # ──────────────────────────────────────────────
    # 2. LOCATION HIERARCHY
    # ──────────────────────────────────────────────
    campus = Location(name="Main Campus", type="CAMPUS", parent_id=None)
    db.add(campus)
    db.commit()

    central_store  = Location(name="Central Store",           type="STORE",    parent_id=campus.id)
    acad_block     = Location(name="Academic Block A",         type="BUILDING", parent_id=campus.id)
    hostel_a       = Location(name="Hostel A (Boys)",          type="HOSTEL",   parent_id=campus.id)
    sports_complex = Location(name="Sports Complex",           type="BUILDING", parent_id=campus.id)
    medical_center = Location(name="Medical Center",           type="BUILDING", parent_id=campus.id)
    mess_hall      = Location(name="Main Mess Hall",           type="BUILDING", parent_id=campus.id)
    maint_yard     = Location(name="Maintenance Yard & Store", type="STORE",    parent_id=campus.id)
    db.add_all([central_store, acad_block, hostel_a, sports_complex,
                medical_center, mess_hall, maint_yard])
    db.commit()

    cs_lab         = Location(name="CS Computer Lab 1",    type="LAB",  parent_id=acad_block.id)
    hostel_room101 = Location(name="Hostel A – Room 101",  type="ROOM", parent_id=hostel_a.id)
    db.add_all([cs_lab, hostel_room101])
    db.commit()

    # ──────────────────────────────────────────────
    # 3. USERS
    # ──────────────────────────────────────────────
    admin = User(
        username="admin", password_hash=hash_password("admin"),
        full_name="Super Admin", role=UserRole.SUPER_ADMIN
    )

    hod_acad  = User(username="hod_acad",  password_hash=hash_password("password"),
                     full_name="Dr. Meera Iyer",      role=UserRole.DEPT_HEAD,
                     department_id=dept_academic.id)
    hod_hstl  = User(username="hod_hstl",  password_hash=hash_password("password"),
                     full_name="Mr. Ramesh Warden",   role=UserRole.DEPT_HEAD,
                     department_id=dept_hostel.id)
    hod_sprt  = User(username="hod_sprt",  password_hash=hash_password("password"),
                     full_name="Coach Priya Nair",    role=UserRole.DEPT_HEAD,
                     department_id=dept_sports.id)
    hod_med   = User(username="hod_med",   password_hash=hash_password("password"),
                     full_name="Dr. Arun Verma",      role=UserRole.DEPT_HEAD,
                     department_id=dept_medical.id)
    hod_mess  = User(username="hod_mess",  password_hash=hash_password("password"),
                     full_name="Mr. Suresh Caterer",  role=UserRole.DEPT_HEAD,
                     department_id=dept_mess.id)
    hod_maint = User(username="hod_maint", password_hash=hash_password("password"),
                     full_name="Mr. Vikram Engineer", role=UserRole.DEPT_HEAD,
                     department_id=dept_maintenance.id)

    store_acad  = User(username="store_acad",  password_hash=hash_password("password"),
                       full_name="Anil Stores (Academic)",  role=UserRole.STOREKEEPER,
                       department_id=dept_academic.id)
    store_hstl  = User(username="store_hstl",  password_hash=hash_password("password"),
                       full_name="Beena Stores (Hostel)",   role=UserRole.STOREKEEPER,
                       department_id=dept_hostel.id)
    store_sprt  = User(username="store_sprt",  password_hash=hash_password("password"),
                       full_name="Chetan Stores (Sports)",  role=UserRole.STOREKEEPER,
                       department_id=dept_sports.id)
    store_med   = User(username="store_med",   password_hash=hash_password("password"),
                       full_name="Deepa Stores (Medical)",  role=UserRole.STOREKEEPER,
                       department_id=dept_medical.id)
    store_mess  = User(username="store_mess",  password_hash=hash_password("password"),
                       full_name="Elango Stores (Mess)",    role=UserRole.STOREKEEPER,
                       department_id=dept_mess.id)
    store_maint = User(username="store_maint", password_hash=hash_password("password"),
                       full_name="Farhan Stores (Maint)",   role=UserRole.STOREKEEPER,
                       department_id=dept_maintenance.id)

    procurement = User(username="procurement", password_hash=hash_password("password"),
                       full_name="Alice Procurement", role=UserRole.PROCUREMENT_OFFICER)
    finance     = User(username="finance",     password_hash=hash_password("password"),
                       full_name="Carol Finance",    role=UserRole.FINANCE_OFFICER)
    auditor     = User(username="auditor",     password_hash=hash_password("password"),
                       full_name="Dave Auditor",     role=UserRole.AUDITOR)

    db.add_all([
        admin,
        hod_acad, hod_hstl, hod_sprt, hod_med, hod_mess, hod_maint,
        store_acad, store_hstl, store_sprt, store_med, store_mess, store_maint,
        procurement, finance, auditor
    ])
    db.commit()

    # ──────────────────────────────────────────────
    # 4. VENDORS
    # ──────────────────────────────────────────────
    v_fast = Vendor(name="Apex Tech Supplies",      contact_email="devgankirti44@gmail.com",
                    phone="+91 98765 43210", avg_lead_time_days=2,  on_time_delivery_rate=0.96)
    v_bulk = Vendor(name="Global Bulk Logistics",   contact_email="devgankirti44@gmail.com",
                    phone="+91 87654 32109", avg_lead_time_days=7,  on_time_delivery_rate=0.78)
    v_pharma= Vendor(name="MedLine Pharmaceuticals",contact_email="devgankirti44@gmail.com",
                    phone="+91 99001 12345", avg_lead_time_days=3,  on_time_delivery_rate=0.91)
    v_sports= Vendor(name="Champion Sports Goods",  contact_email="devgankirti44@gmail.com",
                    phone="+91 88123 45678", avg_lead_time_days=5,  on_time_delivery_rate=0.85)
    v_maint = Vendor(name="BuildRight Hardware",    contact_email="devgankirti44@gmail.com",
                    phone="+91 77234 56789", avg_lead_time_days=4,  on_time_delivery_rate=0.88)
    db.add_all([v_fast, v_bulk, v_pharma, v_sports, v_maint])
    db.commit()

    # ──────────────────────────────────────────────
    # 5. ITEMS — all 6 domains, atomic sub_location
    # ──────────────────────────────────────────────

    # ── ACADEMIC ──────────────────────────────────
    gpu   = Item(name="NVIDIA RTX 4090 GPU",          sku="GPU-4090",
                 domain="ACADEMIC", category="Electronics",    sub_category="GPU",
                 campus_location="Science Block",  sub_location="Computer Lab 401",
                 unit="pcs",    current_stock=12, reorder_level=5,  unit_price=160000)

    toner = Item(name="HP LaserJet Toner Cartridge",  sku="TONER-HP-05",
                 domain="ACADEMIC", category="Consumables",    sub_category="Cartridge",
                 campus_location="Science Block",  sub_location="Computer Lab 401",
                 unit="pcs",    current_stock=15, reorder_level=10, unit_price=4500)

    paper = Item(name="A4 Printing Paper (Box of 5)", sku="PAPER-A4-BOX",
                 domain="ACADEMIC", category="Stationery",     sub_category="Paper",
                 campus_location="Main Academic Block", sub_location="Staff Room",
                 unit="boxes",  current_stock=45, reorder_level=20, unit_price=1200)

    osc   = Item(name="Digital Storage Oscilloscope", sku="DSO-100MHZ",
                 domain="ACADEMIC", category="Lab Equipment",  sub_category="Oscilloscope",
                 campus_location="Science Block",  sub_location="Electronics Lab 501",
                 unit="pcs",    current_stock=8,  reorder_level=3,  unit_price=35000)

    # ── HOSTEL ────────────────────────────────────
    fan   = Item(name="Ceiling Fan (1200mm)",          sku="FAN-CEIL-1200",
                 domain="HOSTEL", category="Electrical",       sub_category="Fan",
                 campus_location="Boys Hostel",    sub_location="Hostel A - Common Area",
                 unit="pcs",    current_stock=40, reorder_level=10, unit_price=3200)

    bed   = Item(name="Single Steel Bed Frame",        sku="BED-STL-SGL",
                 domain="HOSTEL", category="Furniture",        sub_category="Bed Frame",
                 campus_location="Boys Hostel",    sub_location="Boys Hostel - Store Room",
                 unit="pcs",    current_stock=80, reorder_level=20, unit_price=8500)

    linen = Item(name="Cotton Bedsheet Set",           sku="LINEN-BED-CTN",
                 domain="HOSTEL", category="Linen",            sub_category="Bedsheet",
                 campus_location="Boys Hostel",    sub_location="Boys Hostel - Store Room",
                 unit="sets",   current_stock=120,reorder_level=30, unit_price=650)

    bucket= Item(name="Plastic Bucket 20L",            sku="BUCK-PLS-20L",
                 domain="HOSTEL", category="Consumables",      sub_category="Bucket",
                 campus_location="Boys Hostel",    sub_location="Boys Hostel - Common Area",
                 unit="pcs",    current_stock=60, reorder_level=15, unit_price=180)

    # ── SPORTS ────────────────────────────────────
    cricket  = Item(name="Cricket Kit (Full Set)",     sku="CRICK-KIT-FS",
                    domain="SPORTS", category="Equipment",     sub_category="Cricket Kit",
                    campus_location="Sports Complex", sub_location="Cricket Ground Store",
                    unit="sets",  current_stock=5,  reorder_level=2,  unit_price=22000)

    football = Item(name="FIFA Standard Football",     sku="BALL-FOOT-FIFA",
                    domain="SPORTS", category="Equipment",     sub_category="Football",
                    campus_location="Sports Complex", sub_location="Outdoor Store",
                    unit="pcs",   current_stock=12, reorder_level=4,  unit_price=1800)

    treadmill= Item(name="Commercial Treadmill",       sku="GYM-TREAD-COM",
                    domain="SPORTS", category="Gym Equipment", sub_category="Treadmill",
                    campus_location="Sports Complex", sub_location="Gymnasium",
                    unit="pcs",   current_stock=3,  reorder_level=1,  unit_price=85000)

    badminton= Item(name="Badminton Racket (Pair)",    sku="RACKET-BAD-PR",
                    domain="SPORTS", category="Equipment",     sub_category="Racket",
                    campus_location="Sports Complex", sub_location="Indoor Hall",
                    unit="pairs", current_stock=20, reorder_level=6,  unit_price=1200)

    # ── MEDICAL ───────────────────────────────────
    para  = Item(name="Paracetamol 500mg (Strip×10)", sku="MED-PARA-500",
                 domain="MEDICAL", category="Medicines",       sub_category="Analgesic",
                 campus_location="Medical Center", sub_location="Pharmacy Store",
                 unit="strips", current_stock=200,reorder_level=50, unit_price=18)

    first = Item(name="First Aid Box (Standard)",     sku="FAB-STD-01",
                 domain="MEDICAL", category="Consumables",     sub_category="First Aid",
                 campus_location="Medical Center", sub_location="First Aid Room",
                 unit="pcs",    current_stock=15, reorder_level=5,  unit_price=950)

    bp    = Item(name="Digital BP Monitor",           sku="BP-MON-DIG",
                 domain="MEDICAL", category="Equipment",       sub_category="BP Monitor",
                 campus_location="Medical Center", sub_location="OPD Room",
                 unit="pcs",    current_stock=4,  reorder_level=2,  unit_price=3200)

    gloves= Item(name="Surgical Gloves (Box×100)",    sku="GLOVE-SRG-100",
                 domain="MEDICAL", category="Consumables",     sub_category="PPE",
                 campus_location="Medical Center", sub_location="Pharmacy Store",
                 unit="boxes",  current_stock=30, reorder_level=10, unit_price=280)

    # ── MESS ──────────────────────────────────────
    rice  = Item(name="Basmati Rice (50 kg bag)",     sku="RICE-BAS-50KG",
                 domain="MESS", category="Raw Materials",      sub_category="Grain",
                 campus_location="Central Mess",    sub_location="Dry Store",
                 unit="bags",   current_stock=80, reorder_level=25, unit_price=2800)

    plate = Item(name="Stainless Steel Plate",        sku="PLATE-SS-01",
                 domain="MESS", category="Utensils",           sub_category="Plate",
                 campus_location="Central Mess",    sub_location="Main Kitchen",
                 unit="pcs",    current_stock=300,reorder_level=50, unit_price=120)

    lpg   = Item(name="LPG Cylinder (Commercial)",    sku="LPG-COM-19KG",
                 domain="MESS", category="Fuel",               sub_category="LPG",
                 campus_location="Central Mess",    sub_location="Gas Bank",
                 unit="pcs",    current_stock=10, reorder_level=4,  unit_price=1900)

    oil   = Item(name="Refined Cooking Oil (15 L)",   sku="OIL-COOK-15L",
                 domain="MESS", category="Raw Materials",      sub_category="Oil",
                 campus_location="Central Mess",    sub_location="Dry Store",
                 unit="tins",   current_stock=25, reorder_level=8,  unit_price=1650)

    # ── MAINTENANCE ───────────────────────────────
    wire  = Item(name="Electrical Wire 2.5mm (100m)", sku="WIRE-ELEC-100M",
                 domain="MAINT", category="Electrical",        sub_category="Wire",
                 campus_location="Maintenance Store", sub_location="Electrical Workshop",
                 unit="rolls",  current_stock=20, reorder_level=6,  unit_price=3400)

    paint = Item(name="Exterior Paint 20L",           sku="PAINT-EXT-20L",
                 domain="MAINT", category="Paint",             sub_category="Exterior Paint",
                 campus_location="Maintenance Store", sub_location="General Store",
                 unit="buckets",current_stock=18, reorder_level=5,  unit_price=2800)

    drill = Item(name="Cordless Power Drill",         sku="DRILL-CORD-18V",
                 domain="MAINT", category="Tools",             sub_category="Power Drill",
                 campus_location="Maintenance Store", sub_location="Carpentry Workshop",
                 unit="pcs",    current_stock=6,  reorder_level=2,  unit_price=7500)

    pipe  = Item(name="PVC Pipe 4-inch (6m)",         sku="PIPE-PVC-4IN-6M",
                 domain="MAINT", category="Plumbing",          sub_category="PVC Pipe",
                 campus_location="Maintenance Store", sub_location="Plumbing Store",
                 unit="pcs",    current_stock=35, reorder_level=10, unit_price=680)

    db.add_all([
        gpu, toner, paper, osc,
        fan, bed, linen, bucket,
        cricket, football, treadmill, badminton,
        para, first, bp, gloves,
        rice, plate, lpg, oil,
        wire, paint, drill, pipe
    ])
    db.commit()

    # ──────────────────────────────────────────────
    # 6. FIXED ASSETS
    # ──────────────────────────────────────────────
    ast1 = Asset(asset_tag="AST-101", name="Dell XPS 15 Workstation",
                 category="IT Equipment", purchase_cost=145000,
                 status=AssetStatus.ASSIGNED,
                 assigned_user_id=hod_acad.id,
                 assigned_department_id=dept_academic.id,
                 location_id=cs_lab.id)
    ast2 = Asset(asset_tag="AST-102", name="Epson 4K Lab Projector",
                 category="Lab Equipment", purchase_cost=85000,
                 status=AssetStatus.AVAILABLE, location_id=central_store.id)
    ast3 = Asset(asset_tag="AST-201", name="Treadmill – Gym Unit 1",
                 category="Gym Equipment", purchase_cost=85000,
                 status=AssetStatus.ASSIGNED,
                 assigned_department_id=dept_sports.id,
                 location_id=sports_complex.id)
    db.add_all([ast1, ast2, ast3])
    db.commit()

    mv1 = MovementHistory(resource_type="ASSET", resource_id=ast1.id,
                          action="PURCHASED", from_location_id=None,
                          to_location_id=central_store.id, quantity=1,
                          actor="Procurement", reference="PO-1001",
                          notes="Received from Apex Tech Supplies")
    mv2 = MovementHistory(resource_type="ASSET", resource_id=ast1.id,
                          action="TRANSFERRED", from_location_id=central_store.id,
                          to_location_id=cs_lab.id, quantity=1,
                          actor="store_acad", reference="TR-204",
                          notes="Allocated to CS Computer Lab 1")
    db.add_all([mv1, mv2])
    db.commit()

    # ──────────────────────────────────────────────
    # 7. BASELINES
    # ──────────────────────────────────────────────
    now = datetime.utcnow()
    for day in range(25, 5, -5):
        txn = Transaction(
            item_id=toner.id,
            department_id=dept_academic.id,
            type=TxnType.ISSUE,
            quantity=1,
            unit_price=toner.unit_price,
            total_value=toner.unit_price,
            notes="Routine department issuance",
            timestamp=now - timedelta(days=day)
        )
        db.add(txn)
    db.commit()

    b1 = Baseline(item_id=toner.id, department_id=dept_academic.id,
                  avg_daily_usage=0.1, std_deviation=0.05)
    b2 = Baseline(item_id=gpu.id,   department_id=dept_academic.id,
                  avg_daily_usage=0.2, std_deviation=0.1)
    db.add_all([b1, b2])
    db.commit()

    db.close()
    return {"message": "Sentinel seeded: 6 domains, 24 items with atomic locations, 15 users, 5 vendors."}


if __name__ == "__main__":
    result = seed_data()
    print(result["message"])