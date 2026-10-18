import os
os.environ["DISABLE_SQLALCHEMY_CEXT"] = "1"

from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Enum, Text, Boolean
from sqlalchemy.orm import relationship, backref
from datetime import datetime
import enum
from app.database import Base


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    DEPT_HEAD = "DEPT_HEAD"
    PROCUREMENT_OFFICER = "PROCUREMENT_OFFICER"
    STOREKEEPER = "STOREKEEPER"
    FINANCE_OFFICER = "FINANCE_OFFICER"
    AUDITOR = "AUDITOR"


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    department = relationship("Department")


class Location(Base):
    __tablename__ = "locations"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)
    parent_id = Column(Integer, ForeignKey("locations.id"), nullable=True)

    children = relationship("Location", backref=backref('parent', remote_side=[id]))


class Department(Base):
    __tablename__ = "departments"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    code = Column(String, unique=True)
    budget_total = Column(Float, default=0.0)
    budget_used = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    @property
    def budget_remaining(self) -> float:
        return (self.budget_total or 0.0) - (self.budget_used or 0.0)


class Vendor(Base):
    __tablename__ = "vendors"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    contact_email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    avg_lead_time_days = Column(Integer, default=7)
    on_time_delivery_rate = Column(Float, default=0.85)
    total_orders = Column(Integer, default=0)
    is_blacklisted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Item(Base):
    __tablename__ = "items"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    sku = Column(String, unique=True)
    category = Column(String)
    domain = Column(String, default="ACADEMIC")
    unit = Column(String, default="pcs")
    current_stock = Column(Integer, default=0)
    reorder_level = Column(Integer, default=10)
    unit_price = Column(Float, default=0.0)
    is_frozen = Column(Boolean, default=False)
    sub_category = Column(String, nullable=True)
    campus_location = Column(String, nullable=True)
    sub_location = Column(String, nullable=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    warehouse = relationship("Warehouse")


class StockBalance(Base):
    __tablename__ = "stock_balances"
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id"))
    location_id = Column(Integer, ForeignKey("locations.id"))
    quantity = Column(Integer, default=0)

    item = relationship("Item")
    location = relationship("Location")


class AssetStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    ASSIGNED = "ASSIGNED"
    MAINTENANCE = "MAINTENANCE"
    RETIRED = "RETIRED"


class Asset(Base):
    __tablename__ = "assets"
    id = Column(Integer, primary_key=True, index=True)
    asset_tag = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    category = Column(String)
    purchase_cost = Column(Float, default=0.0)
    status = Column(Enum(AssetStatus), default=AssetStatus.AVAILABLE)
    assigned_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    assigned_user = relationship("User")
    assigned_department = relationship("Department")
    location = relationship("Location")


class AssetHistory(Base):
    __tablename__ = "asset_history"
    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"))
    action = Column(String, nullable=False)
    notes = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)


class MovementHistory(Base):
    __tablename__ = "movement_history"
    id = Column(Integer, primary_key=True, index=True)
    resource_type = Column(String, nullable=False)
    resource_id = Column(Integer, nullable=False)
    action = Column(String, nullable=False)
    from_location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    to_location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    quantity = Column(Integer, default=1)
    actor = Column(String, default="SYSTEM")
    timestamp = Column(DateTime, default=datetime.utcnow)
    reference = Column(String, nullable=True)
    notes = Column(Text, nullable=True)

    from_location = relationship("Location", foreign_keys=[from_location_id])
    to_location = relationship("Location", foreign_keys=[to_location_id])


class TxnType(str, enum.Enum):
    PURCHASE_RECEIVE = "PURCHASE_RECEIVE"
    ISSUE = "ISSUE"
    RETURN = "RETURN"
    ADJUSTMENT = "ADJUSTMENT"


class PRStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PENDING_HOD = "PENDING_HOD"
    HOD_APPROVED = "HOD_APPROVED"
    HOD_REJECTED = "HOD_REJECTED"
    CONVERTED_TO_PO = "CONVERTED_TO_PO"


class PurchaseRequisition(Base):
    __tablename__ = "purchase_requisitions"
    id = Column(Integer, primary_key=True, index=True)
    pr_number = Column(String, unique=True, nullable=False)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    requested_qty = Column(Integer, nullable=False)
    estimated_unit_price = Column(Float, default=0.0)
    reason = Column(Text, nullable=True)
    status = Column(Enum(PRStatus), default=PRStatus.PENDING_HOD)
    auto_generated = Column(Boolean, default=False)
    created_by = Column(String, default="SYSTEM")
    created_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)
    reviewer_notes = Column(Text, nullable=True)
    converted_to_po_id = Column(Integer, nullable=True)

    item = relationship("Item")
    department = relationship("Department")


class POStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    RECEIVED = "RECEIVED"
    CANCELLED = "CANCELLED"


class CaseStatus(str, enum.Enum):
    OPEN = "OPEN"
    INVESTIGATING = "INVESTIGATING"
    AWAITING_APPROVAL = "AWAITING_APPROVAL"
    RESOLVED = "RESOLVED"
    DISMISSED = "DISMISSED"


class CaseSeverity(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class SignalType(str, enum.Enum):
    VELOCITY_SHOCK = "VELOCITY_SHOCK"
    IMMINENT_STOCKOUT = "IMMINENT_STOCKOUT"
    BILL_MISMATCH = "BILL_MISMATCH"
    BUDGET_ANOMALY = "BUDGET_ANOMALY"
    DUPLICATE_PURCHASE = "DUPLICATE_PURCHASE"


class ActionType(str, enum.Enum):
    DRAFT_PO = "DRAFT_PO"
    FLAG_VENDOR = "FLAG_VENDOR"
    FREEZE_ITEM = "FREEZE_ITEM"
    ESCALATE = "ESCALATE"
    REQUEST_JUSTIFICATION = "REQUEST_JUSTIFICATION"
    DISMISS = "DISMISS"


class RiskClass(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True)
    type = Column(Enum(TxnType), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, default=0.0)
    total_value = Column(Float, default=0.0)
    reference = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    item = relationship("Item")
    department = relationship("Department")
    vendor = relationship("Vendor")


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"
    id = Column(Integer, primary_key=True, index=True)
    po_number = Column(String, unique=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"))
    item_id = Column(Integer, ForeignKey("items.id"))
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    total_amount = Column(Float, nullable=False)
    status = Column(Enum(POStatus), default=POStatus.DRAFT)
    created_by_case_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    approved_at = Column(DateTime, nullable=True)
    received_at = Column(DateTime, nullable=True)

    vendor = relationship("Vendor")
    item = relationship("Item")
    department = relationship("Department")


class Bill(Base):
    __tablename__ = "bills"
    id = Column(Integer, primary_key=True, index=True)
    bill_number = Column(String, unique=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"))
    po_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=True)
    billed_quantity = Column(Integer, nullable=False)
    billed_amount = Column(Float, nullable=False)
    received_quantity = Column(Integer, default=0)
    is_reconciled = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    payment_txn_id = Column(String, nullable=True)
    payment_state = Column(String, nullable=True)
    payment_initiated_at = Column(DateTime, nullable=True)
    payment_completed_at = Column(DateTime, nullable=True)

    vendor = relationship("Vendor")
    po = relationship("PurchaseOrder")


class Baseline(Base):
    __tablename__ = "baselines"
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id"))
    department_id = Column(Integer, ForeignKey("departments.id"))
    avg_daily_usage = Column(Float, default=0.0)
    std_deviation = Column(Float, default=0.0)
    sample_days = Column(Integer, default=30)
    last_updated = Column(DateTime, default=datetime.utcnow)


class Case(Base):
    __tablename__ = "cases"
    id = Column(Integer, primary_key=True, index=True)
    case_number = Column(String, unique=True)
    title = Column(String, nullable=False)
    signal_type = Column(Enum(SignalType), nullable=False)
    severity = Column(Enum(CaseSeverity), default=CaseSeverity.MEDIUM)
    status = Column(Enum(CaseStatus), default=CaseStatus.OPEN)

    item_id = Column(Integer, ForeignKey("items.id"), nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True)

    ai_narrative = Column(Text, nullable=True)
    ai_hypotheses = Column(Text, nullable=True)
    ai_confidence = Column(Integer, nullable=True)

    recommended_action = Column(Enum(ActionType), nullable=True)
    risk_class = Column(Enum(RiskClass), nullable=True)
    action_payload = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    investigated_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    resolution_notes = Column(Text, nullable=True)

    item = relationship("Item")
    department = relationship("Department")
    vendor = relationship("Vendor")
    evidence = relationship("Evidence", back_populates="case", cascade="all, delete-orphan")
    timeline = relationship("CaseTimelineEvent", back_populates="case", cascade="all, delete-orphan")


class Evidence(Base):
    __tablename__ = "evidence"
    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"))
    tool_name = Column(String, nullable=False)
    description = Column(String, nullable=False)
    data_snapshot = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    case = relationship("Case", back_populates="evidence")


class CaseTimelineEvent(Base):
    __tablename__ = "case_timeline"
    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"))
    event_type = Column(String, nullable=False)
    actor = Column(String, default="SYSTEM")
    description = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)

    case = relationship("Case", back_populates="timeline")


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_log"
    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String)
    entity_id = Column(Integer)
    action = Column(String)
    actor = Column(String)
    details = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)


class Warehouse(Base):
    __tablename__ = "warehouses"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    location = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)