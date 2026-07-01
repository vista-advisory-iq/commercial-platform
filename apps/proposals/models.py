"""
Module 2 — Proposal.

Once a deal clears Stage 2 (GO or Conditional GO), the BD turns it into a formal
client-facing proposal: a structured commercial offer with its own lifecycle
(draft → review → sent → accepted/rejected) and an exportable document.

One proposal per deal (OneToOne). Lifecycle changes go through services.py and
are recorded in the append-only ProposalStateHistory, mirroring how deals work.
"""
import uuid
from django.conf import settings
from django.db import models


class ProposalStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    IN_REVIEW = "IN_REVIEW", "In review"
    SENT = "SENT", "Sent to client"
    ACCEPTED = "ACCEPTED", "Accepted"
    REJECTED = "REJECTED", "Rejected"


class Proposal(models.Model):
    """The commercial offer made to the client for an approved deal."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    deal = models.OneToOneField(
        "deals.Deal", on_delete=models.PROTECT, related_name="proposal"
    )
    status = models.CharField(
        max_length=12, choices=ProposalStatus.choices, default=ProposalStatus.DRAFT
    )

    # --- The offer ---
    title = models.CharField(max_length=255, blank=True)
    executive_summary = models.TextField(blank=True)
    scope_of_work = models.TextField(blank=True)
    proposed_tariff_ngn_kwh = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    contract_tenor_years = models.PositiveSmallIntegerField(null=True, blank=True)
    total_contract_value_usd_m = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    payment_terms = models.TextField(blank=True)
    commercial_terms = models.TextField(blank=True)
    assumptions = models.TextField(blank=True)
    validity_until = models.DateField(null=True, blank=True)

    # Outcome (when the client responds).
    decision_reason = models.TextField(blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_proposals"
    )
    version = models.PositiveSmallIntegerField(default=0)  # bumped each time it's sent
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    decided_at = models.DateTimeField(null=True, blank=True)

    # Fields whose edits are mirrored into the deal's audit trail.
    AUDITED_FIELDS = [
        "title", "executive_summary", "scope_of_work", "proposed_tariff_ngn_kwh",
        "contract_tenor_years", "total_contract_value_usd_m", "payment_terms",
        "commercial_terms", "assumptions", "validity_until",
    ]

    class Meta:
        db_table = "proposals"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Proposal for {self.deal_id} ({self.get_status_display()})"

    @property
    def is_editable(self):
        """The offer can be edited only while it's a draft."""
        return self.status == ProposalStatus.DRAFT


class ProposalStateHistory(models.Model):
    """Append-only lifecycle timeline for a proposal (never updated/deleted)."""

    id = models.BigAutoField(primary_key=True)
    proposal = models.ForeignKey(
        Proposal, on_delete=models.PROTECT, related_name="state_history"
    )
    from_status = models.CharField(max_length=12, blank=True)
    to_status = models.CharField(max_length=12)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True
    )
    reason = models.TextField(blank=True)
    occurred_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "proposal_state_history"
        ordering = ["occurred_at", "id"]
        verbose_name_plural = "proposal state history"

    def __str__(self):
        return f"{self.proposal_id}: {self.from_status or '∅'} → {self.to_status}"


class ProposalDocument(models.Model):
    """
    A point-in-time snapshot of the proposal document, captured when it is sent.
    Keeps a versioned record of exactly what the client received.
    """

    id = models.BigAutoField(primary_key=True)
    proposal = models.ForeignKey(
        Proposal, on_delete=models.PROTECT, related_name="documents"
    )
    version = models.PositiveSmallIntegerField()
    content = models.JSONField()  # snapshot of the offer fields at send time
    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True
    )
    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "proposal_documents"
        ordering = ["-version"]
        unique_together = [("proposal", "version")]

    def __str__(self):
        return f"{self.proposal_id} v{self.version}"
