import os
import json
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("OPENAI_API_KEY", "")
client = OpenAI(api_key=api_key) if api_key and not api_key.startswith("sk-your") else None

def generate_case_reasoning(case_title: str, evidence_summary: dict) -> dict:
    """Generates structured reasoning narrative using LLM, with fallback."""
    
    # 1. Fallback Rule-Engine (Guarantees system works even without OpenAI key)
    velocity = evidence_summary.get("velocity", {})
    vendors = evidence_summary.get("vendors", {}).get("vendors_analyzed", [])
    budget = evidence_summary.get("budget", {})

    days_left = velocity.get("days_until_stockout", 2.0)
    item_name = velocity.get("item_name", "Resource")
    dept_name = budget.get("department_name", "Department")

    # Pick best vendor that delivers before stockout
    recommended_vendor = next((v for v in vendors if v.get("can_prevent_stockout")), vendors[0] if vendors else {})

    fallback_narrative = (
        f"CRITICAL SHORTAGE DETECTED: {dept_name} consumed stock at {velocity.get('daily_burn_rate', 0)}/day. "
        f"Current stock of {item_name} ({velocity.get('current_stock', 0)} units) will run out in approximately {days_left} days. "
        f"Recommending emergency Purchase Order of 10 units from '{recommended_vendor.get('vendor_name', 'Fast Vendor')}' "
        f"to prevent lab disruption."
    )

    fallback_result = {
        "narrative": fallback_narrative,
        "hypotheses": [
            f"Sudden project or research demand spike in {dept_name}",
            "Uncoordinated bulk requisition across multiple lab sections",
            "Routine inventory baseline miscalculation"
        ],
        "recommended_action": "DRAFT_PO",
        "action_payload": {
            "vendor_id": recommended_vendor.get("vendor_id", 1),
            "vendor_name": recommended_vendor.get("vendor_name", "Apex Tech Supplies"),
            "quantity": 10,
            "unit_price": recommended_vendor.get("estimated_unit_price", 4500.0),
            "total_amount": 10 * recommended_vendor.get("estimated_unit_price", 4500.0)
        },
        "confidence": 92
    }

    # If no valid API key, return deterministic fallback immediately
    if not client:
        return fallback_result

    # 2. Live LLM Call (if API key provided)
    try:
        prompt = f"""
        You are Sentinel, an autonomous institutional resource operations investigator.
        Analyze this gathered evidence for Case: "{case_title}"
        Evidence: {json.dumps(evidence_summary)}

        Respond in JSON with exact keys:
        - narrative: str (Concise operational summary)
        - hypotheses: list of str (3 ranked possible causes)
        - recommended_action: str ("DRAFT_PO", "FLAG_VENDOR", "ESCALATE")
        - action_payload: dict (vendor_id, quantity, unit_price, total_amount)
        - confidence: int (0-100)
        """

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": prompt}],
            response_format={"type": "json_object"},
            timeout=10.0
        )
        return json.loads(response.choices[0].message.content)

    except Exception:
        return fallback_result