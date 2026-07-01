"""DRF serializers for deals, intake, audit history, and edit-access requests."""
from rest_framework import serializers

from apps.audit.models import DealStateHistory, DealFieldHistory
from .models import (
    Deal, DealIntake, DealGateResult, DealPillarComment, EditAccessRequest,
    DealComment,
)


class DealIntakeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DealIntake
        exclude = ["id", "deal"]


class DealListSerializer(serializers.ModelSerializer):
    """Lightweight row for pipeline / draft lists."""
    deal_name = serializers.CharField(source="intake.deal_name", read_only=True, default="")
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)

    class Meta:
        model = Deal
        fields = [
            "id", "deal_ref", "deal_name", "state", "stage1_decision",
            "created_by_name", "assigned_analyst", "created_at", "submitted_at",
        ]


class DealDetailSerializer(serializers.ModelSerializer):
    intake = DealIntakeSerializer(required=False)

    class Meta:
        model = Deal
        fields = [
            "id", "deal_ref", "state", "stage1_decision",
            "stage2_decision", "stage2_rationale", "created_by",
            "assigned_analyst", "current_rejection_reason", "intake",
            "created_at", "submitted_at", "updated_at",
        ]
        read_only_fields = [
            "id", "deal_ref", "state", "stage1_decision",
            "stage2_decision", "stage2_rationale", "created_by",
            "assigned_analyst", "current_rejection_reason",
            "created_at", "submitted_at", "updated_at",
        ]

    def create(self, validated_data):
        intake_data = validated_data.pop("intake", None)
        request = self.context["request"]
        deal = Deal.objects.create(created_by=request.user, **validated_data)
        if intake_data:
            DealIntake.objects.create(deal=deal, **intake_data)
        else:
            # Always create an intake shell so drafts have somewhere to save into.
            DealIntake.objects.create(deal=deal, deal_name="")
        return deal

    def update(self, instance, validated_data):
        intake_data = validated_data.pop("intake", None)
        if intake_data:
            intake = instance.intake
            for k, v in intake_data.items():
                setattr(intake, k, v)
            intake.save()
        return instance


class StateHistorySerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source="actor.full_name", read_only=True, default="")

    class Meta:
        model = DealStateHistory
        fields = ["id", "from_state", "to_state", "actor_name", "reason", "occurred_at"]


class FieldHistorySerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source="actor.full_name", read_only=True, default="")

    class Meta:
        model = DealFieldHistory
        fields = ["id", "entity", "field_name", "old_value", "new_value", "actor_name", "occurred_at"]


class GateResultInputSerializer(serializers.Serializer):
    """Validates one incoming gate verdict from the analyst's assessment."""
    gate = serializers.IntegerField()
    verdict = serializers.ChoiceField(choices=DealGateResult.Verdict.values)
    evidence_notes = serializers.CharField(required=False, allow_blank=True, default="")


class SubScoreInputSerializer(serializers.Serializer):
    """Validates one incoming Stage 2 sub-criterion grade."""
    sub_criterion = serializers.IntegerField()
    grade = serializers.ChoiceField(choices=[1, 3, 5])
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class PillarCommentInputSerializer(serializers.Serializer):
    """Validates one incoming per-pillar rationale comment."""
    pillar = serializers.CharField()
    comment = serializers.CharField(required=False, allow_blank=True, default="")


class DealCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.full_name", read_only=True, default="")
    author_role = serializers.CharField(source="author.role", read_only=True)

    class Meta:
        model = DealComment
        fields = ["id", "author", "author_name", "author_role", "body", "created_at"]
        read_only_fields = fields


class Stage2DecisionInputSerializer(serializers.Serializer):
    """Validates the IC's final Stage 2 decision."""
    decision = serializers.ChoiceField(choices=["GO", "CONDITIONAL", "NO_GO"])
    rationale = serializers.CharField(required=False, allow_blank=True, default="")


class EditAccessRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = EditAccessRequest
        fields = [
            "id", "deal", "requested_by", "justification", "status",
            "decided_by", "decision_reason", "created_at", "decided_at",
        ]
        read_only_fields = ["id", "requested_by", "status", "decided_by",
                            "decision_reason", "created_at", "decided_at"]
