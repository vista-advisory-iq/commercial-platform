"""
Signal handlers for deals.

Two jobs:
  1. Assign the human-readable deal_ref the moment a Deal row is created
     (spec 6.1 — identity at draft creation).
  2. Capture field-level changes on intake records into the append-only
     DealFieldHistory (spec Section 7).
"""
from django.db import transaction
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.utils import timezone

from apps.audit.services import record_field_changes, diff_fields
from .models import Deal, DealIntake


def _next_deal_ref():
    """
    Build a readable reference like 'DEAL-2026-0007'. Simple, monotonic per
    year; good enough for the pilot and easy to read in conversation.
    """
    year = timezone.now().year
    prefix = f"DEAL-{year}-"
    last = (
        Deal.objects.filter(deal_ref__startswith=prefix)
        .order_by("-deal_ref")
        .values_list("deal_ref", flat=True)
        .first()
    )
    seq = int(last.split("-")[-1]) + 1 if last else 1
    return f"{prefix}{seq:04d}"


@receiver(pre_save, sender=Deal)
def assign_deal_ref(sender, instance, **kwargs):
    if not instance.deal_ref:
        instance.deal_ref = _next_deal_ref()


# --- Intake field auditing ---------------------------------------------------
# We stash the pre-save snapshot, then diff it post-save so only real changes
# are recorded, each as an append-only history row.

@receiver(pre_save, sender=DealIntake)
def _snapshot_intake(sender, instance, **kwargs):
    if instance.pk:
        try:
            instance._pre_save_state = DealIntake.objects.get(pk=instance.pk)
        except DealIntake.DoesNotExist:
            instance._pre_save_state = None
    else:
        instance._pre_save_state = None


@receiver(post_save, sender=DealIntake)
def _audit_intake_changes(sender, instance, created, **kwargs):
    old = getattr(instance, "_pre_save_state", None)
    changes = diff_fields(old, instance, DealIntake.AUDITED_FIELDS)
    if changes:
        # Defer until the surrounding transaction commits, so we never log a
        # change that gets rolled back.
        transaction.on_commit(
            lambda: record_field_changes(instance.deal, "intake", changes)
        )
