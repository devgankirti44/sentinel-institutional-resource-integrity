from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from app.database import get_db
from app.models import Notification, AuditLog, Warehouse

router = APIRouter(prefix="/api/operations", tags=["System Operations"])

class WarehouseCreate(BaseModel):
    name: str
    location: str

@router.get("/warehouses")
@router.get("/warehouses/")
def get_warehouses(db: Session = Depends(get_db)):
    return db.query(Warehouse).all()

@router.post("/warehouses")
@router.post("/warehouses/")
def create_warehouse(req: WarehouseCreate, db: Session = Depends(get_db)):
    existing = db.query(Warehouse).filter(Warehouse.name == req.name).first()
    if existing:
        raise HTTPException(400, f"Warehouse '{req.name}' already exists")
    w = Warehouse(name=req.name, location=req.location)
    db.add(w)
    db.commit()
    db.refresh(w)
    return w

@router.get("/notifications")
@router.get("/notifications/")
def get_notifications(db: Session = Depends(get_db)):
    return db.query(Notification).order_by(Notification.created_at.desc()).limit(30).all()

@router.post("/notifications/{id}/read")
def mark_notification_read(id: int, db: Session = Depends(get_db)):
    noti = db.query(Notification).filter(Notification.id == id).first()
    if noti:
        noti.is_read = True
        db.commit()
    return {"message": "Marked read"}

@router.get("/audit")
@router.get("/audit/")
def get_audit_logs(db: Session = Depends(get_db)):
    return db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(100).all()