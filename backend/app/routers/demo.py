from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    Item, Department, Transaction, TxnType,
    Notification, AuditLog, CaseStatus,
    Case, SignalType, CaseSeverity
)
from app.services import detector, investigator, reasoner, policy

router = APIRouter(prefix="/api/demo", tags=["Hero Incident Injector"])


@router.post("/inject-cs-shock")
def inject_cs_velocity_shock(db: Session = Depends(get_db)):
    """Dynamically finds the lowest stock / out-of-stock item and runs Agent Investigation!"""

    # 1. Find item with lowest stock in database
    item = db.query(Item).order_by(Item.current_stock.asc()).first()
    cs = db.query(Department).filter(Department.code == "ACAD").first()

    if not item or not cs:
        return {"message": "No items or departments found in database."}

    # 2. Record issuance to create activity
    issue_qty = 10 if item.current_stock > 0 else 5
    txn = Transaction(
        item_id=item.id,
        department_id=cs.id,
        type=TxnType.ISSUE,
        quantity=issue_qty,
        unit_price=item.unit_price,
        total_value=item.unit_price * issue_qty,
        notes=f"EMERGENCY REQUISITION: {item.name} issued to CS Department"
    )
    db.add(txn)
    item.current_stock = max(0, item.current_stock - issue_qty)
    db.commit()

    # 3. Detect anomaly for THIS specific item
    case = detector.detect_item_anomaly(
        db, item_id=item.id, department_id=cs.id, requested_qty=issue_qty
    )

    if not case:
        # Force open stock alert case if not triggered by threshold
        from datetime import datetime
        case_number = f"CASE-{int(datetime.utcnow().timestamp())}"
        case = Case(
            case_number=case_number,
            title=f"Stock Alert: {item.name} in CS Dept ({item.current_stock} {item.unit} remaining)",
            signal_type=SignalType.IMMINENT_STOCKOUT,
            severity=CaseSeverity.HIGH,
            status=CaseStatus.OPEN,
            item_id=item.id,
            department_id=cs.id
        )
        db.add(case)
        db.commit()
        db.refresh(case)

    # 4. Investigate THIS item dynamically
    evidence_summary = investigator.run_investigation_tools(db, case)
    ai_result = reasoner.generate_case_reasoning(case.title, evidence_summary)

    case.ai_narrative = ai_result.get("narrative")
    case.ai_hypotheses = str(ai_result.get("hypotheses"))
    case.ai_confidence = ai_result.get("confidence")
    db.commit()

    case = policy.evaluate_and_apply_policy(
        db=db,
        case=case,
        proposed_action=ai_result.get("recommended_action", "DRAFT_PO"),
        payload=ai_result.get("action_payload", {})
    )

    # 5. Write Notification & Audit Log for THIS exact item
    noti = Notification(
        title=f"🚨 ANOMALY DETECTED: {item.name}",
        message=(
            f"Case {case.case_number}: Stock alert for {item.name}. "
            f"Remaining: {item.current_stock} units."
        )
    )
    audit = AuditLog(
        entity_type="CASE",
        entity_id=case.id,
        action="ANOMALY_DETECTED",
        actor="SENTINEL_AGENT",
        details=f"Auto-opened Case {case.case_number} for {item.name}."
    )
    db.add_all([noti, audit])
    db.commit()

    return {
        "message": f"Anomaly Triggered for {item.name}!",
        "case_id": case.id,
        "case_number": case.case_number,
        "item_name": item.name,
        "status": case.status.value,
        "recommended_action": case.recommended_action.value,
        "narrative": case.ai_narrative,
    }