from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.models import TxnType, POStatus, CaseStatus, CaseSeverity, SignalType, ActionType, RiskClass


# ============ INVENTORY & LEDGER SCHEMAS ============
class ItemBase(BaseModel):
    name: str
    sku: str
    category: str
    unit: str = "pcs"
    unit_price: float
    reorder_level: int = 10

class ItemCreate(ItemBase):
    initial_stock: int = 0

class ItemResponse(ItemBase):
    id: int
    current_stock: int
    is_frozen: bool
    created_at: datetime
    class Config:
        from_attributes = True


class DepartmentResponse(BaseModel):
    id: int
    name: str
    code: str
    budget_total: float
    budget_used: float
    budget_remaining: float
    class Config:
        from_attributes = True


class VendorResponse(BaseModel):
    id: int
    name: str
    contact_email: Optional[str]
    avg_lead_time_days: int
    on_time_delivery_rate: float
    is_blacklisted: bool
    class Config:
        from_attributes = True


class TransactionCreate(BaseModel):
    item_id: int
    department_id: Optional[int] = None
    vendor_id: Optional[int] = None
    type: TxnType
    quantity: int
    unit_price: Optional[float] = 0.0
    notes: Optional[str] = None


class TransactionResponse(BaseModel):
    id: int
    item_id: int
    type: TxnType
    quantity: int
    unit_price: float
    total_value: float
    timestamp: datetime
    notes: Optional[str]
    class Config:
        from_attributes = True


class POCreate(BaseModel):
    vendor_id: int
    item_id: int
    department_id: Optional[int] = None
    quantity: int
    unit_price: float


class POResponse(BaseModel):
    id: int
    po_number: str
    vendor_id: int
    item_id: int
    quantity: int
    unit_price: float
    total_amount: float
    status: POStatus
    created_at: datetime
    class Config:
        from_attributes = True


# ============ SENTINEL CASE SCHEMAS ============
class EvidenceSchema(BaseModel):
    id: int
    tool_name: str
    description: str
    data_snapshot: str
    created_at: datetime
    class Config:
        from_attributes = True


class TimelineEventSchema(BaseModel):
    id: int
    event_type: str
    actor: str
    description: str
    timestamp: datetime
    class Config:
        from_attributes = True


class CaseResponse(BaseModel):
    id: int
    case_number: str
    title: str
    signal_type: SignalType
    severity: CaseSeverity
    status: CaseStatus
    item_id: Optional[int]
    department_id: Optional[int]
    vendor_id: Optional[int]
    ai_narrative: Optional[str]
    ai_hypotheses: Optional[str]
    ai_confidence: Optional[int]
    recommended_action: Optional[ActionType]
    risk_class: Optional[RiskClass]
    action_payload: Optional[str]
    created_at: datetime
    evidence: List[EvidenceSchema] = []
    timeline: List[TimelineEventSchema] = []
    class Config:
        from_attributes = True
    # ============ PURCHASE REQUEST SCHEMAS ============
class PRItemCreate(BaseModel):
    item_id: int
    quantity: int
    unit_price: float

class PRCreate(BaseModel):
    title: str
    justification: Optional[str] = None
    department_id: int
    requested_by_id: int
    items: List[PRItemCreate]

class PRItemResponse(BaseModel):
    id: int
    item_id: int
    quantity: int
    unit_price: float
    class Config:
        from_attributes = True

class PRResponse(BaseModel):
    id: int
    title: str
    department_id: int
    department_name: Optional[str] = None
    status: str
    justification: Optional[str] = None
    total_estimated: Optional[float] = None
    requested_by_id: Optional[int] = None
    class Config:
        from_attributes = True

# ============ STOCKOUT PREDICTION SCHEMA ============
class StockoutPrediction(BaseModel):
    item_id: int
    item_name: str
    sku: str
    current_stock: int
    unit: str
    avg_daily_usage: float
    days_until_stockout: Optional[float]  # None = no usage data
    reorder_level: int
    domain: Optional[str] = None
    sub_location: Optional[str] = None