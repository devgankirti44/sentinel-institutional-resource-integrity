# app/services/email.py
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

GMAIL_USER = "devgankirti44@gmail.com"
GMAIL_PASS = "gbcz ixpn bylz khhf"

def send_email(to: str, subject: str, html_body: str):
    """Send real email via Gmail SMTP."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"Sentinel IMS <{GMAIL_USER}>"
        msg["To"]      = to

        part = MIMEText(html_body, "html")
        msg.attach(part)

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(GMAIL_USER, GMAIL_PASS)
            server.sendmail(GMAIL_USER, to, msg.as_string())

        print(f"[EMAIL] Sent to {to}: {subject}")
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")
        return False


def email_hod_new_requisition(
    hod_email: str, hod_name: str,
    item_name: str, quantity: int,
    department: str, raised_by: str,
    justification: str, po_number: str
):
    subject = f"[Sentinel] New Requisition Needs Your Approval — {po_number}"
    html = f"""
    <div style="font-family:Inter,sans-serif;background:#0A0908;color:#F5EFE4;padding:32px;border-radius:12px;max-width:600px">
      <div style="color:#D97706;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:8px">
        Sentinel IMS · Approval Required
      </div>
      <h2 style="font-size:24px;font-weight:300;margin:0 0 24px">
        New Requisition — {po_number}
      </h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr style="border-bottom:1px solid #2A2520">
          <td style="padding:12px 0;color:#8B8578">Item</td>
          <td style="padding:12px 0;font-weight:600">{item_name}</td>
        </tr>
        <tr style="border-bottom:1px solid #2A2520">
          <td style="padding:12px 0;color:#8B8578">Quantity</td>
          <td style="padding:12px 0">{quantity} units</td>
        </tr>
        <tr style="border-bottom:1px solid #2A2520">
          <td style="padding:12px 0;color:#8B8578">Department</td>
          <td style="padding:12px 0">{department}</td>
        </tr>
        <tr style="border-bottom:1px solid #2A2520">
          <td style="padding:12px 0;color:#8B8578">Raised by</td>
          <td style="padding:12px 0">{raised_by}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;color:#8B8578">Justification</td>
          <td style="padding:12px 0;font-style:italic">{justification}</td>
        </tr>
      </table>
      <div style="margin-top:32px;padding:16px;background:#1A1714;border-radius:8px;border:1px solid #2A2520">
        <p style="margin:0;font-size:13px;color:#8B8578">
          Log in to Sentinel to approve or reject this requisition.
        </p>
      </div>
      <div style="margin-top:24px;font-size:11px;color:#5C574E">
        Sentinel Institutional Resource Management System · {datetime.utcnow().strftime("%d %b %Y %H:%M")} UTC
      </div>
    </div>
    """
    return send_email(hod_email, subject, html)


def email_vendor_complaint(
    vendor_email: str, vendor_name: str,
    po_number: str, bill_number: str,
    po_qty: int, billed_qty: int,
    po_amount: float, billed_amount: float,
    vendor_phone: str
):
    gap_qty    = billed_qty - po_qty
    gap_amount = billed_amount - po_amount
    subject    = f"[Sentinel] Invoice Dispute Notice — {bill_number} against {po_number}"
    html = f"""
    <div style="font-family:Inter,sans-serif;background:#0A0908;color:#F5EFE4;padding:32px;border-radius:12px;max-width:600px">
      <div style="color:#E11D48;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:8px">
        Sentinel IMS · Formal Dispute Notice
      </div>
      <h2 style="font-size:24px;font-weight:300;margin:0 0 8px">
        Invoice Mismatch Detected
      </h2>
      <p style="color:#8B8578;margin:0 0 24px;font-size:13px">
        Dear {vendor_name}, our 3-way match engine has detected a discrepancy
        between your invoice and the authorised Purchase Order.
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr style="background:#1A1714">
          <th style="padding:10px 12px;text-align:left;color:#8B8578;font-weight:500">Field</th>
          <th style="padding:10px 12px;text-align:right;color:#8B8578;font-weight:500">PO (Authorised)</th>
          <th style="padding:10px 12px;text-align:right;color:#8B8578;font-weight:500">Invoice (Submitted)</th>
          <th style="padding:10px 12px;text-align:right;color:#E11D48;font-weight:500">Gap</th>
        </tr>
        <tr style="border-bottom:1px solid #2A2520">
          <td style="padding:12px">Quantity</td>
          <td style="padding:12px;text-align:right">{po_qty}</td>
          <td style="padding:12px;text-align:right">{billed_qty}</td>
          <td style="padding:12px;text-align:right;color:#E11D48">{gap_qty:+d}</td>
        </tr>
        <tr style="border-bottom:1px solid #2A2520">
          <td style="padding:12px">Amount</td>
          <td style="padding:12px;text-align:right">₹{po_amount:,.2f}</td>
          <td style="padding:12px;text-align:right">₹{billed_amount:,.2f}</td>
          <td style="padding:12px;text-align:right;color:#E11D48">₹{gap_amount:+,.2f}</td>
        </tr>
      </table>
      <div style="margin-top:24px;padding:16px;background:#1A0A0A;border:1px solid #E11D4833;border-radius:8px">
        <p style="margin:0;font-size:13px;color:#F5EFE4;font-weight:600">
          Action Required Within 48 Hours
        </p>
        <p style="margin:8px 0 0;font-size:12px;color:#8B8578">
          Please respond to this email with a corrected invoice or justification.
          For urgent resolution, contact our procurement team at {vendor_phone}.
        </p>
      </div>
      <div style="margin-top:16px;padding:12px;background:#141210;border-radius:8px;font-size:12px;color:#5C574E">
        Reference: PO {po_number} | Bill {bill_number} | Case auto-opened in Sentinel
      </div>
    </div>
    """
    return send_email(vendor_email, subject, html)


def email_storekeeper_approved(
    store_email: str, store_name: str,
    po_number: str, item_name: str,
    quantity: int, vendor_name: str
):
    subject = f"[Sentinel] Requisition Approved — {po_number}"
    html = f"""
    <div style="font-family:Inter,sans-serif;background:#0A0908;color:#F5EFE4;padding:32px;border-radius:12px;max-width:600px">
      <div style="color:#4ADE80;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:8px">
        Sentinel IMS · Approved
      </div>
      <h2 style="font-size:24px;font-weight:300;margin:0 0 24px">
        Your requisition has been approved
      </h2>
      <p style="color:#8B8578;font-size:13px">
        {po_number} for {quantity}× {item_name} from {vendor_name}
        has been approved. Please coordinate goods receipt when delivery arrives.
      </p>
    </div>
    """
    return send_email(store_email, subject, html)


def email_finance_payment_due(
    finance_email: str,
    po_number: str, vendor_name: str,
    amount: float, vendor_phone: str
):
    subject = f"[Sentinel] Payment Due — {po_number} · ₹{amount:,.2f}"
    html = f"""
    <div style="font-family:Inter,sans-serif;background:#0A0908;color:#F5EFE4;padding:32px;border-radius:12px;max-width:600px">
      <div style="color:#D97706;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:8px">
        Sentinel IMS · Payment Required
      </div>
      <h2 style="font-size:24px;font-weight:300;margin:0 0 24px">
        Invoice Matched — Payment Due
      </h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr style="border-bottom:1px solid #2A2520">
          <td style="padding:12px 0;color:#8B8578">Vendor</td>
          <td style="padding:12px 0;font-weight:600">{vendor_name}</td>
        </tr>
        <tr style="border-bottom:1px solid #2A2520">
          <td style="padding:12px 0;color:#8B8578">PO</td>
          <td style="padding:12px 0">{po_number}</td>
        </tr>
        <tr style="border-bottom:1px solid #2A2520">
          <td style="padding:12px 0;color:#8B8578">Amount</td>
          <td style="padding:12px 0;font-size:18px;font-weight:600;color:#D97706">₹{amount:,.2f}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;color:#8B8578">Vendor Phone</td>
          <td style="padding:12px 0">{vendor_phone}</td>
        </tr>
      </table>
      <div style="margin-top:24px;padding:16px;background:#1A1714;border-radius:8px">
        <p style="margin:0;font-size:13px;color:#8B8578">
          Log in to Sentinel to initiate payment via PhonePe.
        </p>
      </div>
    </div>
    """
    return send_email(finance_email, subject, html)