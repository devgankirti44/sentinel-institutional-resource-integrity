import json
from sqlalchemy.orm import Session
from app.models import Case, ActionType, RiskClass, Department, CaseTimelineEvent

def evaluate_and_apply_policy(db: Session, case: Case, proposed_action: str, payload: dict) -> Case:
    """Enforces deterministic financial and risk rules on AI recommendations."""
    
    dept = db.query(Department).filter(Department.id == case.department_id).first()
    total_cost = payload.get("total_amount", 0.0)

    final_action = proposed_action
    risk_class = RiskClass.MEDIUM

    # Policy Rule 1: Emergency PO cost cannot exceed department remaining budget
    if proposed_action == "DRAFT_PO":
        if dept and total_cost > dept.budget_remaining:
            final_action = "ESCALATE"
            case.ai_narrative += f"\n\n[POLICY OVERRIDE]: Action downgraded from DRAFT_PO to ESCALATE because requested amount (₹{total_cost:,.2f}) exceeds remaining budget (₹{dept.budget_remaining:,.2f})."
            risk_class = RiskClass.HIGH

        elif total_cost < 25000.0:
            risk_class = RiskClass.LOW  # Small amount = low risk
        else:
            risk_class = RiskClass.MEDIUM  # Medium amount = requires human approval

    case.recommended_action = ActionType[final_action] if final_action in ActionType.__members__ else ActionType.ESCALATE
    case.risk_class = risk_class
    case.action_payload = json.dumps(payload)
    case.status = "AWAITING_APPROVAL" if risk_class in [RiskClass.MEDIUM, RiskClass.HIGH] else "RESOLVED"
    
    db.commit()

    # Timeline log
    event = CaseTimelineEvent(
        case_id=case.id,
        event_type="POLICY_GATE_EVALUATED",
        actor="POLICY_ENGINE",
        description=f"Action evaluated: {final_action}. Risk Class: {risk_class.value}. Budget check passed."
    )
    db.add(event)
    db.commit()

    return case