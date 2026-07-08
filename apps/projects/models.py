"""
Module 3 — Project Tracker.

When a proposal is accepted, delivery begins: a Project is created (one per deal)
to track milestones, overall status/health, risks/issues, and key dates. The
project's own status moves through a guarded lifecycle recorded in the
append-only ProjectStateHistory. Milestones and risks are editable sub-records.
"""
import uuid
from django.conf import settings
from django.db import models


class ProjectStatus(models.TextChoices):
    NOT_STARTED = "NOT_STARTED", "Not started"
    IN_PROGRESS = "IN_PROGRESS", "In progress"
    ON_HOLD = "ON_HOLD", "On hold"
    COMPLETED = "COMPLETED", "Completed"
    CANCELLED = "CANCELLED", "Cancelled"


class Health(models.TextChoices):
    GREEN = "GREEN", "Green"
    AMBER = "AMBER", "Amber"
    RED = "RED", "Red"


class Project(models.Model):
    """Delivery tracker for a won deal."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    deal = models.OneToOneField("deals.Deal", on_delete=models.PROTECT, related_name="project")
    proposal = models.ForeignKey(
        "proposals.Proposal", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="projects",
    )
    name = models.CharField(max_length=255, blank=True)
    status = models.CharField(
        max_length=12, choices=ProjectStatus.choices, default=ProjectStatus.NOT_STARTED
    )
    health = models.CharField(max_length=5, choices=Health.choices, default=Health.GREEN)
    status_note = models.TextField(blank=True)

    planned_start = models.DateField(null=True, blank=True)
    planned_end = models.DateField(null=True, blank=True)
    actual_start = models.DateField(null=True, blank=True)
    actual_end = models.DateField(null=True, blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True,
        related_name="created_projects",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    DETAIL_FIELDS = ["health", "status_note", "planned_start", "planned_end", "actual_start", "actual_end"]

    class Meta:
        db_table = "projects"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Project {self.deal_id} ({self.get_status_display()})"

    @property
    def percent_complete(self):
        total = self.milestones.count()
        if not total:
            return 0
        done = self.milestones.filter(status=Milestone.Status.DONE).count()
        return round(done / total * 100)


class Milestone(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        IN_PROGRESS = "IN_PROGRESS", "In progress"
        DONE = "DONE", "Done"
        BLOCKED = "BLOCKED", "Blocked"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="milestones")
    name = models.CharField(max_length=255)
    owner = models.CharField(max_length=255, blank=True)
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    notes = models.TextField(blank=True)
    order = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "project_milestones"
        ordering = ["order", "due_date", "created_at"]

    def __str__(self):
        return f"{self.project_id}: {self.name}"


class Risk(models.Model):
    class Kind(models.TextChoices):
        RISK = "RISK", "Risk"
        ISSUE = "ISSUE", "Issue"

    class Severity(models.TextChoices):
        LOW = "LOW", "Low"
        MEDIUM = "MEDIUM", "Medium"
        HIGH = "HIGH", "High"

    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        MITIGATING = "MITIGATING", "Mitigating"
        CLOSED = "CLOSED", "Closed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="risks")
    kind = models.CharField(max_length=8, choices=Kind.choices, default=Kind.RISK)
    description = models.TextField()
    severity = models.CharField(max_length=8, choices=Severity.choices, default=Severity.MEDIUM)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.OPEN)
    mitigation = models.TextField(blank=True)
    owner = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "project_risks"
        ordering = ["-severity", "-created_at"]

    def __str__(self):
        return f"{self.project_id}: {self.get_kind_display()} ({self.severity})"


class HandoverItem(models.Model):
    """
    One item of the BD → Commercial Operations handover pack, checked off at
    contract signing / delivery start. The default pack is seeded when the
    project is created (see services.create_project); assessors may add
    deal-specific items.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="handover_items")
    name = models.CharField(max_length=255)
    done = models.BooleanField(default=False)
    done_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="handover_items_done",
    )
    done_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    order = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # The standard pack (prototype gap 19) — adopted as the default checklist.
    DEFAULT_PACK = [
        "Signed contract & annexes",
        "Tariff & escalation schedule",
        "KYC / credit file",
        "Metering & billing plan",
        "Customer contacts & escalation points",
    ]

    class Meta:
        db_table = "project_handover_items"
        ordering = ["order", "created_at"]

    def __str__(self):
        return f"{self.project_id}: {self.name} ({'done' if self.done else 'open'})"


class ProjectStateHistory(models.Model):
    """Append-only lifecycle timeline for a project."""

    id = models.BigAutoField(primary_key=True)
    project = models.ForeignKey(Project, on_delete=models.PROTECT, related_name="state_history")
    from_status = models.CharField(max_length=12, blank=True)
    to_status = models.CharField(max_length=12)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True
    )
    reason = models.TextField(blank=True)
    occurred_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "project_state_history"
        ordering = ["occurred_at", "id"]
        verbose_name_plural = "project state history"

    def __str__(self):
        return f"{self.project_id}: {self.from_status or '∅'} → {self.to_status}"
