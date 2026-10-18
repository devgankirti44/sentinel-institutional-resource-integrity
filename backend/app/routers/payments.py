import os
os.environ["DISABLE_SQLALCHEMY_CEXT"] = "1"

import base64
import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Bill, User, UserRole, AuditLog
from app.services.phonepe import initiate_payment, check_payment_status

router = APIRouter(prefix="/api/payments", tags=["Payments – PhonePe UPI"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_user(user_id: int, db: Session) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found.")
    return user


# ── Schemas ───────────────────────────────────────────────────────────────────

class InitiatePaymentRequest(BaseModel):
    bill_id: int
    user_id: int
    mobile:  Optional[str] = "9999999999"


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/initiate")
def initiate_bill_payment(
    req: InitiatePaymentRequest,
    db: Session = Depends(get_db),
):
    """
    Finance Officer clicks Pay via PhonePe on a MATCHED bill.
    Preconditions:
      - Caller must be FINANCE_OFFICER
      - bill.is_reconciled must be True  (3-way match passed)
      - Bill must not already have a payment in progress
    """
    user = _get_user(req.user_id, db)
    if user.role != UserRole.FINANCE_OFFICER:
        raise HTTPException(
            status_code=403,
            detail="Only Finance Officer can initiate payments."
        )

    bill = db.query(Bill).filter(Bill.id == req.bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail=f"Bill {req.bill_id} not found.")

    # ── KEY FIX: use is_reconciled, not bill.status ───────────────────────────
    if not bill.is_reconciled:
        raise HTTPException(
            status_code=400,
            detail="Payment can only be initiated for reconciled (MATCHED) bills."
        )

    existing_txn   = getattr(bill, "payment_txn_id",  None)
    existing_state = getattr(bill, "payment_state",   None)
    if existing_txn and existing_state in ("PENDING", "COMPLETED"):
        raise HTTPException(
            status_code=400,
            detail=f"Payment already {existing_state} for this bill. Txn: {existing_txn}"
        )

    # Determine amount: prefer billed_amount, fall back to PO total
    po_amount = float(bill.billed_amount or 0)
    if po_amount <= 0 and hasattr(bill, "purchase_order") and bill.purchase_order:
        po_amount = float(bill.purchase_order.total_amount or 0)
    if po_amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot determine payment amount — bill has no billed_amount."
        )

    # ── Call PhonePe service ──────────────────────────────────────────────────
    try:
        result = initiate_payment(
            bill_id=bill.id,
            amount_rupees=po_amount,
            mobile=req.mobile or "9999999999",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"PhonePe service error: {exc}"
        )

    if not result.get("success"):
        raise HTTPException(
            status_code=502,
            detail=f"PhonePe declined: {result.get('error', 'Unknown')}. Raw: {result.get('raw_response', {})}"
        )

    # ── Persist on bill ───────────────────────────────────────────────────────
    bill.payment_txn_id       = result["merchant_txn_id"]
    bill.payment_state        = "PENDING"
    bill.payment_initiated_at = datetime.utcnow()

    db.add(AuditLog(
        action="PAYMENT_INITIATED",
        entity_type="Bill",
        entity_id=bill.id,
        actor=user.username,
        details=f"PhonePe txn {result['merchant_txn_id']} initiated for ₹{po_amount:,.2f}"
    ))
    db.commit()

    return {
        "success":         True,
        "merchant_txn_id": result["merchant_txn_id"],
        "redirect_url":    result["redirect_url"],
        "amount":          po_amount,
        "bill_id":         bill.id,
        "message":         "PhonePe session created — open redirect_url to pay."
    }


@router.get("/status/{merchant_txn_id}")
def get_payment_status(merchant_txn_id: str, db: Session = Depends(get_db)):
    """
    Frontend polls this after user returns from PhonePe page.
    Syncs live state back to the bill.
    """
    bill = db.query(Bill).filter(
        Bill.payment_txn_id == merchant_txn_id
    ).first()
    if not bill:
        raise HTTPException(
            status_code=404,
            detail="No bill found for this transaction ID."
        )

    try:
        result = check_payment_status(merchant_txn_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"PhonePe status check failed: {exc}")

    bill.payment_state = result["state"]
    if result["state"] == "COMPLETED":
        bill.payment_completed_at = datetime.utcnow()
        # Mark bill paid — visible in Bills tab
        bill.is_reconciled = True
    db.commit()

    return {
        "merchant_txn_id": merchant_txn_id,
        "state":           result["state"],
        "bill_id":         bill.id,
        "raw_response":    result.get("raw_response", {}),
    }


@router.post("/callback")
async def phonepe_callback(request: Request, db: Session = Depends(get_db)):
    """
    PhonePe server-to-server callback.
    Verifies base64 payload, marks bill PAID or FAILED.
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body.")

    encoded_response = body.get("response", "")
    if not encoded_response:
        raise HTTPException(status_code=400, detail="Empty callback body.")

    try:
        decoded = base64.b64decode(encoded_response).decode()
        cb_data = json.loads(decoded)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 in callback.")

    data   = cb_data.get("data") or {}
    txn_id = data.get("merchantTransactionId", "")
    state  = data.get("state", "UNKNOWN")

    if not txn_id:
        return {"status": "ignored", "reason": "no merchantTransactionId"}

    bill = db.query(Bill).filter(Bill.payment_txn_id == txn_id).first()
    if bill:
        bill.payment_state = state
        if state == "COMPLETED":
            bill.payment_completed_at = datetime.utcnow()
            bill.is_reconciled = True
        elif state == "FAILED":
            bill.payment_state = "PAYMENT_FAILED"
        db.commit()

    return {"status": "ok", "state": state, "txn": txn_id}


@router.post("/redirect/{merchant_txn_id}")
async def phonepe_redirect(
    merchant_txn_id: str,
    db: Session = Depends(get_db),
):
    """
    PhonePe redirects user browser here after payment attempt.
    We re-check live status, update bill, redirect to frontend.
    """
    try:
        result = check_payment_status(merchant_txn_id)
    except Exception:
        result = {"state": "UNKNOWN", "raw_response": {}}

    bill = db.query(Bill).filter(Bill.payment_txn_id == merchant_txn_id).first()
    if bill:
        bill.payment_state = result["state"]
        if result["state"] == "COMPLETED":
            bill.payment_completed_at = datetime.utcnow()
            bill.is_reconciled = True
        db.commit()

    frontend_url = (
        f"http://localhost:3000"
        f"?tab=bills&txn={merchant_txn_id}&state={result['state']}"
    )
    return RedirectResponse(url=frontend_url)