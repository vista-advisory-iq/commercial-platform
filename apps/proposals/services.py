"""
Proposal lifecycle service.

Like the deal lifecycle, every status change goes through here: the transition
is validated, the rule enforced, the change written, and an append-only
ProposalStateHistory row recorded. Offer-field edits are mirrored into the
deal's audit trail so the whole commercial record stays in one timeline.
"""
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.utils import timezone

from apps.audit.services import record_field_changes, diff_fields
from apps.notifications import services as notifications
from apps.deals.models import DealState
from .models import Proposal, ProposalStatus, ProposalStateHistory, ProposalDocument

ALLOWED_TRANSITIONS = {
    ProposalStatus.DRAFT: {ProposalStatus.IN_REVIEW},
    ProposalStatus.IN_REVIEW: {ProposalStatus.DRAFT, ProposalStatus.SENT},
    ProposalStatus.SENT: {ProposalStatus.ACCEPTED, ProposalStatus.REJECTED},
    ProposalStatus.ACCEPTED: set(),
    ProposalStatus.REJECTED: set(),
}

# A proposal may only be created once a deal has cleared Stage 2.
ELIGIBLE_DEAL_STATES = {DealState.STAGE2_GO, DealState.STAGE2_CONDITIONAL}


class ProposalError(ValidationError):
    """Raised when a proposal action is not allowed."""


def _guard(proposal, to_status):
    if to_status not in ALLOWED_TRANSITIONS.get(proposal.status, set()):
        raise ProposalError(f"Cannot move a proposal from {proposal.status} to {to_status}.")


def _record_state(proposal, previous, actor, reason=""):
    ProposalStateHistory.objects.create(
        proposal=proposal, from_status=previous or "", to_status=proposal.status,
        actor=actor, reason=reason or "",
    )


def _is_owner(proposal, actor):
    # BDs are a shared team — any BD may manage a deal's proposal.
    return actor.is_business_developer


@transaction.atomic
def create_proposal(deal, actor):
    """A BD opens a proposal for a Stage 2-approved deal."""
    if not actor.is_business_developer:
        raise PermissionDenied("Only a Business Developer may create the proposal.")
    if deal.state not in ELIGIBLE_DEAL_STATES:
        raise ProposalError("A proposal can only be created once the deal has a Stage 2 GO.")
    if Proposal.objects.filter(deal=deal).exists():
        raise ProposalError("This deal already has a proposal.")
    name = getattr(getattr(deal, "intake", None), "deal_name", "") or deal.deal_ref
    proposal = Proposal.objects.create(
        deal=deal, created_by=actor, title=f"Proposal — {name}",
    )
    _record_state(proposal, "", actor)
    return proposal


@transaction.atomic
def update_offer(proposal, actor, validated_data):
    """Edit the offer fields. Owner-only, draft-only; edits are audited."""
    if not _is_owner(proposal, actor):
        raise PermissionDenied("Only a Business Developer may edit this proposal.")
    if not proposal.is_editable:
        raise ProposalError("The proposal can only be edited while it is a draft.")

    before = Proposal.objects.get(pk=proposal.pk)
    for field, value in validated_data.items():
        setattr(proposal, field, value)
    proposal.save()
    changes = diff_fields(before, proposal, Proposal.AUDITED_FIELDS)
    if changes:
        record_field_changes(proposal.deal, "proposal", changes, actor=actor)
    return proposal


@transaction.atomic
def submit_for_review(proposal, actor):
    if not _is_owner(proposal, actor):
        raise PermissionDenied("Only a Business Developer may submit this proposal.")
    _guard(proposal, ProposalStatus.IN_REVIEW)
    previous = proposal.status
    proposal.status = ProposalStatus.IN_REVIEW
    proposal.save(update_fields=["status", "updated_at"])
    _record_state(proposal, previous, actor)
    name = proposal.title or proposal.deal.deal_ref
    notifications.notify_proposal(
        proposal.deal, notifications.assessors(),
        f"Proposal for {proposal.deal.deal_ref} ({name}) was submitted for review.",
    )
    return proposal


@transaction.atomic
def return_to_draft(proposal, actor, reason):
    if not actor.can_assess_deals:
        raise PermissionDenied("Only an Analyst or Manager may review proposals.")
    if not reason or not reason.strip():
        raise ProposalError("A reason is required when returning a proposal.")
    _guard(proposal, ProposalStatus.DRAFT)
    previous = proposal.status
    proposal.status = ProposalStatus.DRAFT
    proposal.save(update_fields=["status", "updated_at"])
    _record_state(proposal, previous, actor, reason=reason.strip())
    notifications.notify_proposal(
        proposal.deal, [proposal.created_by],
        f"Proposal for {proposal.deal.deal_ref} was returned for changes: {reason.strip()}",
    )
    return proposal


@transaction.atomic
def send_to_client(proposal, actor):
    """Approve and send. Snapshots a versioned document of what went out."""
    if not actor.can_assess_deals:
        raise PermissionDenied("Only an Analyst or Manager may send proposals.")
    _guard(proposal, ProposalStatus.SENT)
    previous = proposal.status
    proposal.status = ProposalStatus.SENT
    proposal.sent_at = timezone.now()
    proposal.version = (proposal.version or 0) + 1
    proposal.save(update_fields=["status", "sent_at", "version", "updated_at"])
    ProposalDocument.objects.create(
        proposal=proposal, version=proposal.version,
        content=_snapshot(proposal), generated_by=actor,
    )
    _record_state(proposal, previous, actor, reason=f"Sent to client (v{proposal.version}).")
    notifications.notify_proposal(
        proposal.deal, [proposal.created_by],
        f"Proposal for {proposal.deal.deal_ref} was sent to the client (v{proposal.version}).",
    )
    return proposal


@transaction.atomic
def record_outcome(proposal, actor, accepted, reason=""):
    """Record the client's response. BD owner or an assessor may enter it."""
    if not (_is_owner(proposal, actor) or actor.can_assess_deals):
        raise PermissionDenied("You may not record the outcome for this proposal.")
    to_status = ProposalStatus.ACCEPTED if accepted else ProposalStatus.REJECTED
    _guard(proposal, to_status)
    previous = proposal.status
    proposal.status = to_status
    proposal.decision_reason = (reason or "").strip()
    proposal.decided_at = timezone.now()
    proposal.save(update_fields=["status", "decision_reason", "decided_at", "updated_at"])
    _record_state(proposal, previous, actor, reason=proposal.decision_reason)
    verb = "accepted" if accepted else "rejected"
    notifications.notify_proposal(
        proposal.deal, [proposal.created_by],
        f"Proposal for {proposal.deal.deal_ref} was {verb} by the client.",
    )
    if accepted:
        # An accepted proposal kicks off delivery: open the project tracker.
        # Imported here to avoid a module-load cycle (projects has no dep on proposals).
        from apps.projects.services import create_project
        create_project(proposal.deal, actor=actor, proposal=proposal)
    return proposal


def _snapshot(proposal):
    """Plain-data capture of the offer for the versioned document record."""
    data = {f: getattr(proposal, f) for f in Proposal.AUDITED_FIELDS}
    # JSON-safe: stringify Decimals / dates.
    for k, v in list(data.items()):
        if v is not None and not isinstance(v, (str, int, float, bool)):
            data[k] = str(v)
    data["deal_ref"] = proposal.deal.deal_ref
    data["status"] = proposal.status
    data["version"] = proposal.version
    return data
