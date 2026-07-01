"""
Cost Modeller API. One CostModel per deal (assessor-created), with CAPEX/OPEX
lines as CRUD sub-resources. Assessors write; pipeline viewers read.
"""
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from django.shortcuts import get_object_or_404

from apps.deals.models import Deal
from apps.deals.permissions import CanAssessDeals
from . import services
from .models import CostModel, CostLine
from .serializers import (
    CostModelSerializer, CostModelAssumptionsSerializer, CostLineSerializer,
)


def _visible(qs, user, deal_path="deal"):
    if user.can_view_full_pipeline:
        return qs
    return qs.filter(**{f"{deal_path}__created_by": user})


class CostModelViewSet(viewsets.ModelViewSet):
    serializer_class = CostModelSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch"]

    def get_queryset(self):
        qs = _visible(CostModel.objects.select_related("deal").prefetch_related("lines"), self.request.user)
        deal_id = self.request.query_params.get("deal")
        if deal_id:
            qs = qs.filter(deal_id=deal_id)
        return qs

    def create(self, request, *args, **kwargs):
        deal = get_object_or_404(Deal, pk=request.data.get("deal"))
        cm = services.create_cost_model(deal, request.user)
        return Response(CostModelSerializer(cm).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        cm = self.get_object()
        serializer = CostModelAssumptionsSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        services.update_assumptions(cm, request.user, serializer.validated_data)
        cm.refresh_from_db()
        return Response(CostModelSerializer(cm).data)


class CostLineViewSet(viewsets.ModelViewSet):
    serializer_class = CostLineSerializer
    http_method_names = ["get", "post", "patch", "delete"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [CanAssessDeals()]

    def get_queryset(self):
        qs = _visible(
            CostLine.objects.select_related("cost_model__deal"),
            self.request.user, "cost_model__deal",
        )
        cm_id = self.request.query_params.get("cost_model")
        if cm_id:
            qs = qs.filter(cost_model_id=cm_id)
        return qs
