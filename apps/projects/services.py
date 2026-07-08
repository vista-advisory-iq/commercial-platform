"""
Project lifecycle service. The project's status moves through a guarded state
machine; every change is validated and recorded in the append-only
ProjectStateHistory. Only assessors (Analyst/Manager) drive delivery.
"""
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.utils import timezone

from apps.notifications import services as notifications
from .models import Project, ProjectStatus, ProjectStateHistory, HandoverItem

ALLOWED_TRANSITIONS = {
    ProjectStatus.NOT_STARTED: {ProjectStatus.IN_PROGRESS, ProjectStatus.CANCELLED},
    ProjectStatus.IN_PROGRESS: {ProjectStatus.ON_HOLD, ProjectStatus.COMPLETED, ProjectStatus.CANCELLED},
    ProjectStatus.ON_HOLD: {ProjectStatus.IN_PROGRESS, ProjectStatus.CANCELLED},
    ProjectStatus.COMPLETED: set(),
    ProjectStatus.CANCELLED: set(),
}


class ProjectError(ValidationError):
    """Raised when a project action is not allowed."""


def _record_state(project, previous, actor, reason=""):
    ProjectStateHistory.objects.create(
        project=project, from_status=previous or "", to_status=project.status,
        actor=actor, reason=reason or "",
    )


@transaction.atomic
def create_project(deal, actor=None, proposal=None):
    """Open a delivery tracker for a won deal (one per deal)."""
    if Project.objects.filter(deal=deal).exists():
        raise ProjectError("This deal already has a project.")
    name = getattr(getattr(deal, "intake", None), "deal_name", "") or deal.deal_ref
    project = Project.objects.create(
        deal=deal, proposal=proposal, created_by=actor, name=name,
    )
    HandoverItem.objects.bulk_create([
        HandoverItem(project=project, name=item, order=i)
        for i, item in enumerate(HandoverItem.DEFAULT_PACK)
    ])
    _record_state(project, "", actor, reason="Project opened on proposal acceptance.")
    notifications.notify_project(
        deal, [deal.created_by],
        f"Delivery project opened for {deal.deal_ref} ({name}).",
    )
    return project


@transaction.atomic
def change_status(project, actor, to_status, reason=""):
    if not actor.can_assess_deals:
        raise PermissionDenied("Only an Analyst or Manager may update delivery.")
    if to_status not in ALLOWED_TRANSITIONS.get(project.status, set()):
        raise ProjectError(f"Cannot move a project from {project.status} to {to_status}.")

    previous = project.status
    project.status = to_status
    today = timezone.now().date()
    if to_status == ProjectStatus.IN_PROGRESS and project.actual_start is None:
        project.actual_start = today
    if to_status == ProjectStatus.COMPLETED:
        project.actual_end = today
    project.save(update_fields=["status", "actual_start", "actual_end", "updated_at"])
    _record_state(project, previous, actor, reason=reason)
    notifications.notify_project(
        project.deal, [project.deal.created_by],
        f"Project {project.deal.deal_ref} is now {project.get_status_display()}.",
    )
    return project


@transaction.atomic
def set_handover_done(item, actor, done):
    """Tick / untick a handover-pack item, stamping who and when."""
    if not actor.can_assess_deals:
        raise PermissionDenied("Only an Analyst or Manager may update the handover pack.")
    item.done = bool(done)
    item.done_by = actor if item.done else None
    item.done_at = timezone.now() if item.done else None
    item.save(update_fields=["done", "done_by", "done_at", "updated_at"])
    return item


@transaction.atomic
def update_details(project, actor, validated_data):
    """Edit health / status note / planned & actual dates. Assessor-only."""
    if not actor.can_assess_deals:
        raise PermissionDenied("Only an Analyst or Manager may update delivery.")
    for field, value in validated_data.items():
        setattr(project, field, value)
    project.save()
    return project
