from rest_framework import serializers

from .models import Project, Milestone, Risk, ProjectStateHistory


class MilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Milestone
        fields = [
            "id", "project", "name", "owner", "due_date", "status",
            "notes", "order", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class RiskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Risk
        fields = [
            "id", "project", "kind", "description", "severity", "status",
            "mitigation", "owner", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ProjectSerializer(serializers.ModelSerializer):
    deal_ref = serializers.CharField(source="deal.deal_ref", read_only=True)
    percent_complete = serializers.IntegerField(read_only=True)
    milestones = MilestoneSerializer(many=True, read_only=True)
    risks = RiskSerializer(many=True, read_only=True)

    class Meta:
        model = Project
        fields = [
            "id", "deal", "deal_ref", "proposal", "name", "status", "health",
            "status_note", "planned_start", "planned_end", "actual_start",
            "actual_end", "percent_complete", "milestones", "risks",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "deal", "deal_ref", "proposal", "name", "status",
            "percent_complete", "milestones", "risks", "created_at", "updated_at",
        ]


class ProjectDetailUpdateSerializer(serializers.ModelSerializer):
    """Writable project-level details (status changes go through the service)."""
    class Meta:
        model = Project
        fields = Project.DETAIL_FIELDS


class ProjectStateHistorySerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source="actor.full_name", read_only=True, default="")

    class Meta:
        model = ProjectStateHistory
        fields = ["id", "from_status", "to_status", "actor_name", "reason", "occurred_at"]
