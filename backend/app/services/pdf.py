import io
import json
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from app.models import Case, Evidence, CaseTimelineEvent

def generate_case_pdf_bytes(case: Case, evidence_list: list, timeline_list: list) -> io.BytesIO:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle('DocTitle', parent=styles['Heading1'], fontSize=20, leading=24, textColor=colors.HexColor('#0F172A'))
    subtitle_style = ParagraphStyle('DocSub', parent=styles['Normal'], fontSize=10, leading=12, textColor=colors.HexColor('#64748B'))
    heading_style = ParagraphStyle('SectionHeading', parent=styles['Heading2'], fontSize=12, leading=16, textColor=colors.HexColor('#1E293B'), spaceBefore=10, spaceAfter=6)
    body_style = ParagraphStyle('BodyTextCustom', parent=styles['Normal'], fontSize=9, leading=13, textColor=colors.HexColor('#334155'))
    
    story = []

    # Header
    story.append(Paragraph("SENTINEL — INSTITUTIONAL RESOURCE AUDIT REPORT", title_style))
    story.append(Paragraph(f"Official Audit File for Case: <b>{case.case_number}</b> | Generated on: {case.created_at.strftime('%Y-%m-%d %H:%M:%S UTC')}", subtitle_style))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0EA5E9'), spaceAfter=15))

    # Summary Table
    summary_data = [
        [Paragraph("<b>Case Title:</b>", body_style), Paragraph(case.title, body_style)],
        [Paragraph("<b>Signal Type:</b>", body_style), Paragraph(case.signal_type.value, body_style)],
        [Paragraph("<b>Current Status:</b>", body_style), Paragraph(f"<b>{case.status.value}</b>", body_style)],
        [Paragraph("<b>Risk Classification:</b>", body_style), Paragraph(case.risk_class.value if case.risk_class else "N/A", body_style)],
        [Paragraph("<b>Recommended Action:</b>", body_style), Paragraph(case.recommended_action.value if case.recommended_action else "N/A", body_style)]
    ]
    t_summary = Table(summary_data, colWidths=[120, 420])
    t_summary.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#F1F5F9')),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_summary)
    story.append(Spacer(1, 15))

    # Operational Narrative
    story.append(Paragraph("I. AI Operational Investigation Narrative", heading_style))
    story.append(Paragraph(case.ai_narrative or "No narrative generated.", body_style))
    story.append(Spacer(1, 15))

    # Evidence Table
    story.append(Paragraph("II. Deterministic Evidence Gathered (Tool Snapshots)", heading_style))
    ev_table_data = [["Tool Name", "Description", "Snapshot Fact"]]
    for ev in evidence_list:
        ev_table_data.append([
            Paragraph(f"<b>{ev.tool_name}</b>", body_style),
            Paragraph(ev.description, body_style),
            Paragraph(f"<font size=7>{ev.data_snapshot[:120]}...</font>", body_style)
        ])
    t_ev = Table(ev_table_data, colWidths=[130, 210, 200])
    t_ev.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#E2E8F0')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#0F172A')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_ev)
    story.append(Spacer(1, 15))

    # Timeline Table
    story.append(Paragraph("III. Complete Case Audit Timeline", heading_style))
    tl_table_data = [["Timestamp", "Actor", "Event", "Description"]]
    for tl in timeline_list:
        tl_table_data.append([
            Paragraph(tl.timestamp.strftime('%H:%M:%S'), body_style),
            Paragraph(f"<b>{tl.actor}</b>", body_style),
            Paragraph(tl.event_type, body_style),
            Paragraph(tl.description, body_style)
        ])
    t_tl = Table(tl_table_data, colWidths=[60, 110, 110, 260])
    t_tl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F1F5F9')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#F1F5F9')),
        ('PADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_tl)

    doc.build(story)
    buffer.seek(0)
    return buffer