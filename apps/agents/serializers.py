from django.conf import settings
from rest_framework import serializers

from .models import SalesAgent


class SalesAgentSerializer(serializers.ModelSerializer):
    # How many deals this agent has originated (attribution via intake).
    deal_count = serializers.IntegerField(read_only=True)
    protection_days = serializers.SerializerMethodField()

    class Meta:
        model = SalesAgent
        fields = [
            "id", "name", "company", "email", "phone", "status",
            "agreement_signed_on", "default_fee_pct", "notes",
            "deal_count", "protection_days", "created_at",
        ]
        read_only_fields = ["id", "deal_count", "protection_days", "created_at"]

    def get_protection_days(self, obj):
        # Lead-protection window (days from registration) — config, pending DEL
        # sign-off on the finder programme terms.
        return getattr(settings, "FINDER_PROTECTION_DAYS", 90)
