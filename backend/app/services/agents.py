import os
os.environ["DISABLE_SQLALCHEMY_CEXT"] = "1"

from sqlalchemy.orm import Session
from app.models import (
    PurchaseRequisition, PRStatus,
    Item, Department, User, UserRole, Transaction, TxnType
)
from app.services.email import send_email
from datetime import datetime, timedelta
from typing import Optional


def smart_reorder_agent(
    db: Session,
    item_id: int,
    department_id: Optional[int] = None
) -> Optional[PurchaseRequisition]:
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        return None

    if item.current_stock > item.reorder_level:
        return None

    dept_id = department_id or 1

    existing = db.query(PurchaseRequisition).filter(
        PurchaseRequisition.department_id == dept_id,
        PurchaseRequisition.status.in_(["DRAFT", "PENDING", "PENDING_APPROVAL"]),
        PurchaseRequisition.title.like(f"%Auto-Reorder%{item.name}%")
    ).first()
    if existing:
        return None

    admin = db.query(User).filter(User.role == UserRole.SUPER_ADMIN).first()
    requester_id = admin.id if admin else 1

    reorder_qty = max(item.reorder_level * 2, 10)
    estimated   = reorder_qty * (item.unit_price or 0)

    pr = PurchaseRequisition(
        title=f"Auto-Reorder: {item.name} × {reorder_qty}",
        justification=(
            f"Smart Reorder Agent triggered. Stock fell to "
            f"{item.current_stock} {item.unit} "
            f"(reorder level: {item.reorder_level}). "
            f"Auto-requesting {reorder_qty} {item.unit}."
        ),
        department_id=dept_id,
        requested_by_id=requester_id,
        status=PRStatus.PENDING,
        total_estimated=estimated,
    )
    db.add(pr)
    db.commit()
    db.refresh(pr)

    dept = db.query(Department).filter(Department.id == dept_id).first()
    if dept:
        hod = db.query(User).filter(
            User.department_id == dept_id,
            User.role == UserRole.DEPT_HEAD
        ).first()
        if hod and hod.email:
            _email_hod_smart_reorder(
                hod_email=hod.email,
                hod_name=hod.full_name,
                item_name=item.name,
                current_stock=item.current_stock,
                reorder_qty=reorder_qty,
                unit=item.unit,
                dept_name=dept.name,
                pr_id=pr.id,
            )

    return pr


def _email_hod_smart_reorder(
    hod_email: str, hod_name: str,
    item_name: str, current_stock: int,
    reorder_qty: int, unit: str,
    dept_name: str, pr_id: int,
):
    subject = f"[Sentinel] ⚠ Smart Reorder Alert — {item_name} is Low"
    html = f"""
    <div style="font-family:Inter,sans-serif;background:#FAF9F6;color:#252525;
                padding:32px;border-radius:12px;max-width:600px;
                border:1px solid #E9E3D8;">
      <div style="color:#B8862B;font-size:11px;letter-spacing:0.15em;
                  text-transform:uppercase;margin-bottom:8px;">
        Sentinel IMS · Smart Reorder Agent
      </div>
      <h2 style="font-size:22px;font-weight:400;margin:0 0 20px;color:#252525;">
        Auto-Reorder Triggered — <strong>{item_name}</strong>
      </h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr style="border-bottom:1px solid #E9E3D8;">
          <td style="padding:10px 0;color:#77736B;">Item</td>
          <td style="padding:10px 0;font-weight:600;">{item_name}</td>
        </tr>
        <tr style="border-bottom:1px solid #E9E3D8;">
          <td style="padding:10px 0;color:#77736B;">Current Stock</td>
          <td style="padding:10px 0;color:#C0392B;font-weight:700;">
            {current_stock} {unit}
          </td>
        </tr>
        <tr style="border-bottom:1px solid #E9E3D8;">
          <td style="padding:10px 0;color:#77736B;">Auto-Requested Qty</td>
          <td style="padding:10px 0;font-weight:600;">{reorder_qty} {unit}</td>
        </tr>
        <tr style="border-bottom:1px solid #E9E3D8;">
          <td style="padding:10px 0;color:#77736B;">Department</td>
          <td style="padding:10px 0;">{dept_name}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#77736B;">PR Reference</td>
          <td style="padding:10px 0;font-family:monospace;color:#D9A441;">
            PR-{pr_id}
          </td>
        </tr>
      </table>
      <div style="margin-top:24px;padding:14px;background:#FDF3DC;
                  border:1px solid #F0D9A0;border-radius:8px;">
        <p style="margin:0;font-size:13px;color:#B8862B;font-weight:600;">
          Action Required
        </p>
        <p style="margin:6px 0 0;font-size:12px;color:#77736B;">
          Dear {hod_name}, please log in to Sentinel and approve
          PR-{pr_id} so procurement can issue the Purchase Order.
        </p>
      </div>
      <div style="margin-top:20px;font-size:11px;color:#A49E95;">
        Sentinel IMS · AGC Amritsar ·
        {datetime.utcnow().strftime("%d %b %Y %H:%M")} UTC
      </div>
    </div>
    """
    send_email(hod_email, subject, html)


def compute_stockout_predictions(db: Session) -> list:
    items = db.query(Item).all()
    results = []
    cutoff = datetime.utcnow() - timedelta(days=30)

    for item in items:
        txns = db.query(Transaction).filter(
            Transaction.item_id == item.id,
            Transaction.type == TxnType.ISSUE,
            Transaction.timestamp >= cutoff,
        ).all()

        total_issued = sum(t.quantity for t in txns)
        avg_daily    = total_issued / 30.0 if total_issued > 0 else 0.0

        if avg_daily > 0:
            days_left = item.current_stock / avg_daily
        else:
            days_left = None

        results.append({
            "item_id":             item.id,
            "item_name":           item.name,
            "sku":                 item.sku,
            "current_stock":       item.current_stock,
            "unit":                item.unit,
            "avg_daily_usage":     round(avg_daily, 2),
            "days_until_stockout": round(days_left, 1) if days_left is not None else None,
            "reorder_level":       item.reorder_level,
            "domain":              getattr(item, "domain", None),
            "sub_location":        getattr(item, "sub_location", None),
        })

    return results