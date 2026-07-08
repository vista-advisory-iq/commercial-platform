"""
Notification producers. Keep the "who gets told what, when" logic here so the
lifecycle service and views just call a named function.

Each producer creates in-app rows now and sends a best-effort email once the
surrounding transaction commits (so a rollback sends nothing). Email must never
break the action that triggered it.
"""
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.db import transaction

from apps.accounts.models import Role
from .models import Notification


def _deal_name(deal):
    return getattr(getattr(deal, "intake", None), "deal_name", "") or "Untitled"


def _display(user):
    return (user.full_name or user.email) if user else "someone"


def _assessors():
    User = get_user_model()
    return list(User.objects.filter(role__in=[Role.ANALYST, Role.MANAGER], is_active=True))


def assessors():
    """Public accessor for the active Analyst/Manager pool (used by other apps)."""
    return _assessors()


def _emit(recipients, deal, kind, message, subject=None):
    """Create one notification per recipient and queue a single digest email."""
    recipients = [u for u in recipients if u]
    if not recipients:
        return []
    rows = Notification.objects.bulk_create([
        Notification(recipient=u, deal=deal, kind=kind, message=message)
        for u in recipients
    ])
    emails = [u.email for u in recipients if u.email]
    if emails:
        ref = deal.deal_ref if deal else "VAP"
        transaction.on_commit(lambda: _safe_email(subject or f"[VAP] {ref}", message, emails))
    return rows


# --- Producers, one per lifecycle event --------------------------------------

def notify_deal_submitted(deal):
    """BD submitted — alert every assessor (no analyst is assigned yet)."""
    msg = f"{deal.deal_ref} ({_deal_name(deal)}) was submitted and is awaiting review."
    return _emit(_assessors(), deal, Notification.Kind.DEAL_SUBMITTED, msg,
                 subject=f"[VAP] Deal {deal.deal_ref} submitted for review")


def notify_deal_taken(deal):
    """An assessor took the deal for review — tell the BD who has it."""
    msg = f"{deal.deal_ref} ({_deal_name(deal)}) is now under review by {_display(deal.assigned_analyst)}."
    return _emit([deal.created_by], deal, Notification.Kind.DEAL_UNDER_REVIEW, msg)


def notify_deal_returned(deal, reason):
    """Deal returned to the BD for changes — include the reason."""
    msg = f"{deal.deal_ref} ({_deal_name(deal)}) was returned for changes: {reason}"
    return _emit([deal.created_by], deal, Notification.Kind.DEAL_RETURNED, msg)


def notify_stage1_decided(deal):
    """Stage 1 outcome recorded — tell the BD the result."""
    decision = deal.stage1_decision
    if decision == "PASSED":
        tail = "passed Stage 1 and advanced to scoring."
    elif decision == "CONDITIONAL":
        tail = "passed Stage 1 with conditions and advanced to scoring."
    else:
        tail = "was declined at Stage 1."
    msg = f"{deal.deal_ref} ({_deal_name(deal)}) {tail}"
    return _emit([deal.created_by], deal, Notification.Kind.STAGE1_DECISION, msg)


def notify_stage2_decided(deal):
    """Management Investment Committee recorded the final decision — tell the BD."""
    labels = {"GO": "GO", "CONDITIONAL": "Conditional GO", "NO_GO": "NO-GO"}
    label = labels.get(deal.stage2_decision, deal.stage2_decision or "decided")
    msg = f"{deal.deal_ref} ({_deal_name(deal)}) — final committee decision: {label}."
    return _emit([deal.created_by], deal, Notification.Kind.STAGE2_DECISION, msg)


def notify_stage2_submitted(deal):
    """
    The analyst submitted completed Stage 2 scoring — alert the Management
    Investment Committee (the managers) that the deal is ready for their vote.
    """
    User = get_user_model()
    recipients = list(User.objects.filter(role__in=[Role.MANAGER, Role.ADMIN], is_active=True))
    msg = (f"{deal.deal_ref} ({_deal_name(deal)}) has completed Stage 2 scoring and is "
           f"awaiting the Management Investment Committee's decision.")
    return _emit(recipients, deal, Notification.Kind.SCORING_READY, msg,
                 subject=f"[VAP] Deal {deal.deal_ref} awaiting committee decision")


def notify_edit_requested(edit_request):
    """BD asked to edit a submitted deal — alert the assessors who can approve."""
    deal = edit_request.deal
    msg = (f"{_display(edit_request.requested_by)} requested edit access to "
           f"{deal.deal_ref} ({_deal_name(deal)}).")
    return _emit(_assessors(), deal, Notification.Kind.EDIT_REQUESTED, msg)


def notify_edit_decided(edit_request):
    """Edit-access request approved or denied — tell the BD who asked."""
    deal = edit_request.deal
    if edit_request.status == "APPROVED":
        tail = "approved — the deal has been reopened for editing."
    else:
        reason = edit_request.decision_reason
        tail = "denied." + (f" Reason: {reason}" if reason else "")
    msg = f"Your edit-access request for {deal.deal_ref} ({_deal_name(deal)}) was {tail}"
    return _emit([edit_request.requested_by], deal, Notification.Kind.EDIT_DECISION, msg)


def notify_proposal(deal, recipients, message):
    """Generic proposal-lifecycle alert (recipients chosen by the caller)."""
    return _emit(recipients, deal, Notification.Kind.PROPOSAL_UPDATE, message)


def notify_project(deal, recipients, message):
    """Generic project-lifecycle alert (recipients chosen by the caller)."""
    return _emit(recipients, deal, Notification.Kind.PROJECT_UPDATE, message)


def notify_comment(deal, recipients, message):
    """A new discussion message on a deal — recipients chosen by the caller."""
    return _emit(recipients, deal, Notification.Kind.DEAL_COMMENT, message)


def _safe_email(subject, body, recipients):
    try:
        send_mail(
            subject, body,
            getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@vap.local"),
            recipients, fail_silently=True,
        )
    except Exception:
        pass
