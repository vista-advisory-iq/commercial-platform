"""
Sales Agent API. Everyone authenticated may view the roster (BDs need it to
attribute a lead at intake); only assessors (Analyst/Manager) manage it —
agents are a commercial relationship, not something a BD self-serves.
"""
from django.db.models import Count
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated, SAFE_METHODS

from apps.deals.permissions import CanAssessDeals
from .models import SalesAgent
from .serializers import SalesAgentSerializer


class SalesAgentViewSet(viewsets.ModelViewSet):
    serializer_class = SalesAgentSerializer

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsAuthenticated()]
        return [IsAuthenticated(), CanAssessDeals()]

    def get_queryset(self):
        return SalesAgent.objects.annotate(deal_count=Count("deals"))

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
