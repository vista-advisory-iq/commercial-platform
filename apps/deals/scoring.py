"""
Stage 2 pillar scoring engine (Data Model & Audit Specification, Section 4.6).

Sub-criterion grades (1/3/5) roll up to a pillar score, and the weighted pillar
scores roll up to an overall weighted total on a 0–100 scale. Pillars are never
graded directly (CLAUDE.md convention 7).

The final GO / CONDITIONAL / NO-GO bands are an open item pending DEL sign-off
(two framework slides disagree: 80/65 vs 75/60), so they are NOT hardcoded here:
the engine always computes the numbers, and only emits a verdict when
settings.STAGE2_SCORE_BANDS is configured. Per-pillar pass/fail uses the
pass_threshold that IS seeded.
"""
from decimal import Decimal

from django.conf import settings
from django.core.exceptions import PermissionDenied
from django.db import transaction

from apps.audit.services import record_field_changes
from apps.notifications import services as notifications
from apps.screening.models import Pillar, SubCriterion
from .models import DealState, DealSubCriterionScore, DealPillarComment
from .services import TransitionError

VALID_GRADES = {1, 3, 5}


def compute_scores(deal):
    """
    Compute the full Stage 2 score breakdown for a deal. Pure (no writes).

    Returns a dict: per-pillar raw/max/percent/pass plus sub-criterion grades,
    the overall weighted total (0–100), and a verdict (or None if bands unset).
    """
    pillars = Pillar.objects.prefetch_related("sub_criteria").all()
    grades = {s.sub_criterion_id: s for s in deal.sub_scores.all()}
    comments = {c.pillar_id: c.comment for c in deal.pillar_comments.all()}

    pillar_results = []
    weighted_total = Decimal("0")
    weight_sum = Decimal("0")
    all_complete = True

    for p in pillars:
        subs = list(p.sub_criteria.all())
        sub_list = []
        raw = 0
        graded = 0
        for sc in subs:
            g = grades.get(sc.id)
            grade = g.grade if g else None
            if grade is not None:
                raw += grade
                graded += 1
            sub_list.append({
                "id": sc.id,
                "name": sc.name,
                "weight_in_pillar": str(sc.weight_in_pillar),
                "grade": grade,
                "notes": g.notes if g else "",
                "band_1_def": sc.band_1_def,
                "band_3_def": sc.band_3_def,
                "band_5_def": sc.band_5_def,
            })

        count = len(subs)
        max_raw = count * 5
        complete = count > 0 and graded == count
        if not complete:
            all_complete = False
        pct = (Decimal(raw) / Decimal(max_raw) * 100) if max_raw else Decimal("0")
        passes = None
        if complete and p.pass_threshold is not None:
            passes = raw >= p.pass_threshold

        pillar_results.append({
            "code": p.code,
            "name": p.name,
            "description": p.description,
            "weight_pct": str(p.weight_pct),
            "pass_threshold": p.pass_threshold,
            "raw": raw,
            "max": max_raw,
            "pct": round(float(pct), 1),
            "complete": complete,
            "passes": passes,
            "comment": comments.get(p.code, ""),
            "sub_criteria": sub_list,
        })

        weighted_total += pct * p.weight_pct / Decimal("100")
        weight_sum += p.weight_pct

    verdict, bands = _verdict(weighted_total, all_complete)
    return {
        "pillars": pillar_results,
        "weighted_total": round(float(weighted_total), 1),
        "weight_sum": str(weight_sum),
        "complete": all_complete,
        "verdict": verdict,
        "bands": bands,
    }


def _verdict(weighted_total, complete):
    """Map the weighted total to GO/CONDITIONAL/NO-GO, if bands are configured."""
    bands = getattr(settings, "STAGE2_SCORE_BANDS", None)
    if not bands or not complete:
        return None, bands  # thresholds pending DEL sign-off, or scoring incomplete
    wt = float(weighted_total)
    go = bands.get("GO")
    cond = bands.get("CONDITIONAL")
    if go is not None and wt >= go:
        return "GO", bands
    if cond is not None and wt >= cond:
        return "CONDITIONAL", bands
    return "NO_GO", bands


@transaction.atomic
def save_scores(deal, actor, grades, comments=None):
    """
    Upsert sub-criterion grades and pillar comments for a deal. Each changed
    grade leaves an append-only field-history row. Assessor-only, and only once
    the deal has passed Stage 1.
    """
    if not actor.can_assess_deals:
        raise PermissionDenied("Only an Analyst or Manager may score deals.")
    if deal.state != DealState.STAGE1_PASSED:
        raise TransitionError("Scoring is available only after Stage 1 has passed.")

    changes = {}
    for item in grades:
        grade = item["grade"]
        if grade not in VALID_GRADES:
            raise TransitionError(f"Grade must be 1, 3, or 5 (got {grade!r}).")
        sc = SubCriterion.objects.get(id=item["sub_criterion"])
        existing = DealSubCriterionScore.objects.filter(deal=deal, sub_criterion=sc).first()
        old = existing.grade if existing else None
        DealSubCriterionScore.objects.update_or_create(
            deal=deal, sub_criterion=sc,
            defaults={"grade": grade, "notes": (item.get("notes") or "").strip(), "scored_by": actor},
        )
        if old != grade:
            changes[f"subscore_{sc.id}"] = (old, grade)

    for c in (comments or []):
        pillar = Pillar.objects.get(code=c["pillar"])
        DealPillarComment.objects.update_or_create(
            deal=deal, pillar=pillar,
            defaults={"comment": (c.get("comment") or "").strip(), "authored_by": actor},
        )

    if changes:
        record_field_changes(deal, "sub_score", changes, actor=actor)

    # Once every sub-criterion is graded, let the committee know it's ready.
    if compute_scores(deal)["complete"]:
        notifications.notify_scoring_ready(deal)
    return deal
