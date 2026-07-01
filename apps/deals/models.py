"""
Core deal records (Data Model & Audit Specification, Sections 3, 4, 6).

The Deal carries its identity, current lifecycle state, ownership, and the
working copy of its current values. Historic values live in the audit app's
append-only tables, not here. State is changed only through the lifecycle
service (services.py), never by writing `state` directly, so every transition
is validated and audited.
"""
import uuid
from django.conf import settings
from django.db import models
from django.utils import timezone


class DealState(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    SUBMITTED = "SUBMITTED", "Submitted"
    UNDER_REVIEW = "UNDER_REVIEW", "Under review"
    REJECTED_TO_BD = "REJECTED_TO_BD", "Rejected to BD"
    STAGE1_PASSED = "STAGE1_PASSED", "Stage 1 passed"
    DECLINED = "DECLINED", "Declined"
    # Stage 2 committee outcomes (terminal).
    STAGE2_GO = "STAGE2_GO", "Stage 2 — GO"
    STAGE2_CONDITIONAL = "STAGE2_CONDITIONAL", "Stage 2 — Conditional GO"
    STAGE2_NO_GO = "STAGE2_NO_GO", "Stage 2 — NO-GO"


class Deal(models.Model):
    """The core deal record."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # Human-readable Deal ID, assigned at draft creation (spec 6.1).
    deal_ref = models.CharField(max_length=32, unique=True, editable=False)
    state = models.CharField(
        max_length=20, choices=DealState.choices, default=DealState.DRAFT
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_deals",
    )
    assigned_analyst = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_deals",
    )
    # Last rejection reason kept for convenience; full set lives in history.
    current_rejection_reason = models.TextField(blank=True)
    stage1_decision = models.CharField(
        max_length=12, blank=True,
        choices=[
            ("PASSED", "Passed"),
            ("CONDITIONAL", "Passed (conditional)"),
            ("DECLINED", "Declined"),
        ],
    )
    # Stage 2 investment-committee decision (the IC's call; the computed verdict
    # is only a recommendation). Set by the decide_stage2 service.
    stage2_decision = models.CharField(
        max_length=12, blank=True,
        choices=[("GO", "GO"), ("CONDITIONAL", "Conditional GO"), ("NO_GO", "NO-GO")],
    )
    stage2_rationale = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "deals"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.deal_ref} ({self.get_state_display()})"

    @property
    def is_editable_by_bd(self):
        """A BD may edit only while the deal is a draft or was sent back."""
        return self.state in {DealState.DRAFT, DealState.REJECTED_TO_BD}


class DealIntake(models.Model):
    """
    Standardised intake fields (framework slide 4 / spec 4.4), captured by the
    BD at origination. One-to-one with the deal.
    """

    deal = models.OneToOneField(
        Deal, on_delete=models.CASCADE, related_name="intake"
    )

    # Project identity
    deal_name = models.CharField(max_length=255)
    deal_type = models.CharField(
        max_length=20, blank=True,
        choices=[("GREENFIELD", "Greenfield"), ("BROWNFIELD", "Brownfield"), ("JV", "JV")],
    )
    sub_sector = models.CharField(max_length=64, blank=True)
    client_name = models.CharField(max_length=255, blank=True)
    counterparty_class = models.CharField(max_length=64, blank=True)
    location = models.CharField(max_length=255, blank=True)
    sponsor = models.CharField(max_length=255, blank=True)
    sponsor_years = models.PositiveSmallIntegerField(null=True, blank=True)
    deal_source = models.CharField(max_length=64, blank=True)

    # Economics
    total_project_cost_usd_m = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    installed_capacity = models.CharField(max_length=64, blank=True)
    proposed_tariff_ngn_kwh = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    tenor_years = models.PositiveSmallIntegerField(null=True, blank=True)
    revenue_2_3yr_pct = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True
    )
    capital_structure = models.CharField(max_length=64, blank=True)
    ebitda_usd_m = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    leverage_usd_m = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    cash_position_usd_m = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )

    # The set of fields the audit layer watches for changes.
    AUDITED_FIELDS = [
        "deal_name", "deal_type", "sub_sector", "client_name",
        "counterparty_class", "location", "sponsor", "sponsor_years",
        "deal_source", "total_project_cost_usd_m", "installed_capacity",
        "proposed_tariff_ngn_kwh", "tenor_years", "revenue_2_3yr_pct",
        "capital_structure", "ebitda_usd_m", "leverage_usd_m",
        "cash_position_usd_m",
    ]

    class Meta:
        db_table = "deal_intake"

    def __str__(self):
        return f"Intake for {self.deal_id}"


class DealComment(models.Model):
    """
    A message on a deal's discussion thread — lets an analyst ask the BD a
    question (or the BD clarify) without leaving the deal. Append-only.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    deal = models.ForeignKey(Deal, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="deal_comments"
    )
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "deal_comments"
        ordering = ["created_at", "id"]

    def __str__(self):
        return f"{self.deal_id}: {self.author_id} @ {self.created_at:%Y-%m-%d}"


class DealGateResult(models.Model):
    """An analyst's verdict on one knockout gate for one deal (spec 4.5)."""

    class Verdict(models.TextChoices):
        PASS = "PASS", "Pass"
        CONDITIONAL = "CONDITIONAL", "Conditional"
        FAIL = "FAIL", "Fail"

    deal = models.ForeignKey(
        Deal, on_delete=models.CASCADE, related_name="gate_results"
    )
    gate = models.ForeignKey("screening.KnockoutGate", on_delete=models.PROTECT)
    verdict = models.CharField(max_length=12, choices=Verdict.choices)
    evidence_notes = models.TextField(blank=True)
    assessed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "deal_gate_results"
        unique_together = [("deal", "gate")]
        ordering = ["gate__number"]

    def __str__(self):
        return f"{self.deal_id} · {self.gate} · {self.verdict}"


class DealPillarComment(models.Model):
    """
    Free-text rationale recorded after a pillar's scoring — one per pillar,
    per deal. This is the per-pillar comment requirement.
    """

    deal = models.ForeignKey(
        Deal, on_delete=models.CASCADE, related_name="pillar_comments"
    )
    pillar = models.ForeignKey("screening.Pillar", on_delete=models.PROTECT)
    comment = models.TextField(blank=True)
    authored_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "deal_pillar_comments"
        unique_together = [("deal", "pillar")]
        ordering = ["pillar__code"]

    def __str__(self):
        return f"{self.deal_id} · Pillar {self.pillar_id} comment"


class DealSubCriterionScore(models.Model):
    """
    An analyst's grade (1/3/5) for one sub-criterion of one deal (spec 4.6,
    Stage 2). Pillar scores derive from these — pillars are never graded
    directly (see CLAUDE.md convention 7).
    """

    class Grade(models.IntegerChoices):
        VERY_POOR = 1, "1 — Very Poor"
        MODERATE = 3, "3 — Moderate"
        EXCELLENT = 5, "5 — Excellent"

    deal = models.ForeignKey(
        Deal, on_delete=models.CASCADE, related_name="sub_scores"
    )
    sub_criterion = models.ForeignKey("screening.SubCriterion", on_delete=models.PROTECT)
    grade = models.PositiveSmallIntegerField(choices=Grade.choices)
    notes = models.TextField(blank=True)
    scored_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "deal_sub_criterion_scores"
        unique_together = [("deal", "sub_criterion")]
        ordering = ["sub_criterion__pillar__code", "sub_criterion__order"]

    def __str__(self):
        return f"{self.deal_id} · {self.sub_criterion_id} = {self.grade}"


class EditAccessRequest(models.Model):
    """
    A BD's request to edit a deal they've already submitted (spec 6.2).
    Either an Analyst or a Manager may approve.
    """

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        APPROVED = "APPROVED", "Approved"
        DENIED = "DENIED", "Denied"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    deal = models.ForeignKey(
        Deal, on_delete=models.CASCADE, related_name="edit_access_requests"
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="edit_requests",
    )
    justification = models.TextField()
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING
    )
    decided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="edit_decisions",
    )
    decision_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    decided_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "edit_access_requests"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Edit request {self.id} · {self.status}"

    def mark_decided(self, status, decided_by, reason=""):
        self.status = status
        self.decided_by = decided_by
        self.decision_reason = reason
        self.decided_at = timezone.now()
        self.save(update_fields=["status", "decided_by", "decision_reason", "decided_at"])
