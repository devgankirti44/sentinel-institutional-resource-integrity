"""
PhonePe Payment Gateway Integration
Sandbox credentials active until merchant account approval.
Merchant ID    : PGTESTPAYUAT86
Salt Key       : 96434309-7796-489d-8924-ab56988a6076
Salt Index     : 1
Environment    : SANDBOX
Callback host  : https://pasty-citric-division.ngrok-free.dev
"""

import hashlib
import base64
import json
import uuid
import httpx
from datetime import datetime

# ── Sandbox Configuration ─────────────────────────────────────────────────────
PHONEPE_BASE_URL  = "https://api-preprod.phonepe.com/apis/pg-sandbox"
MERCHANT_ID       = "PGTESTPAYUAT86"
SALT_KEY          = "96434309-7796-489d-8924-ab56988a6076"
SALT_INDEX        = 1
NGROK_BASE        = "https://pasty-citric-division.ngrok-free.dev"

PAY_ENDPOINT      = "/pg/v1/pay"
STATUS_ENDPOINT   = "/pg/v1/status"

# ── Checksum Helpers ──────────────────────────────────────────────────────────

def _sha256_hex(data: str) -> str:
    return hashlib.sha256(data.encode()).hexdigest()


def _build_checksum(base64_payload: str, api_endpoint: str) -> str:
    """
    PhonePe checksum = SHA256( base64Payload + apiEndpoint + saltKey ) + ### + saltIndex
    """
    raw = base64_payload + api_endpoint + SALT_KEY
    return _sha256_hex(raw) + "###" + str(SALT_INDEX)


def _verify_checksum(x_verify_header: str, base64_response: str) -> bool:
    """Verifies the X-VERIFY header on callback / status responses."""
    try:
        received_hash, received_index = x_verify_header.rsplit("###", 1)
        expected = _sha256_hex(base64_response + SALT_KEY)
        return received_hash == expected and int(received_index) == SALT_INDEX
    except Exception:
        return False


# ── Public API ────────────────────────────────────────────────────────────────

def initiate_payment(
    bill_id: int,
    amount_rupees: float,
    mobile: str = "9999999999",      # sandbox accepts any 10-digit number
) -> dict:
    """
    Initiates a PhonePe UPI payment for a matched invoice.
    Returns the phonePe redirect URL + our merchant transaction ID.

    Args:
        bill_id       : Sentinel Bill.id — used as idempotency key part
        amount_rupees : Exact invoice amount in ₹ (converted to paise internally)
        mobile        : Buyer's mobile number for UPI linking

    Returns dict with keys:
        success              : bool
        merchant_txn_id      : str  — store in Bill for status polling
        redirect_url         : str  — open this in browser / new tab
        raw_response         : dict — full PhonePe API response for audit log
    """
    merchant_txn_id = f"SENTINEL-BILL-{bill_id}-{uuid.uuid4().hex[:8].upper()}"
    amount_paise    = int(round(amount_rupees * 100))

    payload = {
        "merchantId":            MERCHANT_ID,
        "merchantTransactionId": merchant_txn_id,
        "merchantUserId":        f"SENTINEL-USER-{bill_id}",
        "amount":                amount_paise,
        "redirectUrl":           f"{NGROK_BASE}/api/payments/redirect/{merchant_txn_id}",
        "redirectMode":          "POST",
        "callbackUrl":           f"{NGROK_BASE}/api/payments/callback",
        "mobileNumber":          mobile,
        "paymentInstrument": {
            "type": "PAY_PAGE"          # Renders PhonePe hosted UPI pay page
        }
    }

    payload_json    = json.dumps(payload, separators=(",", ":"))
    payload_b64     = base64.b64encode(payload_json.encode()).decode()
    checksum        = _build_checksum(payload_b64, PAY_ENDPOINT)

    headers = {
        "Content-Type": "application/json",
        "X-VERIFY":     checksum,
        "X-MERCHANT-ID": MERCHANT_ID,
    }
    body = {"request": payload_b64}

    try:
        resp = httpx.post(
            PHONEPE_BASE_URL + PAY_ENDPOINT,
            json=body,
            headers=headers,
            timeout=15.0
        )
        data = resp.json()

        if data.get("success") and data.get("data", {}).get("instrumentResponse"):
            redirect_url = (
                data["data"]["instrumentResponse"]
                .get("redirectInfo", {})
                .get("url", "")
            )
            return {
                "success":         True,
                "merchant_txn_id": merchant_txn_id,
                "redirect_url":    redirect_url,
                "raw_response":    data,
            }
        else:
            return {
                "success":         False,
                "merchant_txn_id": merchant_txn_id,
                "redirect_url":    None,
                "raw_response":    data,
                "error":           data.get("message", "PhonePe initiation failed"),
            }

    except httpx.RequestError as exc:
        return {
            "success":         False,
            "merchant_txn_id": merchant_txn_id,
            "redirect_url":    None,
            "raw_response":    {},
            "error":           f"Network error contacting PhonePe: {str(exc)}",
        }


def check_payment_status(merchant_txn_id: str) -> dict:
    """
    Polls PhonePe for the current payment status.

    Returns dict with keys:
        success       : bool
        state         : str  — PENDING | COMPLETED | FAILED
        raw_response  : dict
    """
    endpoint = f"{STATUS_ENDPOINT}/{MERCHANT_ID}/{merchant_txn_id}"
    checksum = _build_checksum("", endpoint)   # no payload for GET status

    # PhonePe status check uses SHA256("" + endpoint + saltKey)###saltIndex
    raw      = endpoint + SALT_KEY
    hash_val = _sha256_hex(raw) + "###" + str(SALT_INDEX)

    headers = {
        "Content-Type":  "application/json",
        "X-VERIFY":      hash_val,
        "X-MERCHANT-ID": MERCHANT_ID,
    }

    try:
        resp = httpx.get(
            PHONEPE_BASE_URL + endpoint,
            headers=headers,
            timeout=15.0
        )
        data = resp.json()

        state = (
            data.get("data", {}).get("state", "UNKNOWN")
            if data.get("success")
            else "FAILED"
        )
        return {
            "success":      data.get("success", False),
            "state":        state,
            "raw_response": data,
        }

    except httpx.RequestError as exc:
        return {
            "success":      False,
            "state":        "UNKNOWN",
            "raw_response": {},
            "error":        str(exc),
        }