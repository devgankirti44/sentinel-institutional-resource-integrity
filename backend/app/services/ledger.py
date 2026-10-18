from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import Item, Department, Vendor, Transaction, PurchaseOrder, Bill, TxnType, POStatus, Baseline
from datetime import datetime, timedelta

def record_transaction(
    db: Session,
    item_id: int,
    txn_type: TxnType,
    quantity: int,
    unit_price: float = 0.0,
    department_id: int = None,
    vendor_id: int = None,
    notes: str = None,
    reference: str = None
) -> Transaction:
    """Core ledger transaction writer. Updates stock deterministically."""
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise ValueError(f"Item {item_id} not found")

    total_value = quantity * (unit_price or item.unit_price)

    # 1. Update physical stock deterministically
    if txn_type == TxnType.PURCHASE_RECEIVE:
        item.current_stock += quantity
    elif txn_type == TxnType.ISSUE:
        if item.current_stock < quantity:
            raise ValueError(f"Insufficient stock for {item.name}. Stock: {item.current_stock}, Requested: {quantity}")
        item.current_stock -= quantity
        
        # Deduct from department budget
        if department_id:
            dept = db.query(Department).filter(Department.id == department_id).first()
            if dept:
                dept.budget_used += total_value

    elif txn_type == TxnType.RETURN:
        item.current_stock += quantity

    # 2. Write immutable transaction record
    txn = Transaction(
        item_id=item_id,
        department_id=department_id,
        vendor_id=vendor_id,
        type=txn_type,
        quantity=quantity,
        unit_price=unit_price or item.unit_price,
        total_value=total_value,
        reference=reference,
        notes=notes,
        timestamp=datetime.utcnow()
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)

    # 3. Recalculate baseline for this item x department
    if department_id and txn_type == TxnType.ISSUE:
        recalculate_baseline(db, item_id, department_id)

    return txn


def recalculate_baseline(db: Session, item_id: int, department_id: int):
    """Calculates 30-day average daily usage deterministically."""
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    
    total_issued = db.query(func.sum(Transaction.quantity)).filter(
        Transaction.item_id == item_id,
        Transaction.department_id == department_id,
        Transaction.type == TxnType.ISSUE,
        Transaction.timestamp >= thirty_days_ago
    ).scalar() or 0

    avg_daily = total_issued / 30.0

    baseline = db.query(Baseline).filter(
        Baseline.item_id == item_id,
        Baseline.department_id == department_id
    ).first()

    if not baseline:
        baseline = Baseline(item_id=item_id, department_id=department_id)
        db.add(baseline)

    baseline.avg_daily_usage = avg_daily
    baseline.last_updated = datetime.utcnow()
    db.commit()


def get_expenditure_analytics(db: Session):
    """Returns expenditure grouped by department and category."""
    dept_spend = db.query(
        Department.name,
        Department.budget_total,
        Department.budget_used
    ).all()

    category_spend = db.query(
        Item.category,
        func.sum(Transaction.total_value)
    ).join(Transaction, Item.id == Transaction.item_id)\
     .filter(Transaction.type == TxnType.ISSUE)\
     .group_by(Item.category).all()

    return {
        "departments": [
            {"name": name, "total": total, "used": used, "remaining": total - used}
            for name, total, used in dept_spend
        ],
        "categories": [
            {"category": cat, "spend": spend or 0.0}
            for cat, spend in category_spend
        ]
    }