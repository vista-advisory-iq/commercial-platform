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
    A weighted sub-criterion within a pillar, scored 1–5 against defined bands
    (framework slides 7–11). The pillar's score is derived from these, not
    entered directly.

    Two kinds of sub-criterion:
      * NUMERIC — the analyst enters a measured figure (IRR %, payback yrs,
        EBITDA margin %, contract yrs …) and the score is DERIVED from the
        `numeric_bands` ladder, so it is grounded in real data rather than a
        subjective 1/3/5 pick.
      * QUALITATIVE — the analyst selects the band (1/3/5) that best matches the
        evidence, guided by the descriptive band definitions.
    """

    class InputType(models.TextChoices):
        NUMERIC = "NUMERIC", "Numeric (auto-scored from a figure)"
        QUALITATIVE = "QUALITATIVE", "Qualitative (band selected from evidence)"

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

    # Scoring input configuration.
    input_type = models.CharField(
        max_length=12, choices=InputType.choices, default=InputType.QUALITATIVE
    )
    unit = models.CharField(
        max_length=24, blank=True,
        help_text="Unit shown next to a numeric input, e.g. '%', 'years', 'months'.",
    )
    higher_is_better = models.BooleanField(
        default=True,
        help_text="For numeric sub-criteria: does a larger figure score higher?",
    )
    # Ordered ladder of {"score": n, "threshold": x} for NUMERIC sub-criteria.
    # When higher_is_better, the value earns the score of the highest threshold
    # it meets; otherwise the lowest threshold it stays under. Empty for
    # qualitative sub-criteria.
    numeric_bands = models.JSONField(default=list, blank=True)

    class Meta:
        db_table = "sub_criteria"
        ordering = ["pillar__code", "order", "id"]

    def __str__(self):
        return f"{self.pillar_id}: {self.name}"

    @property
    def is_numeric(self):
        return self.input_type == self.InputType.NUMERIC

    def grade_for_value(self, value):
        """
        Derive the 1–5 grade for a measured `value` using `numeric_bands`.
        Returns 1 if the value clears no threshold. Pure; no side effects.
        """
        if value is None or not self.numeric_bands:
            return None
        try:
            value = float(value)
        except (TypeError, ValueError):
            return None
        bands = [b for b in self.numeric_bands if "threshold" in b and "score" in b]
        if self.higher_is_better:
            for b in sorted(bands, key=lambda b: b["score"], reverse=True):
                if value >= float(b["threshold"]):
                    return int(b["score"])
        else:
            for b in sorted(bands, key=lambda b: b["score"], reverse=True):
                if value <= float(b["threshold"]):
                    return int(b["score"])
        return 1
