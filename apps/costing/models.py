"""
Module 4 — Cost Modeller.

A simple financial model for a deal: CAPEX and OPEX line items plus financing
assumptions, from which total project cost, payback, NPV and a basic IRR are
derived (see calc.py — outputs are computed, never stored). One model per deal,
maintained by assessors; it informs the proposed tariff and returns.
"""
import uuid
from django.conf import settings
from django.db import models


class CostModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    deal = models.OneToOneField("deals.Deal", on_delete=models.PROTECT, related_name="cost_model")
    currency = models.CharField(max_length=8, default="USD")

    # Inputs feeding the computed returns (all optional until modelled).
    annual_revenue = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    project_life_years = models.PositiveSmallIntegerField(null=True, blank=True)
    debt_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    interest_rate_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    debt_tenor_years = models.PositiveSmallIntegerField(null=True, blank=True)
    discount_rate_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True,
        related_name="created_cost_models",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    ASSUMPTION_FIELDS = [
        "currency", "annual_revenue", "project_life_years", "debt_pct",
        "interest_rate_pct", "debt_tenor_years", "discount_rate_pct", "notes",
    ]

    class Meta:
        db_table = "cost_models"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Cost model for {self.deal_id}"


class CostLine(models.Model):
    class Kind(models.TextChoices):
        CAPEX = "CAPEX", "Capital (one-off)"
        OPEX = "OPEX", "Operating (annual)"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cost_model = models.ForeignKey(CostModel, on_delete=models.CASCADE, related_name="lines")
    kind = models.CharField(max_length=5, choices=Kind.choices)
    category = models.CharField(max_length=128, blank=True)
    description = models.CharField(max_length=255, blank=True)
    amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = "cost_lines"
        ordering = ["kind", "order", "id"]

    def __str__(self):
        return f"{self.cost_model_id}: {self.kind} {self.category} {self.amount}"
