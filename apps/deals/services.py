"""
Deal lifecycle service (Data Model & Audit Specification, Section 3).

All state changes go through this module. Routes and the admin never set
`deal.state` directly — they call these functions, which:
  1. validate the transition is allowed from the current state,
  2. enforce the rules (e.g. a rejection reason is mandatory),
  3. write the change, and
  4. record an append-only state-history row.

Keeping transitions in one guarded place is what makes the lifecycle
trustworthy and the audit complete.
"""
from django.conf import settings
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.utils import timezone

from apps.audit.services import record_state_change, record_field_changes
from apps.notifications import services as notifications
from apps.screening.models import KnockoutGate
from .models import (
    Deal, DealState, DealGateResult, DealSubCriterionScore, DealPillarComment,
)

# Allowed transitions: current state -> set of permitted next states.
ALLOWED_TRANSITIONS = {
    DealState.DRAFT: {DealState.SUBMITTED},
    DealState.SUBMITTED: {DealState.UNDER_REVIEW},
    DealState.UNDER_REVIEW: {
        DealState.REJECTED_TO_BD,
        DealState.STAGE1_PASSED,
        DealState.DECLINED,
    },
    DealState.REJECTED_TO_BD: {DealState.SUBMITTED},
    DealState.STAGE1_PASSED: {
        DealState.STAGE2_GO,
        DealState.STAGE2_CONDITIONAL,
        DealState.STAGE2_NO_GO,
        DealState.DECLINED,  # re-assessing Stage 1 gates can knock the deal out
    },
    DealState.DECLINED: set(),            # terminal
    DealState.STAGE2_GO: set(),           # terminal
    DealState.STAGE2_CONDITIONAL: set(),  # terminal
    DealState.STAGE2_NO_GO: set(),        # terminal
}

# Stage 2 IC decision -> resulting terminal state.
_STAGE2_STATE = {
    "GO": DealState.STAGE2_GO,
    "CONDITIONAL": DealState.STAGE2_CONDITIONAL,
    "NO_GO": DealState.STAGE2_NO_GO,
}
_STAGE2_LABEL = {"GO": "GO", "CONDITIONAL": "Conditional GO", "NO_GO": "NO-GO"}


class TransitionError(ValidationError):
    """Raised when a requested state transition is not allowed."""


# Intake fields a BD must complete before a deal can be submitted for review.
REQUIRED_INTAKE_FOR_SUBMIT = {
    "deal_name": "Deal name",
    "deal_type": "Deal type",
    "client_name": "Client name",
    "location": "Location",
    "total_project_cost_usd_m": "Total project cost (USD m)",
    "proposed_tariff_ngn_kwh": "Proposed tariff (NGN/kWh)",
    "tenor_years": "Tenor (years)",
}


def _validate_submittable(deal):
    """A deal must have its core intake fields populated before submission."""
    intake = getattr(deal, "intake", None)
    missing = []
    for field, label in REQUIRED_INTAKE_FOR_SUBMIT.items():
        value = getattr(intake, field, None) if intake else None
        if value is None or (isinstance(value, str) and not value.strip()):
            missing.append(label)
    if missing:
        raise TransitionError(
            "Complete these required fields before submitting: " + ", ".join(missing) + "."
        )


def _guard(deal, to_state):
    allowed = ALLOWED_TRANSITIONS.get(deal.state, set())
    if to_state not in allowed:
        raise TransitionError(
            f"Cannot move a deal from {deal.state} to {to_state}."
        )


@transaction.atomic
def submit_deal(deal, actor):
    """BD submits a draft (or a rejected deal) for assessment."""
    if not actor.is_business_developer:
        raise PermissionDenied("Only a Business Developer may submit a deal.")
    _validate_submittable(deal)
    _guard(deal, DealState.SUBMITTED)
    previous = deal.state
    deal.state = DealState.SUBMITTED
    deal.submitted_at = timezone.now()
    deal.current_rejection_reason = ""
    deal.save(update_fields=["state", "submitted_at", "current_rejection_reason", "updated_at"])
    record_state_change(deal, previous, deal.state, actor=actor)
    # Alert assessors there's a new deal in the queue (in-app + best-effort email).
    notifications.notify_deal_submitted(deal)
    return deal


@transaction.atomic
def take_for_review(deal, actor):
    """An analyst (or manager) takes a submitted deal to assess it."""
    if not actor.can_assess_deals:
        raise PermissionDenied("Only an Analyst or Manager may review deals.")
    _guard(deal, DealState.UNDER_REVIEW)
    previous = deal.state
    deal.state = DealState.UNDER_REVIEW
    deal.assigned_analyst = actor
    deal.save(update_fields=["state", "assigned_analyst", "updated_at"])
    record_state_change(deal, previous, deal.state, actor=actor)
    notifications.notify_deal_taken(deal)
    return deal


@transaction.atomic
def reject_to_bd(deal, actor, reason):
    """
    Analyst returns the deal to the BD. A reason is mandatory — the transition
    cannot be recorded without one (spec Section 3.2).
    """
    if not actor.can_assess_deals:
        raise PermissionDenied("Only an Analyst or Manager may reject deals.")
    if not reason or not reason.strip():
        raise TransitionError("A rejection reason is required.")
    _guard(deal, DealState.REJECTED_TO_BD)
    previous = deal.state
    deal.state = DealState.REJECTED_TO_BD
    deal.current_rejection_reason = reason.strip()
    deal.save(update_fields=["state", "current_rejection_reason", "updated_at"])
    record_state_change(deal, previous, deal.state, reason=reason.strip(), actor=actor)
    notifications.notify_deal_returned(deal, reason.strip())
    return deal


_VALID_VERDICTS = {
    DealGateResult.Verdict.PASS,
    DealGateResult.Verdict.CONDITIONAL,
    DealGateResult.Verdict.FAIL,
}


@transaction.atomic
def save_gate_results(deal, actor, results):
    """
    Record (upsert) the analyst's verdict on one or more knockout gates.

    `results` is an iterable of dicts: {"gate": <gate number>, "verdict":
    "PASS|CONDITIONAL|FAIL", "evidence_notes": "..."}. Each changed verdict
    leaves an append-only field-history row so the assessment is auditable.

    Only an assessor may do this, and only while the deal is UNDER_REVIEW.
    """
    if not actor.can_assess_deals:
        raise PermissionDenied("Only an Analyst or Manager may assess gates.")
    # Gates stay editable through Stage 1 review and after passing (during Stage 2),
    # so a re-assessment can revise the knockout outcome.
    if deal.state not in (DealState.UNDER_REVIEW, DealState.STAGE1_PASSED):
        raise TransitionError("Gates can only be assessed during review or Stage 1.")

    changes = {}
    for item in results:
        gate = KnockoutGate.objects.get(number=item["gate"])
        verdict = item["verdict"]
        if verdict not in _VALID_VERDICTS:
            raise TransitionError(f"Invalid verdict {verdict!r} for gate {gate.number}.")
        notes = (item.get("evidence_notes") or "").strip()
        existing = DealGateResult.objects.filter(deal=deal, gate=gate).first()
        old_verdict = existing.verdict if existing else None
        DealGateResult.objects.update_or_create(
            deal=deal, gate=gate,
            defaults={"verdict": verdict, "evidence_notes": notes, "assessed_by": actor},
        )
        if old_verdict != verdict:
            changes[f"gate_{gate.number}"] = (old_verdict, verdict)

    if changes:
        record_field_changes(deal, "gate_result", changes, actor=actor)
    return deal


def derive_stage1_outcome(deal):
    """
    Compute the Stage 1 outcome from the deal's recorded gate verdicts.

    Returns (to_state, decision, reason). Rules:
      * every gate must have a verdict first (else TransitionError);
      * any FAIL  -> DECLINED (knockout);
      * any CONDITIONAL (no FAIL) -> handled per settings.STAGE1_CONDITIONAL_POLICY;
      * all PASS  -> STAGE1_PASSED / PASSED.

    Pure (no writes), so views can also use it to preview the outcome.
    """
    gates = list(KnockoutGate.objects.all())
    results = {r.gate_id: r for r in deal.gate_results.select_related("gate")}

    missing = [g for g in gates if g.id not in results]
    if missing:
        names = ", ".join(f"Gate {g.number}" for g in sorted(missing, key=lambda g: g.number))
        raise TransitionError(f"All gates must be assessed first. Missing: {names}.")

    verdicts = {g: results[g.id].verdict for g in gates}
    failed = [g for g, v in verdicts.items() if v == DealGateResult.Verdict.FAIL]
    conditional = [g for g, v in verdicts.items() if v == DealGateResult.Verdict.CONDITIONAL]

    def _names(gs):
        return ", ".join(f"Gate {g.number} ({g.name})" for g in sorted(gs, key=lambda g: g.number))

    if failed:
        return DealState.DECLINED, "DECLINED", f"Knockout failed: {_names(failed)}."

    if conditional:
        policy = getattr(settings, "STAGE1_CONDITIONAL_POLICY", "ADVANCE_CAPPED")
        if policy == "BLOCK":
            raise TransitionError(
                f"Conditional verdicts must be resolved before advancing: {_names(conditional)}."
            )
        if policy == "PASS":
            return DealState.STAGE1_PASSED, "PASSED", "All gates cleared (conditionals treated as pass)."
        # ADVANCE_CAPPED (default): advance but flag the deal conditional.
        return DealState.STAGE1_PASSED, "CONDITIONAL", f"Advanced to Stage 2 with conditions on: {_names(conditional)}."

    return DealState.STAGE1_PASSED, "PASSED", "All knockout gates passed."


@transaction.atomic
def finalize_stage1(deal, actor):
    """
    Derive and commit the Stage 1 decision from the recorded gate verdicts.

    Can be run on first review (from UNDER_REVIEW) or as a re-assessment after
    the deal has already passed (from STAGE1_PASSED). On a re-assessment:
      * still passing (PASS/CONDITIONAL) just updates the flag, no state move;
      * a knockout (DECLINED) moves the deal to DECLINED and CLEARS the Stage 2
        scores, since a declined deal can't carry a Stage 2 assessment.
    """
    if not actor.can_assess_deals:
        raise PermissionDenied("Only an Analyst or Manager may record a Stage 1 decision.")
    to_state, decision, reason = derive_stage1_outcome(deal)
    previous = deal.state

    # Re-assessment that still passes: update the decision flag in place.
    if previous == DealState.STAGE1_PASSED and to_state == DealState.STAGE1_PASSED:
        deal.stage1_decision = decision
        deal.save(update_fields=["stage1_decision", "updated_at"])
        record_state_change(deal, previous, deal.state, reason=f"Stage 1 re-assessed: {reason}", actor=actor)
        notifications.notify_stage1_decided(deal)
        return deal

    _guard(deal, to_state)
    cleared = False
    if previous == DealState.STAGE1_PASSED and to_state == DealState.DECLINED:
        # The knockout now fails after Stage 2 had begun — discard Stage 2 work.
        DealSubCriterionScore.objects.filter(deal=deal).delete()
        DealPillarComment.objects.filter(deal=deal).delete()
        cleared = True

    deal.state = to_state
    deal.stage1_decision = decision
    deal.save(update_fields=["state", "stage1_decision", "updated_at"])
    if cleared:
        reason += " Stage 2 scores were cleared."
    record_state_change(deal, previous, deal.state, reason=reason, actor=actor)
    notifications.notify_stage1_decided(deal)
    return deal


@transaction.atomic
def decide_stage2(deal, actor, decision, rationale=""):
    """
    Record the Investment Committee's final Stage 2 decision and move the deal
    to its terminal state. The computed weighted-total verdict is a
    *recommendation*; the IC may accept or override it, so the decision is an
    explicit input rather than derived. Requires complete scoring.
    """
    # Imported here to avoid a circular import (scoring imports from services).
    from . import scoring

    if not actor.can_decide_stage2:
        raise PermissionDenied("Only an IC member may record the Stage 2 decision.")
    if decision not in _STAGE2_STATE:
        raise TransitionError(f"Invalid Stage 2 decision {decision!r}.")

    result = scoring.compute_scores(deal)
    if not result["complete"]:
        raise TransitionError("Scoring must be complete before the committee can decide.")

    to_state = _STAGE2_STATE[decision]
    _guard(deal, to_state)
    previous = deal.state
    deal.state = to_state
    deal.stage2_decision = decision
    deal.stage2_rationale = (rationale or "").strip()
    deal.save(update_fields=["state", "stage2_decision", "stage2_rationale", "updated_at"])

    recommended = result["verdict"]
    note = (
        f"IC decision: {_STAGE2_LABEL[decision]} "
        f"(score {result['weighted_total']}, recommendation {_STAGE2_LABEL.get(recommended, 'n/a')})."
    )
    if deal.stage2_rationale:
        note += f" Rationale: {deal.stage2_rationale}"
    record_state_change(deal, previous, deal.state, reason=note, actor=actor)
    notifications.notify_stage2_decided(deal)
    return deal


@transaction.atomic
def reopen_for_edit(deal, actor):
    """
    Approving an edit-access request returns edit rights to the BD by moving
    the deal back to REJECTED_TO_BD (its editable, BD-owned state), with a
    neutral reason recorded so the timeline explains why it reopened.
    """
    previous = deal.state
    deal.state = DealState.REJECTED_TO_BD
    deal.current_rejection_reason = "Reopened for edit at BD request (approved)."
    deal.save(update_fields=["state", "current_rejection_reason", "updated_at"])
    record_state_change(
        deal, previous, deal.state,
        reason="Edit access approved; deal reopened to BD.", actor=actor,
    )
    return deal
