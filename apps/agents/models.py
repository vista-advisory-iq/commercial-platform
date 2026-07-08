"""
Sales Agent (finder) registry — the outsourced origination channel.

A Business Developer is DEL staff who owns a deal end-to-end. A Sales Agent is
an external finder: they may originate and register a lead but have no pricing,
structuring, or negotiation authority, and are paid only on conversion. Deals
carry their attribution via DealIntake.sales_agent; the register-first rule is
enforced by requiring the agent to exist (and be active) before a deal can name
them as its source.

Commercial terms that are still pending DEL sign-off (protection window length,
fee bands) live in settings, not here — see FINDER_PROTECTION_DAYS.
"""
import uuid

from django.conf import settings
from django.db import models


class SalesAgent(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        SUSPENDED = "SUSPENDED", "Suspended"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    company = models.CharField(max_length=255, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=32, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)
    # When the finder agreement (non-circumvention etc.) was signed.
    agreement_signed_on = models.DateField(null=True, blank=True)
    # Success fee as % of first-year revenue; null until DEL fixes the bands.
    default_fee_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True,
        related_name="created_sales_agents",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "sales_agents"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name}{f' ({self.company})' if self.company else ''}"
