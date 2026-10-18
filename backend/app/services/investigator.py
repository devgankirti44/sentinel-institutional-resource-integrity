import json
from sqlalchemy.orm import Session
from app.models import Case, Evidence, CaseTimelineEvent, Item, Department, Vendor, Transaction, Baseline, TxnType
from datetime import datetime, timedelta

def run_investigation_tools(db: Session, case: Case) -> dict:
    """Executes deterministic investigation playbooks dynamically for ANY item_id."""
    
    item = db.query(Item).filter(Item.id == case.item_id).first()
    if not item:
        item_name = "Resource"
        unit_price = 1000.0
        current_stock = 0
    else:
        item_name = item.name
        unit_price = item.unit_price
        current_stock = item.current_stock

    dept = db.query(Department).filter(Department.id == case.department_id).first() if case.department_id else None
    dept_name = dept.name if dept else "General Department"
    budget_remaining = dept.budget_remaining if dept else 100000.0

    baseline = db.query(Baseline).filter(Baseline.item_id == case.item_id, Baseline.department_id == case.department_id).first() if case.department_id else None

    # Tool 1: Calculate Consumption Velocity
    recent_issues = db.query(Transaction).filter(
        Transaction.item_id == case.item_id,
        Transaction.type == TxnType.ISSUE,
        Transaction.timestamp >= datetime.utcnow() - timedelta(days=7)
    ).all()
    
    qty_last_7_days = sum(t.quantity for t in recent_issues)
    daily_burn_rate = round(qty_last_7_days / 7.0, 2) if qty_last_7_days > 0 else 1.0
    days_until_stockout = round(current_stock / daily_burn_rate, 1) if daily_burn_rate > 0 else 0.0

    ev1_data = {
        "item_name": item_name,
        "current_stock": current_stock,
        "qty_issued_last_7_days": qty_last_7_days,
        "daily_burn_rate": daily_burn_rate,
        "baseline_daily_avg": round(baseline.avg_daily_usage, 2) if baseline else 0.1,
        "days_until_stockout": days_until_stockout
    }
    
    ev1 = Evidence(
        case_id=case.id,
        tool_name="tool_consumption_velocity",
        description=f"CRITICAL: {item_name} stock is {current_stock}. Stockout predicted in {days_until_stockout} days at burn rate of {daily_burn_rate}/day.",
        data_snapshot=json.dumps(ev1_data)
    )
    db.add(ev1)

    # Tool 2: Vendor Lead Time & Pricing Comparison
    vendors = db.query(Vendor).filter(Vendor.is_blacklisted == False).all()
    vendor_options = []
    for v in vendors:
        vendor_options.append({
            "vendor_id": v.id,
            "vendor_name": v.name,
            "lead_time_days": v.avg_lead_time_days,
            "on_time_rate": v.on_time_delivery_rate,
            "can_prevent_stockout": v.avg_lead_time_days < max(1, days_until_stockout),
            "estimated_unit_price": unit_price * (1.08 if v.avg_lead_time_days <= 2 else 1.0)
        })

    ev2_data = {"vendors_analyzed": vendor_options}
    ev2 = Evidence(
        case_id=case.id,
        tool_name="tool_vendor_intelligence",
        description=f"Evaluated {len(vendor_options)} active vendors for {item_name} delivery lead times vs stockout risk.",
        data_snapshot=json.dumps(ev2_data)
    )
    db.add(ev2)

    # Tool 3: Department Budget & Policy Check
    ev3_data = {
        "department_name": dept_name,
        "budget_total": dept.budget_total if dept else 500000.0,
        "budget_used": dept.budget_used if dept else 0.0,
        "budget_remaining": budget_remaining,
        "policy_emergency_limit": 200000.0
    }
    ev3 = Evidence(
        case_id=case.id,
        tool_name="tool_budget_policy_audit",
        description=f"{dept_name} has ₹{budget_remaining:,.2f} remaining budget for emergency requisition.",
        data_snapshot=json.dumps(ev3_data)
    )
    db.add(ev3)

    db.commit()

    # Timeline log
    timeline_event = CaseTimelineEvent(
        case_id=case.id,
        event_type="EVIDENCE_GATHERED",
        actor="INVESTIGATOR_ENGINE",
        description=f"Ran investigation playbooks for {item_name} in {dept_name}."
    )
    db.add(timeline_event)
    db.commit()

    return {
        "velocity": ev1_data,
        "vendors": ev2_data,
        "budget": ev3_data
    }