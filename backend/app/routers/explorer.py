from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.database import get_db
from app.models import Location, Asset, Item, StockBalance, MovementHistory,   Transaction, TxnType, PurchaseOrder, POStatus, Department,AssetStatus

router = APIRouter(prefix="/api/explorer", tags=["Resource Explorer"])

def build_tree(locations, parent_id=None):
    tree = []
    for loc in [l for l in locations if l.parent_id == parent_id]:
        node = {
            "id": loc.id,
            "name": loc.name,
            "type": loc.type,
            "children": build_tree(locations, loc.id)
        }
        tree.append(node)
    return tree

@router.get("/locations/tree")
def get_location_tree(db: Session = Depends(get_db)):
    """Returns the nested university campus location hierarchy."""
    locations = db.query(Location).all()
    return build_tree(locations)

@router.get("/locations/{location_id}/resources")
def get_resources_at_location(location_id: int, db: Session = Depends(get_db)):
    """Returns all fixed assets and consumable stock currently physically at this location."""
    # 1. Get Fixed Assets here
    assets = db.query(Asset).filter(Asset.location_id == location_id).all()
    
    # 2. Get Consumable Stock here
    stock = db.query(StockBalance).filter(StockBalance.location_id == location_id, StockBalance.quantity > 0).all()
    
    results = []
    for a in assets:
        results.append({
            "resource_type": "ASSET",
            "id": a.id,
            "name": a.name,
            "tag": a.asset_tag,
            "category": a.category,
            "quantity": 1,
            "status": a.status.value if hasattr(a.status, "value") else str(a.status),
            "custodian": a.assigned_user.full_name if a.assigned_user else None
        })
        
    for s in stock:
        results.append({
            "resource_type": "ITEM",
            "id": s.item.id,
            "name": s.item.name,
            "tag": s.item.sku,
            "category": s.item.category,
            "quantity": s.quantity,
            "status": "STOCK",
            "custodian": None
        })
        
    return results

@router.get("/movements/{resource_type}/{resource_id}")
def get_movement_timeline(resource_type: str, resource_id: int, db: Session = Depends(get_db)):
    """Returns the complete chronological lifecycle of a specific resource."""
    movements = db.query(MovementHistory).filter(
        MovementHistory.resource_type == resource_type.upper(),
        MovementHistory.resource_id == resource_id
    ).order_by(MovementHistory.timestamp.asc()).all()
    
    timeline = []
    for m in movements:
        timeline.append({
            "id": m.id,
            "action": m.action,
            "quantity": m.quantity,
            "from_loc": m.from_location.name if m.from_location else "External / Supplier",
            "to_loc": m.to_location.name if m.to_location else "Unknown",
            "actor": m.actor,
            "timestamp": m.timestamp.isoformat(),
            "notes": m.notes,
            "reference": m.reference
        })
    return timeline
# ─────────────────────────────────────────────────────────────────────────────
# CAMPUS MAP — location summary endpoint
# Called once on dashboard load; cached by frontend.
# Returns per-location resource intelligence for all 8 map markers.
# ─────────────────────────────────────────────────────────────────────────────

# Maps frontend CAMPUS_LOCATION dept names → Item.domain values in DB
DEPT_TO_DOMAIN: Dict[str, List[str]] = {
    "Academic Affairs":      ["ACADEMIC"],
    "Hostel Administration": ["HOSTEL"],
    "Sports Department":     ["SPORTS"],
    "Medical Center":        ["MEDICAL"],
    "Mess & Catering":       ["MESS"],
    "Maintenance & Works":   ["MAINT", "MAINTENANCE"],
}

# Maps frontend CAMPUS_LOCATION dept names → Department.name in DB
DEPT_NAME_ALIASES: Dict[str, str] = {
    "Academic Affairs":      "Academic Affairs",
    "Hostel Administration": "Hostel Administration",
    "Sports Department":     "Sports Department",
    "Medical Center":        "Medical Center",
    "Mess & Catering":       "Mess & Catering",
    "Maintenance & Works":   "Maintenance & Works",
}

# Two campus locations share "Academic Affairs" — library gets subset
LOCATION_DOMAIN_OVERRIDE: Dict[str, List[str]] = {
    "library": ["ACADEMIC"],   # subset — books/stationery only
    "main":    ["ACADEMIC"],   # full academic domain
}


@router.get("/map/location-summary")
def get_map_location_summary(db: Session = Depends(get_db)):
    """
    Returns a dict keyed by campus location ID (matches CAMPUS_LOCATIONS in
    page.tsx). Each entry contains real aggregated resource intelligence:
    item counts, asset counts, category breakdown, low-stock alerts,
    pending PRs, and recent dispatch activity.

    Rules:
    - Items are matched via Item.domain → dept name.
    - Assets are matched via Asset.assigned_department_id → Department.name.
    - Transactions (ISSUE type) identify what has been dispatched TO a dept.
    - current_stock on Item is the authoritative live figure.
    - A resource dispatched elsewhere is NOT double-counted here.
    """

    # Pre-load all departments once
    all_depts: List[Department] = db.query(Department).all()
    dept_by_name: Dict[str, Department] = {d.name: d for d in all_depts}

    # Pre-load all items once (small table, safe)
    all_items: List[Item] = db.query(Item).all()

    # Pre-load all assets once
    all_assets: List[Asset] = db.query(Asset).all()

    # Pre-load pending PRs
    pending_prs = db.query(PurchaseOrder).filter(
        PurchaseOrder.status == POStatus.PENDING_APPROVAL
    ).all()

    # Pre-load recent ISSUE transactions (last 50)
    recent_issues = (
        db.query(Transaction)
        .filter(Transaction.type == TxnType.ISSUE)
        .order_by(Transaction.timestamp.desc())
        .limit(50)
        .all()
    )

    # Campus location definitions (mirrors frontend CAMPUS_LOCATIONS)
    campus_locations = [
        {"id": "main",     "name": "Main Academic Block", "dept": "Academic Affairs",      "domain_key": "main"},
        {"id": "hostel_b", "name": "Boys' Hostel",        "dept": "Hostel Administration", "domain_key": None},
        {"id": "hostel_g", "name": "Girls' Hostel",       "dept": "Hostel Administration", "domain_key": None},
        {"id": "sports",   "name": "Sports Complex",      "dept": "Sports Department",     "domain_key": None},
        {"id": "medical",  "name": "Medical Centre",      "dept": "Medical Center",        "domain_key": None},
        {"id": "mess",     "name": "Central Mess",        "dept": "Mess & Catering",       "domain_key": None},
        {"id": "maint",    "name": "Maintenance Store",   "dept": "Maintenance & Works",   "domain_key": None},
        {"id": "library",  "name": "Central Library",     "dept": "Academic Affairs",      "domain_key": "library"},
    ]

    summaries: Dict[str, Any] = {}

    for loc in campus_locations:
        loc_id    = loc["id"]
        dept_name = loc["dept"]
        domains   = DEPT_TO_DOMAIN.get(dept_name, [])
        dept_obj  = dept_by_name.get(dept_name)
        dept_db_id = dept_obj.id if dept_obj else None

        # ── 1. Items (consumables) ─────────────────────────────────────────
        # Filter by domain. For locations sharing a dept (main + library),
        # both see the full academic domain — we note this in the response.
        loc_items = [
            it for it in all_items
            if (it.domain or "ACADEMIC").upper() in [d.upper() for d in domains]
        ]

        total_item_count  = len(loc_items)
        total_stock_units = sum(it.current_stock for it in loc_items)
        loc_items   = [
            it for it in loc_items
            if it.current_stock <= it.reorder_level
        ]

        # Category breakdown of consumables
        category_counts: Dict[str, int] = {}
        for it in loc_items:
            cat = it.category or "Uncategorised"
            category_counts[cat] = category_counts.get(cat, 0) + it.current_stock

        # Total inventory value (current_stock × unit_price)
        inventory_value = sum(
            it.current_stock * (it.unit_price or 0.0) for it in loc_items
        )

        # ── 2. Assets (fixed) ──────────────────────────────────────────────
        loc_assets = [
            a for a in all_assets
            if a.assigned_department_id == dept_db_id
        ] if dept_db_id else []

        total_asset_count  = len(loc_assets)
        asset_value        = sum(a.purchase_cost or 0.0 for a in loc_assets)
        available_assets   = sum(1 for a in loc_assets if a.status == AssetStatus.AVAILABLE)
        assigned_assets    = sum(1 for a in loc_assets if a.status == AssetStatus.ASSIGNED)
        maintenance_assets = sum(1 for a in loc_assets if a.status == AssetStatus.MAINTENANCE)

        asset_categories: Dict[str, int] = {}
        for a in loc_assets:
            cat = a.category or "Uncategorised"
            asset_categories[cat] = asset_categories.get(cat, 0) + 1

        # ── 3. Recent movements (ISSUE transactions for this dept) ─────────
        dept_issues = [
            t for t in recent_issues
            if t.department_id == dept_db_id
        ] if dept_db_id else []

        recent_in  = dept_issues[:3]   # most recent dispatches TO this dept
        last_movement_time = (
            dept_issues[0].timestamp.isoformat() if dept_issues else None
        )

        recent_in_summary = []
        for t in recent_in:
            item_obj = next((i for i in all_items if i.id == t.item_id), None)
            recent_in_summary.append({
                "item":      item_obj.name if item_obj else f"Item #{t.item_id}",
                "qty":       t.quantity,
                "timestamp": t.timestamp.isoformat(),
            })

        # ── 4. Pending PRs for this dept ───────────────────────────────────
        dept_pending_prs = [
            pr for pr in pending_prs
            if pr.department_id == dept_db_id
        ] if dept_db_id else []

        # ── 5. Determine marker state ──────────────────────────────────────
        # CRITICAL  → any low stock item has current_stock = 0
        # ATTENTION → low stock items exist OR pending PRs > 0 OR maintenance assets
        # NORMAL    → resources tracked, no issues
        # UNMAPPED  → no items and no assets found at all
        has_zero_stock = any(it.current_stock == 0 for it in loc_items)
        has_issues     = (
            len(loc_items) > 0 or
            len(dept_pending_prs) > 0 or
            maintenance_assets > 0
        )
        no_data        = total_item_count == 0 and total_asset_count == 0

        if no_data:
            marker_state = "UNMAPPED"
        elif has_zero_stock:
            marker_state = "CRITICAL"
        elif has_issues:
            marker_state = "ATTENTION"
        else:
            marker_state = "NORMAL"

        # ── 6. Attention items list ────────────────────────────────────────
        attention_items = []
        for it in loc_items[:5]:
            attention_items.append({
                "name":          it.name,
                "current_stock": it.current_stock,
                "reorder_level": it.reorder_level,
                "unit":          it.unit or "pcs",
                "critical":      it.current_stock == 0,
            })

        # Note for shared-dept locations (main + library both = Academic Affairs)
        shared_dept_note = (
            "Items shown are domain-wide (Academic Affairs). "
            "Building-level filtering requires location tags on items."
            if dept_name == "Academic Affairs" and total_item_count > 0
            else None
        )

        summaries[loc_id] = {
            "location_id":    loc_id,
            "location_name":  loc["name"],
            "dept_name":      dept_name,
            "marker_state":   marker_state,  # NORMAL | ATTENTION | CRITICAL | UNMAPPED

            # Inventory (consumables)
            "items": {
                "total_skus":         total_item_count,
                "total_stock_units":  total_stock_units,
                "low_stock_count":    len(loc_items),
                "inventory_value":    round(inventory_value, 2),
                "category_breakdown": category_counts,
                "attention_items":    attention_items,
            },

            # Fixed assets
            "assets": {
                "total":       total_asset_count,
                "available":   available_assets,
                "assigned":    assigned_assets,
                "maintenance": maintenance_assets,
                "total_value": round(asset_value, 2),
                "categories":  asset_categories,
            },

            # Movements
            "movements": {
                "recent_in":        recent_in_summary,
                "total_dispatched":  len(dept_issues),
                "last_movement_at":  last_movement_time,
            },

            # Procurement
            "procurement": {
                "pending_prs": len(dept_pending_prs),
            },

            # Meta
            "data_note":      shared_dept_note,
            "data_available": not no_data,
        }

    return summaries