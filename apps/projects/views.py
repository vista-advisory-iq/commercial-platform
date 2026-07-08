"""
Project Tracker API. Project status changes go through explicit actions (the
service owns the state machine); PATCH edits project-level details. Milestones
and risks are CRUD sub-resources. Assessors write; pipeline viewers read.
"""
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import MethodNotAllowed
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.deals.permissions import CanAssessDeals
from . import services
from .models import Project, Milestone, Risk, HandoverItem
from .serializers import (
    ProjectSerializer, ProjectDetailUpdateSerializer,
    ProjectStateHistorySerializer, MilestoneSerializer, RiskSerializer,
    HandoverItemSerializer,
)


def _visible(qs, user, deal_path="deal"):
    """Limit a queryset to deals the user may see (BDs: their own)."""
    if user.can_view_full_pipeline:
        return qs
    return qs.filter(**{f"{deal_path}__created_by": user})


class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]
    # POST is allowed for the change_status action, but projects are auto-created
    # on proposal acceptance — direct creation is disabled below. No DELETE.
    http_method_names = ["get", "post", "patch"]

    def create(self, request, *args, **kwargs):
        raise MethodNotAllowed("POST", detail="Projects are created automatically when a proposal is accepted.")

    def get_queryset(self):
        qs = Project.objects.select_related("deal").prefetch_related("milestones", "risks")
        qs = _visible(qs, self.request.user)
        deal_id = self.request.query_params.get("deal")
        if deal_id:
            qs = qs.filter(deal_id=deal_id)
        return qs

    def partial_update(self, request, *args, **kwargs):
        project = self.get_object()
        serializer = ProjectDetailUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        services.update_details(project, request.user, serializer.validated_data)
        project.refresh_from_db()
        return Response(ProjectSerializer(project).data)

    @action(detail=True, methods=["post"])
    def change_status(self, request, pk=None):
        project = self.get_object()
        services.change_status(
            project, request.user,
            request.data.get("status"), request.data.get("reason", ""),
        )
        return Response(ProjectSerializer(project).data)

    @action(detail=True, methods=["get"])
    def history(self, request, pk=None):
        project = self.get_object()
        data = ProjectStateHistorySerializer(project.state_history.all(), many=True).data
        return Response(data)


class _ChildViewSet(viewsets.ModelViewSet):
    """Shared CRUD base for milestones/risks: assessors write, viewers read."""
    http_method_names = ["get", "post", "patch", "delete"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [CanAssessDeals()]

    def get_queryset(self):
        qs = _visible(self.model.objects.select_related("project__deal"), self.request.user, "project__deal")
        project_id = self.request.query_params.get("project")
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs


class MilestoneViewSet(_ChildViewSet):
    model = Milestone
    serializer_class = MilestoneSerializer


class RiskViewSet(_ChildViewSet):
    model = Risk
    serializer_class = RiskSerializer


class HandoverItemViewSet(_ChildViewSet):
    """The handover pack. Ticking an item stamps who and when via the service."""
    model = HandoverItem
    serializer_class = HandoverItemSerializer

    def partial_update(self, request, *args, **kwargs):
        item = self.get_object()
        if "done" in request.data:
            services.set_handover_done(item, request.user, request.data["done"])
        # Allow name/notes/order edits through the normal serializer path.
        other = {k: v for k, v in request.data.items() if k != "done"}
        if other:
            serializer = self.get_serializer(item, data=other, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
        item.refresh_from_db()
        return Response(HandoverItemSerializer(item).data)
