import json
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Case, CaseStatus, PurchaseOrder, POStatus, CaseTimelineEvent, Evidence
from app import schemas
from app.services import pdf

router = APIRouter(prefix="/api/cases", tags=["Sentinel Case Management"])

@router.get("", response_model=List[schemas.CaseResponse])
def get_all_cases(db: Session = Depends(get_db)):
    return db.query(Case).order_by(Case.created_at.desc()).all()

@router.get("/{case_id}", response_model=schemas.CaseResponse)
def get_case_dossier(case_id: int, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case

@router.get("/{case_id}/pdf")
def download_case_audit_pdf(case_id: int, db: Session = Depends(get_db)):
    """Generates and downloads official PDF Audit Trail for a case."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    evidence_list = db.query(Evidence).filter(Evidence.case_id == case_id).all()
    timeline_list = db.query(CaseTimelineEvent).filter(CaseTimelineEvent.case_id == case_id).all()

    pdf_buffer = pdf.generate_case_pdf_bytes(case, evidence_list, timeline_list)

    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={case.case_number}_audit_report.pdf"}
    )

@router.post("/{case_id}/approve")
def approve_case_action(case_id: int, db: Session = Depends(get_db)):
    """Human-in-the-Loop Gate: Approves the recommended action (e.g., creates PO)."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    payload = json.loads(case.action_payload or "{}")

    # Execute action
    if case.recommended_action == "DRAFT_PO":
        po_number = f"PO-{int(case.id * 1000 + 42)}"
        po = PurchaseOrder(
            po_number=po_number,
            vendor_id=payload.get("vendor_id", 1),
            item_id=case.item_id,
            department_id=case.department_id,
            quantity=payload.get("quantity", 10),
            unit_price=payload.get("unit_price", 4500.0),
            total_amount=payload.get("total_amount", 45000.0),
            status=POStatus.APPROVED,
            created_by_case_id=case.id
        )
        db.add(po)

    case.status = CaseStatus.RESOLVED
    case.resolution_notes = f"Approved by Store Officer. Created Purchase Order."
    
    # Audit log
    event = CaseTimelineEvent(
        case_id=case.id,
        event_type="ACTION_APPROVED",
        actor="HUMAN_STORE_OFFICER",
        description=f"Action '{case.recommended_action.value}' approved. Purchase Order generated."
    )
    db.add(event)
    db.commit()

    return {"message": "Action approved successfully!", "case_status": "RESOLVED"}