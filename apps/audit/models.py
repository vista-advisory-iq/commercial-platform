"""
Change Data Capture — two complementary, append-only audit layers
(Data Model & Audit Specification, Section 7).

  * DealStateHistory  — every lifecycle transition (the readable timeline).
  * DealFieldHistory   — every field-level value change (the forensic detail).

Both are insert-only by policy. Nothing in the application updates or deletes
these rows; that is what makes the full history of a deal trustworthy. The
models deliberately omit any update/delete helpers, and the admin registration
(audit/admin.py) makes them read-only in the back office.
"""
import uuid
from django.conf import settings
from django.db import models


class DealStateHistory(models.Model):
    """One row per lifecycle transition of a deal."""

    id = models.BigAutoField(primary_key=True)
    deal = models.ForeignKey(
        "deals.Deal", on_delete=models.PROTECT, related_name="state_history"
    )
    from_state = models.CharField(max_length=32, blank=True)
    to_state = models.CharField(max_length=32)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True
    )
    # Required for rejections; optional for other transitions.
    reason = models.TextField(blank=True)
    occurred_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "deal_state_history"
        ordering = ["occurred_at", "id"]
        verbose_name = "deal state history entry"
        verbose_name_plural = "deal state history"

    def __str__(self):
        arrow = f"{self.from_state or '∅'} → {self.to_state}"
        return f"{self.deal_id}: {arrow}"


class DealFieldHistory(models.Model):
    """One row per individual field change on a deal or its child records."""

    id = models.BigAutoField(primary_key=True)
    deal = models.ForeignKey(
        "deals.Deal", on_delete=models.PROTECT, related_name="field_history"
    )
    # Which logical section changed: 'intake', 'gate_result', 'pillar_comment', etc.
    entity = models.CharField(max_length=64)
    field_name = models.CharField(max_length=128)
    old_value = models.TextField(blank=True, null=True)
    new_value = models.TextField(blank=True, null=True)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True
    )
    occurred_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "deal_field_history"
        ordering = ["occurred_at", "id"]
        verbose_name = "deal field history entry"
        verbose_name_plural = "deal field history"

    def __str__(self):
        return f"{self.deal_id}: {self.entity}.{self.field_name}"
