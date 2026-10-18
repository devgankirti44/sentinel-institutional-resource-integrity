from sqlalchemy.orm import Session
from app.models import Case, CaseTimelineEvent, SignalType, CaseSeverity, CaseStatus, Item, Department, Baseline
from datetime import datetime

def detect_item_anomaly(db: Session, item_id: int, department_id: int = None, requested_qty: int = 0) -> Case:
    """Dynamically checks if an item has a stockout or velocity shock and opens a Case."""
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        return None

    dept = db.query(Department).filter(Department.id == department_id).first() if department_id else None
    dept_name = dept.name if dept else "General Department"

    # Check 1: Out of Stock or Low Stock Anomaly
    if item.current_stock <= item.reorder_level:
        case_number = f"CASE-{int(datetime.utcnow().timestamp())}"
        title = f"Stock Alert: {item.name} is OUT OF STOCK / LOW STOCK ({item.current_stock} {item.unit} remaining)"

        case = Case(
            case_number=case_number,
            title=title,
            signal_type=SignalType.IMMINENT_STOCKOUT,
            severity=CaseSeverity.HIGH if item.current_stock == 0 else CaseSeverity.MEDIUM,
            status=CaseStatus.OPEN,
            item_id=item.id,
            department_id=department_id
        )
        db.add(case)
        db.commit()
        db.refresh(case)

        event = CaseTimelineEvent(
            case_id=case.id,
            event_type="SIGNAL_DETECTED",
            actor="DETECTOR_ENGINE",
            description=f"Signal IMMINENT_STOCKOUT triggered. {item.name} stock fell to {item.current_stock}."
        )
        db.add(event)
        db.commit()
        return case

    # Check 2: Velocity Shock Anomaly
    if department_id and requested_qty > 0:
        baseline = db.query(Baseline).filter(Baseline.item_id == item_id, Baseline.department_id == department_id).first()
        avg_daily = baseline.avg_daily_usage if baseline else 0.1
        expected_7day = avg_daily * 7

        if requested_qty >= max(3, expected_7day * 3):
            case_number = f"CASE-{int(datetime.utcnow().timestamp())}"
            title = f"Velocity Shock: {requested_qty}x {item.name} issued to {dept_name}"

            case = Case(
                case_number=case_number,
                title=title,
                signal_type=SignalType.VELOCITY_SHOCK,
                severity=CaseSeverity.HIGH if requested_qty > 20 else CaseSeverity.MEDIUM,
                status=CaseStatus.OPEN,
                item_id=item.id,
                department_id=department_id
            )
            db.add(case)
            db.commit()
            db.refresh(case)

            event = CaseTimelineEvent(
                case_id=case.id,
                event_type="SIGNAL_DETECTED",
                actor="DETECTOR_ENGINE",
                description=f"Signal VELOCITY_SHOCK triggered for {item.name}."
            )
            db.add(event)
            db.commit()
            return case

    return None