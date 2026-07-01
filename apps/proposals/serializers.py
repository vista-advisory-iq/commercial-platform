from rest_framework import serializers

from .models import Proposal, ProposalStateHistory, ProposalDocument

OFFER_FIELDS = [
    "title", "executive_summary", "scope_of_work", "proposed_tariff_ngn_kwh",
    "contract_tenor_years", "total_contract_value_usd_m", "payment_terms",
    "commercial_terms", "assumptions", "validity_until",
]


class ProposalSerializer(serializers.ModelSerializer):
    deal_ref = serializers.CharField(source="deal.deal_ref", read_only=True)
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True, default="")

    class Meta:
        model = Proposal
        fields = [
            "id", "deal", "deal_ref", "status", "created_by", "created_by_name",
            "version", "decision_reason", "created_at", "updated_at",
            "sent_at", "decided_at",
            *OFFER_FIELDS,
        ]
        read_only_fields = [
            "id", "deal", "deal_ref", "status", "created_by", "created_by_name",
            "version", "decision_reason", "created_at", "updated_at",
            "sent_at", "decided_at",
        ]


class OfferUpdateSerializer(serializers.ModelSerializer):
    """Writable offer fields only — status changes go through the service."""
    class Meta:
        model = Proposal
        fields = OFFER_FIELDS


class ProposalStateHistorySerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source="actor.full_name", read_only=True, default="")

    class Meta:
        model = ProposalStateHistory
        fields = ["id", "from_status", "to_status", "actor_name", "reason", "occurred_at"]


class ProposalDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProposalDocument
        fields = ["id", "version", "content", "generated_at"]
