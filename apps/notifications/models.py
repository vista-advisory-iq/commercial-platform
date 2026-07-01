"""
In-app notifications.

A lightweight, per-recipient inbox. Unlike the audit tables these are mutable
(they get marked read), so they live in their own app rather than the audit one.
The first producer is deal submission (an analyst-facing "new deal in the queue"
alert); the model is generic so other events can reuse it.
"""
import uuid
from django.conf import settings
from django.db import models


class Notification(models.Model):
    class Kind(models.TextChoices):
        DEAL_SUBMITTED = "DEAL_SUBMITTED", "Deal submitted"
        DEAL_UNDER_REVIEW = "DEAL_UNDER_REVIEW", "Deal taken for review"
        DEAL_RETURNED = "DEAL_RETURNED", "Deal returned to BD"
        STAGE1_DECISION = "STAGE1_DECISION", "Stage 1 decision"
        SCORING_READY = "SCORING_READY", "Scoring ready for committee"
        STAGE2_DECISION = "STAGE2_DECISION", "Stage 2 decision"
        EDIT_REQUESTED = "EDIT_REQUESTED", "Edit access requested"
        EDIT_DECISION = "EDIT_DECISION", "Edit access decision"
        PROPOSAL_UPDATE = "PROPOSAL_UPDATE", "Proposal update"
        PROJECT_UPDATE = "PROJECT_UPDATE", "Project update"
        DEAL_COMMENT = "DEAL_COMMENT", "Deal discussion message"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications"
    )
    # The deal this is about (optional; kept readable if the deal is ever removed).
    deal = models.ForeignKey(
        "deals.Deal", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="notifications",
    )
    kind = models.CharField(max_length=32, choices=Kind.choices)
    message = models.CharField(max_length=255)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["recipient", "is_read"])]

    def __str__(self):
        return f"{self.recipient_id}: {self.message}"
