"""
Seed the screening reference data: the 5 knockout gates and the 5 pillars
(A–E) with weights 25/25/25/15/10, per the updated Deal Screening Framework
(April 2026). Sub-criteria are added with their intra-pillar weights.

Idempotent: running it again updates rather than duplicates.

NOTE: the decision thresholds (GO/COND/NO-GO bands) are an open item in the
framework (two slides disagree) and are NOT seeded here; they belong to the
scoring engine, a later stage. This command seeds only Stage 1 + pillar
reference structure.
"""
from django.core.management.base import BaseCommand
from apps.screening.models import KnockoutGate, Pillar, SubCriterion

GATES = [
    (1, "Demand / Off-taker", "Confirmed, scalable demand backed by evidence (metered data, signed LOIs, or verifiable bills).", "Site survey · meter logs · signed LOIs/MOUs"),
    (2, "Creditworthy Counterparty", "Named, KYC-clean customer able to pay for the contract life; 2 yrs clean history; no sanctions/unresolved litigation.", "2-yr audited F/S · KYC pack"),
    (3, "Regulatory Pathway", "All required permits obtainable within the project timeline; regulator pathway named; precedent exists; lead time ≤ schedule.", "Regulatory opinion · permit register · precedents"),
    (4, "Commercial Viability", "Tariff ≥10% below the customer's diesel alternative AND project IRR meets DEL hurdle in base case.", "Tariff model · alt-cost benchmark · IRR model"),
    (5, "Strategic Alignment", "Fits DEL's mandate, geography and platform thesis; gas/power/adjacent infra; Nigeria/West Africa.", "Strategy-fit memo · portfolio map"),
]

PILLARS = [
    ("A", "Commercial Viability", "Revenue reality, tariff, contract", "25.00", 15),
    ("B", "Technical & Operational", "Can we build and run it?", "25.00", 12),
    ("C", "Risk & Regulatory", "What could stop or stall us?", "25.00", 12),
    ("D", "Financial Attractiveness", "Returns vs hurdle, under stress", "15.00", 9),
    ("E", "Ability to Fund", "Equity, debt, bankability", "10.00", 9),
]

SUB_CRITERIA = {
    "A": [("Counterparty Credit", "20.00"), ("Tariff Competitiveness", "20.00"),
          ("Contract Strength", "20.00"), ("Demand Certainty", "20.00"),
          ("Guaranteed Minimum Offtake", "20.00")],
    "B": [("Technology Maturity", "25.00"), ("EPC / Construction Risk", "25.00"),
          ("O&M Capability", "25.00"), ("Site & Interconnection", "25.00")],
    "C": [("Licensing & Permits", "25.00"), ("Land Title & Legal", "25.00"),
          ("ESG / Investor Alignment", "25.00"), ("Security", "25.00")],
    "D": [("Equity IRR", "33.30"), ("Payback Period", "33.30"), ("EBITDA Margin", "33.40")],
    "E": [("Equity Availability", "33.30"), ("Co-investor Interest", "33.30"),
          ("Funding Timeline Alignment", "33.40")],
}


class Command(BaseCommand):
    help = "Seed knockout gates, pillars, and sub-criteria reference data."

    def handle(self, *args, **options):
        for number, name, cond, evidence in GATES:
            KnockoutGate.objects.update_or_create(
                number=number,
                defaults={"name": name, "pass_condition": cond, "required_evidence": evidence},
            )
        self.stdout.write(self.style.SUCCESS(f"Seeded {len(GATES)} knockout gates."))

        for code, name, desc, weight, threshold in PILLARS:
            pillar, _ = Pillar.objects.update_or_create(
                code=code,
                defaults={"name": name, "description": desc,
                          "weight_pct": weight, "pass_threshold": threshold},
            )
            for i, (sc_name, sc_weight) in enumerate(SUB_CRITERIA[code]):
                SubCriterion.objects.update_or_create(
                    pillar=pillar, name=sc_name,
                    defaults={"weight_in_pillar": sc_weight, "order": i},
                )
        self.stdout.write(self.style.SUCCESS(f"Seeded {len(PILLARS)} pillars and sub-criteria."))
        self.stdout.write(self.style.WARNING(
            "Note: decision thresholds (GO/COND/NO-GO) are an open item; not seeded."
        ))
