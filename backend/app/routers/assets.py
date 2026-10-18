from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from app.database import get_db
from app.models import Asset, AssetStatus, AssetHistory, User, Department

router = APIRouter(prefix="/api/assets", tags=["Fixed Assets"])

class AssetCreate(BaseModel):
    asset_tag: str
    name: str
    category: str
    purchase_cost: float

class AssetAssign(BaseModel):
    user_id: Optional[int] = None
    department_id: Optional[int] = None
    notes: Optional[str] = "Assigned via console"

def serialize_asset(a: Asset):
    return {
        "id": a.id,
        "asset_tag": a.asset_tag,
        "name": a.name,
        "category": a.category,
        "status": a.status.value if hasattr(a.status, "value") else str(a.status),
        "purchase_cost": a.purchase_cost,
        "assigned_user": a.assigned_user.full_name if a.assigned_user else None,
        "assigned_department": a.assigned_department.name if a.assigned_department else None
    }

@router.get("")
@router.get("/")
def get_assets(db: Session = Depends(get_db)):
    assets = db.query(Asset).order_by(Asset.created_at.desc()).all()
    return [serialize_asset(a) for a in assets]

@router.post("")
@router.post("/")
def create_asset(req: AssetCreate, db: Session = Depends(get_db)):
    existing = db.query(Asset).filter(Asset.asset_tag == req.asset_tag).first()
    if existing:
        raise HTTPException(400, f"Asset tag '{req.asset_tag}' already exists in database")
    
    asset = Asset(
        asset_tag=req.asset_tag,
        name=req.name,
        category=req.category,
        purchase_cost=req.purchase_cost,
        status=AssetStatus.AVAILABLE
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    
    history = AssetHistory(asset_id=asset.id, action="REGISTERED", notes="Asset added to register")
    db.add(history)
    db.commit()
    return serialize_asset(asset)

@router.post("/{asset_id}/assign")
def assign_asset(asset_id: int, req: AssetAssign, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(404, "Asset not found")
    
    if req.user_id:
        user = db.query(User).filter(User.id == req.user_id).first()
        if user:
            asset.assigned_user_id = user.id
        
    if req.department_id:
        dept = db.query(Department).filter(Department.id == req.department_id).first()
        if dept:
            asset.assigned_department_id = dept.id

    asset.status = AssetStatus.ASSIGNED
    
    history = AssetHistory(asset_id=asset.id, action="ASSIGNED", notes=req.notes or "Assigned to custodian")
    db.add(history)
    db.commit()
    return {"message": "Asset assigned successfully", "asset": serialize_asset(asset)}

@router.post("/{asset_id}/return")
def return_asset(asset_id: int, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(404, "Asset not found")
    
    asset.status = AssetStatus.AVAILABLE
    asset.assigned_user_id = None
    asset.assigned_department_id = None
    
    history = AssetHistory(asset_id=asset.id, action="RETURNED", notes="Asset returned to stores")
    db.add(history)
    db.commit()
    return {"message": "Asset returned successfully", "asset": serialize_asset(asset)}