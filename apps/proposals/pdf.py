"""
Proposal document export (PDF) via reportlab — pure Python, no native deps.

Renders the structured offer into a clean, printable document. Called by the
view to stream a download; the offer snapshot lives in ProposalDocument.
"""
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
)


def _fmt(value, suffix=""):
    if value is None or value == "":
        return "—"
    return f"{value}{suffix}"


def build_proposal_pdf(proposal):
    """Return the proposal rendered as PDF bytes."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=20 * mm, rightMargin=20 * mm,
        topMargin=20 * mm, bottomMargin=20 * mm,
        title=proposal.title or f"Proposal {proposal.deal.deal_ref}",
    )
    styles = getSampleStyleSheet()
    h1 = ParagraphStyle("h1", parent=styles["Heading1"], fontSize=18, spaceAfter=4)
    h2 = ParagraphStyle("h2", parent=styles["Heading2"], fontSize=12, spaceBefore=10, spaceAfter=4)
    body = styles["BodyText"]
    meta = ParagraphStyle("meta", parent=styles["Normal"], fontSize=9, textColor=colors.grey)

    deal = proposal.deal
    elements = []

    elements.append(Paragraph(proposal.title or "Commercial Proposal", h1))
    elements.append(Paragraph(
        f"{deal.deal_ref} · Status: {proposal.get_status_display()}"
        + (f" · Version {proposal.version}" if proposal.version else ""),
        meta,
    ))
    elements.append(Spacer(1, 8))

    def section(title, text):
        if text:
            elements.append(Paragraph(title, h2))
            elements.append(Paragraph(str(text).replace("\n", "<br/>"), body))

    section("Executive Summary", proposal.executive_summary)
    section("Scope of Work", proposal.scope_of_work)

    # Key commercial terms table
    elements.append(Paragraph("Key Commercial Terms", h2))
    rows = [
        ["Proposed tariff (NGN/kWh)", _fmt(proposal.proposed_tariff_ngn_kwh)],
        ["Contract tenor (years)", _fmt(proposal.contract_tenor_years)],
        ["Total contract value (USD m)", _fmt(proposal.total_contract_value_usd_m)],
        ["Valid until", _fmt(proposal.validity_until)],
    ]
    table = Table(rows, colWidths=[70 * mm, 90 * mm])
    table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ("BACKGROUND", (0, 0), (0, -1), colors.whitesmoke),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(table)

    section("Payment Terms", proposal.payment_terms)
    section("Commercial Terms", proposal.commercial_terms)
    section("Assumptions", proposal.assumptions)

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
