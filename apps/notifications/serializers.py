from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    deal_ref = serializers.CharField(source="deal.deal_ref", read_only=True, default="")

    class Meta:
        model = Notification
        fields = ["id", "deal", "deal_ref", "kind", "message", "is_read", "created_at"]
        read_only_fields = fields
