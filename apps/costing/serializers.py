from rest_framework import serializers

from . import calc
from .models import CostModel, CostLine


class CostLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = CostLine
        fields = ["id", "cost_model", "kind", "category", "description", "amount", "order"]
        read_only_fields = ["id"]


class CostModelSerializer(serializers.ModelSerializer):
    deal_ref = serializers.CharField(source="deal.deal_ref", read_only=True)
    lines = CostLineSerializer(many=True, read_only=True)
    outputs = serializers.SerializerMethodField()

    class Meta:
        model = CostModel
        fields = [
            "id", "deal", "deal_ref", "currency", "annual_revenue",
            "project_life_years", "debt_pct", "interest_rate_pct",
            "debt_tenor_years", "discount_rate_pct", "notes",
            "lines", "outputs", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "deal", "deal_ref", "lines", "outputs", "created_at", "updated_at"]

    def get_outputs(self, obj):
        return calc.compute(obj)


class CostModelAssumptionsSerializer(serializers.ModelSerializer):
    class Meta:
        model = CostModel
        fields = CostModel.ASSUMPTION_FIELDS
