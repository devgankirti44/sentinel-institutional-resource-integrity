import os
os.environ["DISABLE_SQLALCHEMY_CEXT"] = "1"

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.database import get_db
from app.models import (
    PurchaseOrder, POStatus, Item, Vendor, Department,
    Bill, Transaction, TxnType, Notification, AuditLog,
    Case, Evidence, CaseTimelineEvent,
    CaseStatus, CaseSeverity, SignalType, ActionType, RiskClass, User
)
from app.services.email import (
    email_hod_new_requisition,
    email_vendor_complaint,
    email_storekeeper_approved,
    email_finance_payment_due
)

router = APIRouter(prefix="/api/procurement", tags=["Procure-to-Pay"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class RequisitionCreate(BaseModel):
    item_id: int
    department_id: int
    vendor_id: Optional[int] = None
    quantity: int
    unit_price: Optional[float] = None
    justification: str
    raised_by_user_id: Optional[int] = None

class PRItemLine(BaseModel):
    item_id: int
    quantity: int
    unit_price: float

class PRCreate(BaseModel):
    title: str
    justification: Optional[str] = None
    department_id: int
    requested_by_id: int
    items: List[PRItemLine]

class PRApprovePayload(BaseModel):
    user_id: int

class PRRejectPayload(BaseModel):
    user_id: int
    reason: Optional[str] = "Rejected"

class POCreateFromPR(BaseModel):
    pr_id: int
    vendor_id: int
    expected_delivery: Optional[str] = None
    user_id: int

class ReceiveGoods(BaseModel):
    received_quantity: int
    notes: Optional[str] = None

class BillCreate(BaseModel):
    po_id: int
    bill_number: str
    billed_quantity: int
    billed_amount: float

class RejectPayload(BaseModel):
    reason: str
    rejected_by: str = "HOD"


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_hod_for_dept(db: Session, department_id: int) -> Optional[User]:
    return db.query(User).filter(
        User.department_id == department_id,
        User.role == "DEPT_HEAD",
        User.is_active == True
    ).first()

def get_finance_officer(db: Session) -> Optional[User]:
    return db.query(User).filter(
        User.role == "FINANCE_OFFICER",
        User.is_active == True
    ).first()

def get_storekeeper_for_dept(db: Session, department_id: int) -> Optional[User]:
    """Get domain-specific storekeeper first, fall back to any storekeeper."""
    sk = db.query(User).filter(
        User.department_id == department_id,
        User.role == "STOREKEEPER",
        User.is_active == True
    ).first()
    if not sk:
        sk = db.query(User).filter(
            User.role == "STOREKEEPER",
            User.is_active == True
        ).first()
    return sk


# ── PURCHASE REQUESTS (new role-filtered PR system) ───────────────────────────

@router.get("/purchase-requests")
def list_purchase_requests(
    user_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Role-filtered PR list.
    DEPT_HEAD  → only their department's PRs (PENDING_APPROVAL / DRAFT).
    Others     → all PRs.
    """
    q = db.query(PurchaseOrder)

    if user_id:
        requesting_user = db.query(User).filter(User.id == user_id).first()
        if requesting_user and requesting_user.role == "DEPT_HEAD" and requesting_user.department_id:
            q = q.filter(PurchaseOrder.department_id == requesting_user.department_id)

    pos = q.order_by(PurchaseOrder.created_at.desc()).all()
    out = []
    for po in pos:
        item = db.query(Item).filter(Item.id == po.item_id).first()
        dept = db.query(Department).filter(Department.id == po.department_id).first()
        status_val = po.status.value if hasattr(po.status, "value") else str(po.status)
        out.append({
            "id":               po.id,
            "title":            f"{item.name if item else 'Item'} × {po.quantity}",
            "department_id":    po.department_id,
            "department_name":  dept.name if dept else None,
            "status":           status_val,
            "justification":    getattr(po, "justification", None) or "",
            "total_estimated":  po.total_amount,
            "created_at":       po.created_at.isoformat() if po.created_at else None,
        })
    return out


@router.post("/purchase-requests")
def create_purchase_request(body: PRCreate, db: Session = Depends(get_db)):
    """
    HOD / Procurement submits a PR with one or more item lines.
    Creates one PurchaseOrder per item line (existing model).
    Emails HOD for department notification.
    """
    dept = db.query(Department).filter(Department.id == body.department_id).first()
    if not dept:
        raise HTTPException(404, "Department not found")

    if not body.items:
        raise HTTPException(400, "At least one item line required")

    created_pos = []
    total_estimated = 0.0

    for line in body.items:
        item = db.query(Item).filter(Item.id == line.item_id).first()
        if not item:
            raise HTTPException(404, f"Item {line.item_id} not found")

        best_vendor = db.query(Vendor).filter(
            Vendor.is_blacklisted == False
        ).order_by(Vendor.on_time_delivery_rate.desc()).first()

        line_total = line.quantity * line.unit_price
        total_estimated += line_total

        po_number = f"REQ-{int(datetime.utcnow().timestamp())}-{line.item_id}"
        po = PurchaseOrder(
            po_number=po_number,
            vendor_id=best_vendor.id if best_vendor else 1,
            item_id=line.item_id,
            department_id=body.department_id,
            quantity=line.quantity,
            unit_price=line.unit_price,
            total_amount=line_total,
            status=POStatus.PENDING_APPROVAL,
        )
        db.add(po)
        db.flush()
        created_pos.append(po)

        db.add(AuditLog(
            entity_type="PURCHASE_REQUEST", entity_id=po.id,
            action="PR_CREATED", actor=f"USER_{body.requested_by_id}",
            details=f"{po_number}: {line.quantity}× {item.name} @ ₹{line.unit_price}"
        ))

    # Notify HOD by email
    hod = get_hod_for_dept(db, body.department_id)
    if hod and hod.username:
        first_item = db.query(Item).filter(Item.id == body.items[0].item_id).first()
        try:
            email_hod_new_requisition(
                hod_email=f"{hod.username}@sentinel.edu",
                hod_name=hod.full_name,
                item_name=first_item.name if first_item else "items",
                quantity=body.items[0].quantity,
                department=dept.name,
                raised_by=str(body.requested_by_id),
                justification=body.justification or "No justification provided",
                po_number=created_pos[0].po_number if created_pos else "—"
            )
        except Exception:
            pass  # Email failure must never block the API response

    db.add(Notification(
        title=f"📋 NEW PURCHASE REQUEST — {dept.name}",
        message=f"{len(body.items)} item(s) requested. Total estimated: ₹{total_estimated:,.2f}. Awaiting HOD approval."
    ))
    db.commit()

    return {
        "message": "Purchase request submitted",
        "purchase_orders_created": len(created_pos),
        "total_estimated": total_estimated,
        "po_numbers": [p.po_number for p in created_pos],
        "hod_notified": hod is not None
    }


@router.post("/purchase-requests/{pr_id}/approve")
def approve_purchase_request(pr_id: int, body: PRApprovePayload, db: Session = Depends(get_db)):
    """
    HOD approves a PR. Budget gate applied here.
    Emails storekeeper of the department.
    """
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == pr_id).first()
    if not po:
        raise HTTPException(404, "Purchase request not found")

    if po.status not in [POStatus.PENDING_APPROVAL, POStatus.DRAFT]:
        raise HTTPException(400, f"Cannot approve PR in status {po.status}")

    dept = db.query(Department).filter(Department.id == po.department_id).first()
    item = db.query(Item).filter(Item.id == po.item_id).first()
    vendor = db.query(Vendor).filter(Vendor.id == po.vendor_id).first()

    # ── BUDGET GATE ──────────────────────────────────────────────────────────
    if dept and dept.budget_remaining < po.total_amount:
        raise HTTPException(400, {
            "error": "BUDGET_INSUFFICIENT",
            "message": (
                f"Cannot approve. {dept.name} has ₹{dept.budget_remaining:,.2f} "
                f"remaining but this PR requires ₹{po.total_amount:,.2f}."
            ),
            "budget_remaining": dept.budget_remaining,
            "po_amount": po.total_amount,
            "gap": round(po.total_amount - dept.budget_remaining, 2)
        })

    approving_user = db.query(User).filter(User.id == body.user_id).first()
    po.status = POStatus.APPROVED
    po.approved_at = datetime.utcnow()

    if dept:
        dept.budget_used = (dept.budget_used or 0) + po.total_amount

    db.add(Notification(
        title="✅ PURCHASE REQUEST APPROVED",
        message=f"{po.po_number} approved by {approving_user.full_name if approving_user else 'HOD'}. ₹{po.total_amount:,.2f} reserved."
    ))
    db.add(AuditLog(
        entity_type="PURCHASE_REQUEST", entity_id=po.id,
        action="PR_APPROVED",
        actor=approving_user.username if approving_user else "HOD",
        details=f"Approved {po.po_number}. Budget deducted: ₹{po.total_amount:,.2f}"
    ))

    # Email storekeeper
    storekeeper = get_storekeeper_for_dept(db, po.department_id)
    if storekeeper and storekeeper.username:
        try:
            email_storekeeper_approved(
                store_email=f"{storekeeper.username}@sentinel.edu",
                store_name=storekeeper.full_name,
                po_number=po.po_number,
                item_name=item.name if item else "Item",
                quantity=po.quantity,
                vendor_name=vendor.name if vendor else "Vendor"
            )
        except Exception:
            pass

    db.commit()
    return {
        "message": "Purchase request approved",
        "po_number": po.po_number,
        "status": "APPROVED",
        "budget_remaining": dept.budget_remaining if dept else None
    }


@router.post("/purchase-requests/{pr_id}/reject")
def reject_purchase_request(pr_id: int, body: PRRejectPayload, db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == pr_id).first()
    if not po:
        raise HTTPException(404, "Purchase request not found")

    rejecting_user = db.query(User).filter(User.id == body.user_id).first()
    po.status = POStatus.CANCELLED

    db.add(Notification(
        title="❌ PURCHASE REQUEST REJECTED",
        message=f"{po.po_number} rejected. Reason: {body.reason}"
    ))
    db.add(AuditLog(
        entity_type="PURCHASE_REQUEST", entity_id=po.id,
        action="PR_REJECTED",
        actor=rejecting_user.username if rejecting_user else "HOD",
        details=f"Rejected: {body.reason}"
    ))
    db.commit()

    return {
        "message": "Purchase request rejected",
        "po_number": po.po_number,
        "status": "CANCELLED"
    }


# ── PURCHASE ORDERS ───────────────────────────────────────────────────────────

@router.get("/purchase-orders")
def list_purchase_orders(
    department_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    q = db.query(PurchaseOrder)
    if department_id:
        q = q.filter(PurchaseOrder.department_id == department_id)
    pos = q.order_by(PurchaseOrder.created_at.desc()).all()

    out = []
    for po in pos:
        item   = db.query(Item).filter(Item.id == po.item_id).first()
        vendor = db.query(Vendor).filter(Vendor.id == po.vendor_id).first()
        dept   = db.query(Department).filter(Department.id == po.department_id).first()
        out.append({
            "id":                  po.id,
            "po_number":           po.po_number,
            "status":              po.status.value if hasattr(po.status, "value") else str(po.status),
            "quantity":            po.quantity,
            "unit_price":          po.unit_price,
            "total_amount":        po.total_amount,
            "item_name":           item.name if item else None,
            "vendor_name":         vendor.name if vendor else None,
            "vendor_phone":        vendor.phone if vendor else None,
            "department_name":     dept.name if dept else None,
            "created_by_case_id":  po.created_by_case_id,
            "created_at":          po.created_at.isoformat() if po.created_at else None,
        })
    return out


@router.post("/purchase-orders")
def create_purchase_order_from_pr(body: POCreateFromPR, db: Session = Depends(get_db)):
    """
    Procurement officer creates a formal PO from an approved PR,
    selecting the vendor and expected delivery date.
    """
    pr = db.query(PurchaseOrder).filter(PurchaseOrder.id == body.pr_id).first()
    if not pr:
        raise HTTPException(404, "Purchase request not found")

    if pr.status != POStatus.APPROVED:
        raise HTTPException(400, f"PR must be APPROVED before creating PO (current: {pr.status})")

    vendor = db.query(Vendor).filter(Vendor.id == body.vendor_id).first()
    if not vendor:
        raise HTTPException(404, "Vendor not found")

    # Update the existing PR/PO row with the chosen vendor and mark as ORDERED
    pr.vendor_id = body.vendor_id
    pr.status    = POStatus.APPROVED  # stays APPROVED until received

    creating_user = db.query(User).filter(User.id == body.user_id).first()
    item          = db.query(Item).filter(Item.id == pr.item_id).first()

    db.add(Notification(
        title=f"🛒 PURCHASE ORDER ISSUED — {pr.po_number}",
        message=(
            f"PO for {pr.quantity}× {item.name if item else 'item'} "
            f"issued to {vendor.name}. Amount: ₹{pr.total_amount:,.2f}"
        )
    ))
    db.add(AuditLog(
        entity_type="PURCHASE_ORDER", entity_id=pr.id,
        action="PO_ISSUED",
        actor=creating_user.username if creating_user else "PROCUREMENT",
        details=f"PO issued to {vendor.name} for ₹{pr.total_amount:,.2f}"
    ))
    db.commit()

    return {
        "message":    "Purchase order issued",
        "po_number":  pr.po_number,
        "vendor":     vendor.name,
        "amount":     pr.total_amount,
        "status":     "APPROVED"
    }


@router.post("/purchase-orders/{po_id}/approve")
def approve_purchase_order(po_id: int, db: Session = Depends(get_db)):
    po   = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(404, "PO not found")

    dept   = db.query(Department).filter(Department.id == po.department_id).first()
    item   = db.query(Item).filter(Item.id == po.item_id).first()
    vendor = db.query(Vendor).filter(Vendor.id == po.vendor_id).first()

    # ── BUDGET GATE ──────────────────────────────────────────────────────────
    if dept and dept.budget_remaining < po.total_amount:
        raise HTTPException(400, {
            "error": "BUDGET_INSUFFICIENT",
            "message": (
                f"Cannot approve. {dept.name} has ₹{dept.budget_remaining:,.2f} "
                f"remaining but PO requires ₹{po.total_amount:,.2f}."
            ),
            "budget_remaining": dept.budget_remaining,
            "po_amount":        po.total_amount,
            "gap":              round(po.total_amount - dept.budget_remaining, 2)
        })

    po.status      = POStatus.APPROVED
    po.approved_at = datetime.utcnow()

    if dept:
        dept.budget_used = (dept.budget_used or 0) + po.total_amount

    db.add(Notification(
        title="✅ PURCHASE ORDER APPROVED",
        message=(
            f"{po.po_number} approved. "
            f"₹{po.total_amount:,.2f} reserved from {dept.name if dept else 'dept'} budget."
        )
    ))
    db.add(AuditLog(
        entity_type="PURCHASE_ORDER", entity_id=po.id,
        action="PO_APPROVED", actor="HOD",
        details=f"PO {po.po_number} approved. Budget deducted: ₹{po.total_amount:,.2f}"
    ))

    storekeeper = get_storekeeper_for_dept(db, po.department_id)
    if storekeeper and storekeeper.username:
        try:
            email_storekeeper_approved(
                store_email=f"{storekeeper.username}@sentinel.edu",
                store_name=storekeeper.full_name,
                po_number=po.po_number,
                item_name=item.name if item else "Item",
                quantity=po.quantity,
                vendor_name=vendor.name if vendor else "Vendor"
            )
        except Exception:
            pass

    db.commit()
    return {
        "message":          "PO approved",
        "po_number":        po.po_number,
        "status":           "APPROVED",
        "budget_remaining": dept.budget_remaining if dept else None
    }


@router.post("/purchase-orders/{po_id}/reject")
def reject_purchase_order(po_id: int, body: RejectPayload, db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(404, "PO not found")

    po.status = POStatus.CANCELLED
    db.add(Notification(
        title="❌ REQUISITION REJECTED",
        message=f"{po.po_number} rejected by {body.rejected_by}. Reason: {body.reason}"
    ))
    db.add(AuditLog(
        entity_type="PURCHASE_ORDER", entity_id=po.id,
        action="PO_REJECTED", actor=body.rejected_by,
        details=f"Rejected: {body.reason}"
    ))
    db.commit()
    return {"message": "Requisition rejected", "po_number": po.po_number, "status": "CANCELLED"}


@router.post("/purchase-orders/{po_id}/receive")
def receive_goods(po_id: int, body: ReceiveGoods, db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(404, "PO not found")

    item = db.query(Item).filter(Item.id == po.item_id).first()
    if item:
        item.current_stock += body.received_quantity

    po.status      = POStatus.RECEIVED
    po.received_at = datetime.utcnow()

    txn = Transaction(
        item_id=po.item_id,
        department_id=po.department_id,
        vendor_id=po.vendor_id,
        type=TxnType.PURCHASE_RECEIVE,
        quantity=body.received_quantity,
        unit_price=po.unit_price,
        total_value=body.received_quantity * po.unit_price,
        reference=po.po_number,
        notes=body.notes or f"Goods receipt against {po.po_number}"
    )
    db.add(txn)
    db.add(Notification(
        title="📦 GOODS RECEIVED",
        message=f"Received {body.received_quantity}× {item.name if item else 'item'} against {po.po_number}."
    ))
    db.add(AuditLog(
        entity_type="GOODS_RECEIPT", entity_id=po.id,
        action="GOODS_RECEIVED", actor="STOREKEEPER",
        details=f"Received {body.received_quantity} units."
    ))

    vendor  = db.query(Vendor).filter(Vendor.id == po.vendor_id).first()
    finance = get_finance_officer(db)
    if finance and finance.username:
        try:
            email_finance_payment_due(
                finance_email=f"{finance.username}@sentinel.edu",
                po_number=po.po_number,
                vendor_name=vendor.name if vendor else "Vendor",
                amount=po.total_amount,
                vendor_phone=vendor.phone if vendor and vendor.phone else "N/A"
            )
        except Exception:
            pass

    db.commit()
    return {
        "message":   "Goods received",
        "po_number": po.po_number,
        "new_stock": item.current_stock if item else None
    }


# ── LEGACY REQUISITIONS (old quick-create flow) ───────────────────────────────

@router.get("/requisitions")
def list_requisitions(
    department_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    q = db.query(PurchaseOrder)
    if department_id:
        q = q.filter(PurchaseOrder.department_id == department_id)
    if status:
        q = q.filter(PurchaseOrder.status == status)
    else:
        q = q.filter(PurchaseOrder.status.in_([POStatus.PENDING_APPROVAL, POStatus.DRAFT]))

    pos = q.order_by(PurchaseOrder.created_at.desc()).all()
    out = []
    for po in pos:
        item   = db.query(Item).filter(Item.id == po.item_id).first()
        vendor = db.query(Vendor).filter(Vendor.id == po.vendor_id).first()
        dept   = db.query(Department).filter(Department.id == po.department_id).first()
        out.append({
            "id":              po.id,
            "po_number":       po.po_number,
            "status":          po.status.value if hasattr(po.status, "value") else str(po.status),
            "quantity":        po.quantity,
            "unit_price":      po.unit_price,
            "total_amount":    po.total_amount,
            "item_name":       item.name if item else None,
            "item_sku":        item.sku if item else None,
            "vendor_name":     vendor.name if vendor else None,
            "department_name": dept.name if dept else None,
            "department_id":   po.department_id,
            "created_at":      po.created_at.isoformat() if po.created_at else None,
        })
    return out


@router.post("/requisitions")
def create_requisition(body: RequisitionCreate, db: Session = Depends(get_db)):
    item = db.query(Item).filter(Item.id == body.item_id).first()
    if not item:
        raise HTTPException(404, "Item not found")

    dept = db.query(Department).filter(Department.id == body.department_id).first()
    if not dept:
        raise HTTPException(404, "Department not found")

    vendor_id = body.vendor_id
    if not vendor_id:
        preferred = db.query(Vendor).filter(
            Vendor.is_blacklisted == False
        ).order_by(Vendor.on_time_delivery_rate.desc()).first()
        vendor_id = preferred.id if preferred else 1

    unit_price = body.unit_price if body.unit_price is not None else item.unit_price
    total      = unit_price * body.quantity
    po_number  = f"REQ-{int(datetime.utcnow().timestamp())}"

    po = PurchaseOrder(
        po_number=po_number,
        vendor_id=vendor_id,
        item_id=body.item_id,
        department_id=body.department_id,
        quantity=body.quantity,
        unit_price=unit_price,
        total_amount=total,
        status=POStatus.PENDING_APPROVAL,
    )
    db.add(po)
    db.flush()

    hod = get_hod_for_dept(db, body.department_id)
    db.add(Notification(
        title=f"📋 NEW REQUISITION — {po_number}",
        message=(
            f"{dept.name} requested {body.quantity}× {item.name}. Awaiting HOD approval."
            + (f" Routed to: {hod.full_name}" if hod else "")
        )
    ))
    db.add(AuditLog(
        entity_type="REQUISITION", entity_id=po.id,
        action="REQUISITION_CREATED", actor="USER",
        details=f"{po_number} raised for {item.name} by dept {dept.name}"
    ))

    if hod and hod.username:
        try:
            email_hod_new_requisition(
                hod_email=f"{hod.username}@sentinel.edu",
                hod_name=hod.full_name,
                item_name=item.name,
                quantity=body.quantity,
                department=dept.name,
                raised_by=body.justification[:30],
                justification=body.justification,
                po_number=po_number
            )
        except Exception:
            pass

    db.commit()
    return {
        "message":      "Requisition created",
        "po_number":    po.po_number,
        "status":       po.status.value,
        "routed_to":    hod.full_name if hod else "No HOD assigned",
        "hod_notified": hod is not None
    }


# ── BILLS ─────────────────────────────────────────────────────────────────────

@router.post("/bills")
def create_bill(body: BillCreate, db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == body.po_id).first()
    if not po:
        raise HTTPException(404, "PO not found")

    # Block duplicate bills on same PO
    existing_bill = db.query(Bill).filter(Bill.po_id == po.id).first()
    if existing_bill:
        raise HTTPException(400, f"A bill already exists for {po.po_number} (Bill #{existing_bill.bill_number}). Cannot bill same PO twice.")

    mismatch = (
        body.billed_quantity != po.quantity or
        abs(body.billed_amount - po.total_amount) > 0.01
    )

    bill = Bill(
        bill_number=body.bill_number,
        vendor_id=po.vendor_id,
        po_id=po.id,
        billed_quantity=body.billed_quantity,
        billed_amount=body.billed_amount,
        received_quantity=po.quantity if po.status == POStatus.RECEIVED else 0,
        is_reconciled=not mismatch,
    )
    db.add(bill)
    db.flush()

    case_id = None
    vendor  = db.query(Vendor).filter(Vendor.id == po.vendor_id).first()
    item    = db.query(Item).filter(Item.id == po.item_id).first()

    if mismatch:
        qty_diff = body.billed_quantity - po.quantity
        amt_diff = body.billed_amount - po.total_amount

        case = Case(
            case_number=f"CASE-BILL-{int(datetime.utcnow().timestamp())}",
            title=f"Invoice Mismatch — {po.po_number}",
            signal_type=SignalType.BILL_MISMATCH,
            severity=CaseSeverity.HIGH if abs(amt_diff) > 5000 else CaseSeverity.MEDIUM,
            status=CaseStatus.OPEN,
            item_id=po.item_id,
            department_id=po.department_id,
            vendor_id=po.vendor_id,
            ai_narrative=(
                f"3-way match failed on {po.po_number}. "
                f"Vendor {vendor.name if vendor else 'N/A'} billed "
                f"{body.billed_quantity} units at ₹{body.billed_amount:,.2f}, "
                f"but PO authorised {po.quantity} units at ₹{po.total_amount:,.2f}. "
                f"Qty gap: {qty_diff:+d} | Amount gap: ₹{amt_diff:+,.2f}."
            ),
            recommended_action=ActionType.REQUEST_JUSTIFICATION,
            risk_class=RiskClass.HIGH if abs(amt_diff) > 5000 else RiskClass.MEDIUM,
        )
        db.add(case)
        db.flush()

        for label, value in [
            ("PO Number",       po.po_number),
            ("PO Quantity",     str(po.quantity)),
            ("PO Amount",       f"₹{po.total_amount:,.2f}"),
            ("Billed Quantity", str(body.billed_quantity)),
            ("Billed Amount",   f"₹{body.billed_amount:,.2f}"),
            ("Qty Gap",         f"{qty_diff:+d} units"),
            ("Amount Gap",      f"₹{amt_diff:+,.2f}"),
            ("Vendor",          vendor.name if vendor else "N/A"),
            ("Vendor Phone",    vendor.phone if vendor and vendor.phone else "N/A"),
        ]:
            db.add(Evidence(
                case_id=case.id, tool_name="3way_match",
                description=label, data_snapshot=value
            ))

        db.add(CaseTimelineEvent(
            case_id=case.id, event_type="CASE_OPENED",
            actor="SENTINEL_DETECTOR",
            description="3-way match failed. Vendor complaint auto-sent."
        ))
        case_id = case.id

        if vendor and vendor.contact_email:
            try:
                email_vendor_complaint(
                    vendor_email=vendor.contact_email,
                    vendor_name=vendor.name,
                    po_number=po.po_number,
                    bill_number=body.bill_number,
                    po_qty=po.quantity,
                    billed_qty=body.billed_quantity,
                    po_amount=po.total_amount,
                    billed_amount=body.billed_amount,
                    vendor_phone=vendor.phone or "N/A"
                )
            except Exception:
                pass

    db.add(Notification(
        title="⚠️ INVOICE MISMATCH — Complaint Sent to Vendor" if mismatch else "✅ INVOICE RECONCILED",
        message=(
            f"Bill {body.bill_number} for ₹{body.billed_amount:,.2f}."
            + (
                f" Case #{case_id} opened. Complaint emailed to {vendor.name if vendor else 'vendor'}."
                if case_id else " 3-way match passed."
            )
        )
    ))
    db.add(AuditLog(
        entity_type="BILL", entity_id=bill.id, action="BILL_RECORDED",
        actor="FINANCE_OFFICER",
        details=f"Bill {body.bill_number}. Reconciled: {not mismatch}. Case: {case_id}"
    ))
    db.commit()

    return {
        "message":           "Bill recorded",
        "reconciled":        bill.is_reconciled,
        "mismatch_flag":     mismatch,
        "case_opened":       case_id is not None,
        "case_id":           case_id,
        "complaint_sent_to": vendor.contact_email if mismatch and vendor else None
    }


@router.get("/bills")
def list_bills(db: Session = Depends(get_db)):
    bills = db.query(Bill).order_by(Bill.created_at.desc()).all()
    out   = []
    for b in bills:
        vendor = db.query(Vendor).filter(Vendor.id == b.vendor_id).first() if b.vendor_id else None
        po     = db.query(PurchaseOrder).filter(PurchaseOrder.id == b.po_id).first() if b.po_id else None

        # Compute a status string from is_reconciled so frontend can show
        # MATCHED / MISMATCH without ambiguity
        if b.is_reconciled:
            computed_status = "MATCHED"
        else:
            computed_status = "MISMATCH"

        out.append({
            "id":               b.id,
            "bill_number":      b.bill_number,
            "vendor_name":      vendor.name if vendor else None,
            "vendor_phone":     vendor.phone if vendor else None,
            "po_id":            b.po_id,
            "po_number":        po.po_number if po else None,
            "billed_quantity":  b.billed_quantity,
            "billed_amount":    b.billed_amount,
            "received_quantity": b.received_quantity,
            "is_reconciled":    b.is_reconciled,
            "status":           computed_status,           # ← key fix for PhonePe button
            "payment_txn_id":   getattr(b, "payment_txn_id", None),
            "payment_state":    getattr(b, "payment_state", None),
            "created_at":       b.created_at.isoformat() if b.created_at else None,
        })
    return out


# ── VENDORS ───────────────────────────────────────────────────────────────────

@router.get("/vendors/preferred")
def preferred_vendors(db: Session = Depends(get_db)):
    vendors = db.query(Vendor).filter(
        Vendor.is_blacklisted == False
    ).order_by(Vendor.on_time_delivery_rate.desc()).all()
    return [{
        "id":                    v.id,
        "name":                  v.name,
        "contact_email":         v.contact_email,
        "phone":                 v.phone,
        "avg_lead_time_days":    v.avg_lead_time_days,
        "on_time_delivery_rate": v.on_time_delivery_rate,
        "preferred":             v.on_time_delivery_rate >= 0.9,
        "total_orders":          v.total_orders
    } for v in vendors]


# ── DASHBOARD SUMMARY ─────────────────────────────────────────────────────────

@router.get("/dashboard-summary")
def procurement_dashboard(db: Session = Depends(get_db)):
    from sqlalchemy import func
    total_value = db.query(func.sum(PurchaseOrder.total_amount)).filter(
        PurchaseOrder.status != POStatus.CANCELLED
    ).scalar() or 0

    return {
        "requisitions": {
            "pending_approval": db.query(PurchaseOrder).filter(
                PurchaseOrder.status == POStatus.PENDING_APPROVAL).count(),
            "approved": db.query(PurchaseOrder).filter(
                PurchaseOrder.status == POStatus.APPROVED).count(),
            "cancelled": db.query(PurchaseOrder).filter(
                PurchaseOrder.status == POStatus.CANCELLED).count(),
        },
        "purchase_orders": {
            "total":       db.query(PurchaseOrder).count(),
            "approved":    db.query(PurchaseOrder).filter(PurchaseOrder.status == POStatus.APPROVED).count(),
            "received":    db.query(PurchaseOrder).filter(PurchaseOrder.status == POStatus.RECEIVED).count(),
            "total_value": round(total_value, 2),
        },
        "bills": {
            "total":      db.query(Bill).count(),
            "reconciled": db.query(Bill).filter(Bill.is_reconciled == True).count(),
            "mismatched": db.query(Bill).filter(Bill.is_reconciled == False).count(),
        },
        "low_stock_items": db.query(Item).filter(
            Item.current_stock <= Item.reorder_level
        ).count(),
    }


# ── DEPARTMENTS DROPDOWN ──────────────────────────────────────────────────────

@router.get("/departments")
def list_departments(db: Session = Depends(get_db)):
    depts = db.query(Department).all()
    return [{
        "id":           d.id,
        "name":         d.name,
        "code":         d.code,
        "budget_total": d.budget_total,
        "budget_used":  d.budget_used
    } for d in depts]


# ── SMART REORDER ─────────────────────────────────────────────────────────────

@router.post("/smart-reorder-check")
def smart_reorder_check(db: Session = Depends(get_db)):
    low_stock = db.query(Item).filter(
        Item.current_stock <= Item.reorder_level,
        Item.is_frozen == False
    ).all()

    created = []
    for item in low_stock:
        existing = db.query(PurchaseOrder).filter(
            PurchaseOrder.item_id == item.id,
            PurchaseOrder.status.in_([
                POStatus.PENDING_APPROVAL,
                POStatus.DRAFT,
                POStatus.APPROVED
            ])
        ).first()
        if existing:
            continue

        best_vendor = db.query(Vendor).filter(
            Vendor.is_blacklisted == False
        ).order_by(Vendor.on_time_delivery_rate.desc()).first()
        if not best_vendor:
            continue

        suggested_qty = item.reorder_level * 2
        po_number = f"AUTO-REQ-{item.sku}-{int(datetime.utcnow().timestamp())}"
        po = PurchaseOrder(
            po_number=po_number,
            vendor_id=best_vendor.id,
            item_id=item.id,
            quantity=suggested_qty,
            unit_price=item.unit_price,
            total_amount=suggested_qty * item.unit_price,
            status=POStatus.PENDING_APPROVAL,
        )
        db.add(po)
        db.flush()

        db.add(Notification(
            title=f"🤖 AUTO REQUISITION — {item.name}",
            message=f"Stock ({item.current_stock}) ≤ reorder ({item.reorder_level}). Auto-drafted {po_number}."
        ))
        db.add(AuditLog(
            entity_type="PURCHASE_ORDER", entity_id=po.id,
            action="AUTO_REORDER_DRAFT", actor="SENTINEL_AGENT",
            details=f"Auto-drafted for {item.name}. Stock: {item.current_stock}"
        ))

        created.append({
            "po_number":       po_number,
            "item":            item.name,
            "domain":          getattr(item, "domain", "ACADEMIC"),
            "current_stock":   item.current_stock,
            "reorder_level":   item.reorder_level,
            "suggested_qty":   suggested_qty,
            "auto_vendor":     best_vendor.name,
            "estimated_value": round(suggested_qty * item.unit_price, 2),
        })

    db.commit()
    return {
        "scanned":      len(low_stock),
        "auto_drafted": len(created),
        "skipped":      len(low_stock) - len(created),
        "requisitions": created,
        "message": (
            f"{len(created)} auto-requisition(s) raised."
            if created else "All items above reorder level."
        )
    }
@router.get("/budget-burn-rate/{department_id}")
def get_budget_burn_rate(department_id: int, db: Session = Depends(get_db)):
    from datetime import datetime, timedelta
    from app import models as M

    dept = db.query(M.Department).filter(M.Department.id == department_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    budget_total     = float(dept.budget_total or 0.0)
    budget_used      = float(dept.budget_used or 0.0)
    budget_remaining = budget_total - budget_used
    utilisation_pct  = (budget_used / budget_total * 100) if budget_total > 0 else 0.0

    def _ts(obj):
        for f in ("approved_at", "created_at", "timestamp", "date"):
            v = getattr(obj, f, None)
            if isinstance(v, datetime):
                return v
        return None

    # ── Collect real spend records from approved purchase orders ─────────
    spend = []
    PO = getattr(M, "PurchaseOrder", None)
    if PO is not None:
        skip = {"DRAFT", "PENDING_APPROVAL", "PENDING", "REJECTED", "CANCELLED"}
        for po in db.query(PO).all():
            if getattr(po, "department_id", None) != department_id:
                continue
            status = str(getattr(po, "status", "") or "").split(".")[-1].upper()
            if status in skip:
                continue
            ts = _ts(po)
            amt = float(getattr(po, "total_amount", 0) or 0)
            if ts and amt > 0:
                spend.append((ts, amt))

    # ── Weekly buckets (last 8 weeks) ────────────────────────────────────
    now = datetime.utcnow()
    weeks = []
    for i in range(7, -1, -1):
        ws = now - timedelta(weeks=i + 1)
        we = now - timedelta(weeks=i)
        total = sum(a for t, a in spend if ws <= t < we)
        weeks.append({"week": ws.strftime("%d %b"), "spent": round(total, 2)})

    total_8w = sum(w["spent"] for w in weeks)

    if total_8w > 0:
        avg_weekly_burn = total_8w / 8
        daily_burn = avg_weekly_burn / 7
        basis = "LAST_8_WEEKS"
    else:
        # Fallback: actual budget_used spread over days since FY start (1 April)
        fy_start = datetime(now.year if now.month >= 4 else now.year - 1, 4, 1)
        days_elapsed = max((now - fy_start).days, 1)
        daily_burn = budget_used / days_elapsed
        avg_weekly_burn = daily_burn * 7
        basis = "FINANCIAL_YEAR_TO_DATE"

    days_until_exhausted = int(budget_remaining / daily_burn) if daily_burn > 0 and budget_remaining > 0 else None

    if utilisation_pct >= 90 or (days_until_exhausted is not None and days_until_exhausted <= 7):
        warning_level = "CRITICAL"
    elif utilisation_pct >= 75 or (days_until_exhausted is not None and days_until_exhausted <= 21):
        warning_level = "HIGH"
    elif utilisation_pct >= 50 or (days_until_exhausted is not None and days_until_exhausted <= 45):
        warning_level = "MEDIUM"
    else:
        warning_level = "LOW"

    return {
        "department_id":        department_id,
        "department_name":      dept.name,
        "budget_total":         round(budget_total, 2),
        "budget_used":          round(budget_used, 2),
        "budget_remaining":     round(budget_remaining, 2),
        "utilisation_pct":      round(utilisation_pct, 2),
        "avg_weekly_burn":      round(avg_weekly_burn, 2),
        "daily_burn":           round(daily_burn, 2),
        "days_until_exhausted": days_until_exhausted,
        "warning_level":        warning_level,
        "burn_basis":           basis,
        "weekly_spend":         weeks,
    }
# ── DUPLICATE PO CHECK ────────────────────────────────────────────────────
@router.get("/duplicate-check/{pr_id}")
def check_duplicate_po(pr_id: int, db: Session = Depends(get_db)):
    skip = {"CANCELLED", "REJECTED"}
    existing = db.query(PurchaseOrder).filter(
        PurchaseOrder.pr_id == pr_id
    ).all()
    live = [
        po for po in existing
        if (po.status.value if hasattr(po.status, "value") else str(po.status)).upper() not in skip
    ]
    if live:
        po = live[0]
        st = po.status.value if hasattr(po.status, "value") else str(po.status)
        return {
            "duplicate": True,
            "po_number": po.po_number,
            "status":    st,
            "created_at": po.created_at.isoformat() if po.created_at else None
        }
    return {"duplicate": False}