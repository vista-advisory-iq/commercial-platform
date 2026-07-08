"""
Seed the screening reference data: the 5 knockout gates and the 5 pillars
(A–E) with weights 25/25/25/15/10, per the Deal Screening Framework (April 2026,
slides 5–11).

Each sub-criterion carries its 1/3/5 band definitions and method/evidence note
from the framework. Sub-criteria that are genuinely measurable (IRR, payback,
EBITDA margin, contract tenor) are marked NUMERIC with a `numeric_bands` ladder,
so their score is DERIVED from the figure the analyst enters rather than a
subjective 1/3/5 pick (CLAUDE.md convention 7 — pillars still scored indirectly).
The rest are QUALITATIVE: the analyst picks the band that matches the evidence.

Idempotent: matched on (pillar, name), so re-running updates rather than
duplicates. Existing names are preserved deliberately for that reason.
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


def band(score, threshold):
    return {"score": score, "threshold": threshold}


# name, weight, band_1, band_3, band_5, method/evidence, extra{input_type/unit/higher_is_better/numeric_bands}
Q = {"input_type": SubCriterion.InputType.QUALITATIVE}


def numeric(unit, higher_is_better, bands):
    return {
        "input_type": SubCriterion.InputType.NUMERIC,
        "unit": unit,
        "higher_is_better": higher_is_better,
        "numeric_bands": bands,
    }


SUB_CRITERIA = {
    "A": [
        ("Counterparty Credit", "20.00",
         "Unrated / weak SME / history of arrears",
         "Mid-tier corporate, 1–2 yrs clean record, no bank guarantees",
         "Multinational / sovereign-guaranteed / bank LC",
         "Credit bureau · 2-yr audited F/S · bank references", Q),
        ("Tariff Competitiveness", "20.00",
         "Tariff above the customer's current alternative",
         "At parity with the grid/diesel equivalent",
         "Tariff ≥10% below the customer's current alternative",
         "Benchmark vs alternative cost", Q),
        ("Contract Strength", "20.00",
         "< 3 yrs contract tenor",
         "3–6 yrs contract tenor",
         "≥ 10 yrs contract tenor",
         "Legal review of PPA/GSA term sheet",
         numeric("years", True, [band(5, 10), band(4, 7), band(3, 3), band(2, 1), band(1, 0)])),
        ("Demand Certainty", "20.00",
         "Forecast only; no metered data",
         "Site-metered OR comparable facility data",
         "Measured load ≥ 12 months",
         "Load study, meter logs", Q),
        ("Guaranteed Minimum Offtake", "20.00",
         "No minimum-offtake / take-or-pay commitment",
         "Partial volume commitment in signed heads of terms",
         "Firm take-or-pay minimum offtake in signed contract",
         "Review signed contracts, volume commitments", Q),
    ],
    "B": [
        ("Technology Maturity", "25.00",
         "Novel / unproven",
         "Limited local track record",
         "Proven local track record",
         "OEM references, site visits", Q),
        ("EPC / Construction Risk", "25.00",
         "Untested EPC, > 18 mo build, remote site",
         "Tier-2 EPC, 12–18 mo build, accessible site",
         "Tier-1 EPC, < 12 mo build",
         "EPC track record, contract terms, site logistics", Q),
        ("O&M Capability", "25.00",
         "No O&M plan; new team",
         "Outsourced O&M, standard SLAs",
         "In-house O&M OR OEM long-term service agreement",
         "O&M plan, staffing, LTSA terms", Q),
        ("Site & Interconnection", "25.00",
         "No interconnection study",
         "Preliminary study done",
         "Detailed study complete; capacity confirmed",
         "Interconnection study, letter from TCN/Disco", Q),
    ],
    "C": [
        ("Licensing & Permits", "25.00",
         "Critical permit uncertain or blocked",
         "Pathway identified, 6–12 mo lead time, some precedent",
         "All permits named; precedent exists; ≤ 6 mo lead time",
         "Regulatory opinion; permit schedule", Q),
        ("Land Title & Legal", "25.00",
         "Disputed title; unresolved community claim",
         "Lease with clear terms; minor encumbrance being resolved",
         "Clean C of O or registered lease; no claims; SPV structure clean",
         "Title search, community MOU", Q),
        ("ESG / Investor Alignment", "25.00",
         "Conflicts with key investors' ESG policies",
         "Meets baseline E&S safeguards",
         "Investor-specific ESG (InfraCredit, Anergi) aligned",
         "ESG gap assessment", Q),
        ("Security", "25.00",
         "High-security-risk zone; insurance not available",
         "Moderate risk; insurance available at market rates",
         "Low-risk zone; full insurance at standard rates",
         "Security assessment; insurance quotes", Q),
    ],
    "D": [
        ("Equity IRR", "33.30",
         "< 18% equity IRR",
         "18–22% equity IRR",
         "≥ 25% equity IRR",
         "Financial model, after debt",
         numeric("%", True, [band(5, 25), band(4, 22), band(3, 18), band(2, 15), band(1, 0)])),
        ("Payback Period", "33.30",
         "> 10 yrs",
         "6–10 yrs",
         "≤ 5 yrs",
         "Cumulative cash flow analysis",
         numeric("years", False, [band(5, 5), band(4, 6), band(3, 10), band(2, 12), band(1, 999)])),
        ("EBITDA Margin", "33.40",
         "< 20% EBITDA margin",
         "20–30% EBITDA margin",
         "≥ 30% EBITDA margin",
         "Financial model",
         numeric("%", True, [band(5, 30), band(4, 25), band(3, 20), band(2, 15), band(1, 0)])),
    ],
    "E": [
        ("Equity Availability", "33.30",
         "No equity identified",
         "Equity identified",
         "Equity commitment by DEL",
         "Shareholder commitment letter", Q),
        ("Co-investor Interest", "33.30",
         "No co-investor interest",
         "Preliminary interest from 1 co-investor",
         "Committed co-investor or syndication path with clear path to close",
         "Co-investor MOU / term sheet", Q),
        ("Funding Timeline Alignment", "33.40",
         "Funding needed before realistic close date",
         "Funding achievable within timeline",
         "Funding closes comfortably before project critical-path date",
         "Funding vs project Gantt", Q),
    ],
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

        numeric_count = 0
        for code, name, desc, weight, threshold in PILLARS:
            pillar, _ = Pillar.objects.update_or_create(
                code=code,
                defaults={"name": name, "description": desc,
                          "weight_pct": weight, "pass_threshold": threshold},
            )
            for i, entry in enumerate(SUB_CRITERIA[code]):
                sc_name, sc_weight, b1, b3, b5, method, extra = entry
                defaults = {
                    "weight_in_pillar": sc_weight,
                    "order": i,
                    "band_1_def": b1,
                    "band_3_def": b3,
                    "band_5_def": b5,
                    "method_evidence": method,
                    "input_type": SubCriterion.InputType.QUALITATIVE,
                    "unit": "",
                    "higher_is_better": True,
                    "numeric_bands": [],
                }
                defaults.update(extra)
                if defaults["input_type"] == SubCriterion.InputType.NUMERIC:
                    numeric_count += 1
                SubCriterion.objects.update_or_create(
                    pillar=pillar, name=sc_name, defaults=defaults,
                )
        self.stdout.write(self.style.SUCCESS(
            f"Seeded {len(PILLARS)} pillars and sub-criteria "
            f"({numeric_count} auto-scored from measured figures)."
        ))
