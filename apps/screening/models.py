"""
Screening reference data — the Stage 1 knockout gates and the Stage 2
pillar / sub-criterion structure (Data Model & Audit Specification, Section 4.5).

IMPORTANT modelling note: pillars are NOT scored directly. Each pillar is made
up of weighted sub-criteria, each graded on the 1/3/5 scale against defined
bands. Sub-criterion grades roll up to the pillar score; the pillar score times
the pillar weight contributes to the weighted total. Hence three levels:
Pillar -> SubCriterion -> (per-deal) sub-criterion grade.

These tables are reference/config: they describe the framework. Per-deal results
live in the deals app.
"""
from django.db import models


class KnockoutGate(models.Model):
    """One of the five Stage 1 knockout gates."""

    number = models.PositiveSmallIntegerField(unique=True)  # 1..5
    name = models.CharField(max_length=128)
    pass_condition = models.TextField()
    required_evidence = models.TextField(blank=True)

    class Meta:
        db_table = "knockout_gates"
        ordering = ["number"]

    def __str__(self):
        return f"Gate {self.number:02d} — {self.name}"


class Pillar(models.Model):
    """A Stage 2 scoring pillar (A–E) with its weight in the overall score."""

    code = models.CharField(max_length=1, primary_key=True)  # A..E
    name = models.CharField(max_length=128)
    description = models.CharField(max_length=255, blank=True)
    # Weight as a percentage of the total (e.g. 25.00). Pillars sum to 100.
    weight_pct = models.DecimalField(max_digits=5, decimal_places=2)
    # Minimum raw points the pillar must reach to pass (framework slides 7–11).
    pass_threshold = models.PositiveSmallIntegerField(null=True, blank=True)

    class Meta:
        db_table = "pillars"
        ordering = ["code"]

    def __str__(self):
        return f"{self.code}. {self.name} ({self.weight_pct}%)"


class SubCriterion(models.Model):
    """
    A weighted sub-criterion within a pillar, graded 1/3/5 against bands.
    The pillar's score is derived from these, not entered directly.
    """

    pillar = models.ForeignKey(
        Pillar, on_delete=models.CASCADE, related_name="sub_criteria"
    )
    name = models.CharField(max_length=128)
    # Weight of this sub-criterion within its pillar (e.g. 20.00, 33.30).
    weight_in_pillar = models.DecimalField(max_digits=5, decimal_places=2)
    band_1_def = models.TextField(blank=True, help_text="Score 1 — Very Poor")
    band_3_def = models.TextField(blank=True, help_text="Score 3 — Moderate")
    band_5_def = models.TextField(blank=True, help_text="Score 5 — Excellent")
    method_evidence = models.TextField(blank=True)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = "sub_criteria"
        ordering = ["pillar__code", "order", "id"]

    def __str__(self):
        return f"{self.pillar_id}: {self.name}"
