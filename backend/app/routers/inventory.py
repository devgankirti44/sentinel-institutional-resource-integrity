from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models import Item, Department, Vendor, Transaction, PurchaseOrder
from app import schemas
from app.services import ledger
from app.services import detector, investigator, reasoner, policy
from app.models import Notification, AuditLog, CaseStatus
from app.services.agents import smart_reorder_agent, compute_stockout_predictions
router = APIRouter(prefix="/api", tags=["Inventory & Ledger"])


class ItemCreateRequest(BaseModel):
    name: str
    sku: str
    domain: str = "ACADEMIC"
    category: str
    sub_category: Optional[str] = None
    campus_location: Optional[str] = None
    sub_location: Optional[str] = None
    unit: str = "pcs"
    current_stock: int
    reorder_level: int = 10
    unit_price: float

class DepartmentCreateRequest(BaseModel):
    name: str
    code: str
    budget_total: float


class VendorCreateRequest(BaseModel):
    name: str
    contact_email: str
    avg_lead_time_days: int = 7
    on_time_delivery_rate: float = 0.90


@router.get("/items", response_model=List[schemas.ItemResponse])
def get_items(db: Session = Depends(get_db)):
    return db.query(Item).all()


@router.post("/items", response_model=schemas.ItemResponse)
def create_item(body: ItemCreateRequest, db: Session = Depends(get_db)):
    existing = db.query(Item).filter(Item.sku == body.sku).first()
    if existing:
        raise HTTPException(400, "Item SKU already exists")
    item = Item(
        name=body.name,
        sku=body.sku,
        domain=body.domain,
        category=body.category,
        sub_category=body.sub_category,
        campus_location=body.campus_location,
        sub_location=body.sub_location,
        unit=body.unit,
        current_stock=body.current_stock,
        reorder_level=body.reorder_level,
        unit_price=body.unit_price,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/departments", response_model=List[schemas.DepartmentResponse])
def get_departments(db: Session = Depends(get_db)):
    return db.query(Department).all()


@router.post("/departments")
def create_department(body: DepartmentCreateRequest, db: Session = Depends(get_db)):
    existing = db.query(Department).filter(Department.code == body.code).first()
    if existing:
        raise HTTPException(400, "Department code already exists")

    dept = Department(
        name=body.name,
        code=body.code,
        budget_total=body.budget_total,
        budget_used=0.0,
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


@router.get("/vendors", response_model=List[schemas.VendorResponse])
def get_vendors(db: Session = Depends(get_db)):
    return db.query(Vendor).all()


@router.post("/vendors")
def create_vendor(body: VendorCreateRequest, db: Session = Depends(get_db)):
    vendor = Vendor(
        name=body.name,
        contact_email=body.contact_email,
        avg_lead_time_days=body.avg_lead_time_days,
        on_time_delivery_rate=body.on_time_delivery_rate,
    )
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    return vendor




@router.get("/transactions")
def get_transaction_history(
    db: Session = Depends(get_db),
    q: str = "",
    tx_type: str = "",
    date_from: str = "",
    date_to: str = ""
):
    from app.models import Item, Department
    from datetime import datetime
    txns = db.query(Transaction).order_by(Transaction.timestamp.desc()).all()
    result = []
    for t in txns:
        item = db.query(Item).filter(Item.id == t.item_id).first()
        dept = db.query(Department).filter(Department.id == t.department_id).first() if t.department_id else None
        item_name = item.name if item else f"Item #{t.item_id}"
        dept_name = dept.name if dept else "—"
        if q and q.lower() not in item_name.lower() and q.lower() not in (t.notes or "").lower():
            continue
        if tx_type and t.type != tx_type:
            continue
        if date_from:
            try:
                if t.timestamp < datetime.fromisoformat(date_from):
                    continue
            except: pass
        if date_to:
            try:
                if t.timestamp > datetime.fromisoformat(date_to):
                    continue
            except: pass
        result.append({
            "id":           t.id,
            "type":         t.type,
            "item_id":      t.item_id,
            "item_name":    item_name,
            "department_name": dept_name,
            "quantity":     t.quantity,
            "unit_price":   t.unit_price,
            "total_value":  t.total_value,
            "timestamp":    t.timestamp.isoformat() if t.timestamp else None,
            "notes":        t.notes or "",
        })
    return result


@router.get("/analytics/expenditure")
def get_expenditure_analytics(db: Session = Depends(get_db)):
    return ledger.get_expenditure_analytics(db)

@router.post("/transactions/issue", response_model=schemas.TransactionResponse)
def issue_resource(txn_data: schemas.TransactionCreate, db: Session = Depends(get_db)):
    try:
        txn = ledger.record_transaction(
            db=db,
            item_id=txn_data.item_id,
            txn_type=txn_data.type,
            quantity=txn_data.quantity,
            department_id=txn_data.department_id,
            notes=txn_data.notes,
        )

        # === SMART REORDER AGENT — fires after stock deducted ===
        try:
            pr = smart_reorder_agent(
                db=db,
                item_id=txn_data.item_id,
                department_id=txn_data.department_id,
            )
            if pr:
                noti = Notification(
                    title="🤖 Auto-Reorder PR Created",
                    message=f"Smart Reorder Agent created PR-{pr.id} for {pr.title}."
                )
                db.add(noti)
                db.commit()
        except Exception as agent_err:
            print(f"[ReorderAgent] Non-fatal error: {agent_err}")

        # === DYNAMIC AUTO-TRIGGER AGENT ON DISPATCH ===
        case = detector.detect_item_anomaly(
            db, 
            item_id=txn_data.item_id, 
            department_id=txn_data.department_id, 
            requested_qty=txn_data.quantity
        )

        if case:
            evidence_summary = investigator.run_investigation_tools(db, case)
            ai_result = reasoner.generate_case_reasoning(case.title, evidence_summary)
            case.ai_narrative = ai_result.get("narrative")
            case.ai_hypotheses = str(ai_result.get("hypotheses"))
            case.ai_confidence = ai_result.get("confidence")
            db.commit()

            policy.evaluate_and_apply_policy(
                db=db,
                case=case,
                proposed_action=ai_result.get("recommended_action", "DRAFT_PO"),
                payload=ai_result.get("action_payload", {})
            )

            # Write Notification
            noti = Notification(
                title="🚨 ANOMALY DETECTED ON DISPATCH",
                message=f"Case {case.case_number}: Anomaly triggered for {case.title}."
            )
            db.add(noti)
            db.commit()

        return txn

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))