"""
Deal API (Data Model & Audit Specification, Sections 3, 5, 6).

The viewset exposes the deal lifecycle as explicit actions (submit, take,
reject, decide) rather than letting clients PATCH `state` directly — state is
owned by the lifecycle service. Visibility is filtered by role so a BD only
ever sees their own deals.
"""
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.screening.models import KnockoutGate
from apps.notifications import services as notifications
from . import services
from . import scoring as scoring_engine
from .models import Deal, DealState, EditAccessRequest, DealComment
from .permissions import DealAccessPermission, CanAssessDeals, CanDecideStage2
from .serializers import (
    DealListSerializer, DealDetailSerializer,
    StateHistorySerializer, FieldHistorySerializer,
    EditAccessRequestSerializer, GateResultInputSerializer,
    SubScoreInputSerializer, PillarCommentInputSerializer,
    Stage2DecisionInputSerializer, DealCommentSerializer,
)


class DealViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, DealAccessPermission]

    def get_serializer_class(self):
        if self.action == "list":
            return DealListSerializer
        return DealDetailSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Deal.objects.select_related("intake", "created_by", "assigned_analyst")
        if user.can_view_full_pipeline:
            return qs
        # BD: only their own deals.
        return qs.filter(created_by=user)

    # --- Draft-specific list -------------------------------------------------
    @action(detail=False, methods=["get"])
    def drafts(self, request):
        """The BD's own drafts page (DRAFT + anything sent back to them)."""
        qs = self.get_queryset().filter(
            created_by=request.user,
            state__in=[DealState.DRAFT, DealState.REJECTED_TO_BD],
        )
        page = self.paginate_queryset(qs)
        serializer = DealListSerializer(page or qs, many=True)
        return self.get_paginated_response(serializer.data) if page is not None else Response(serializer.data)

    # --- Lifecycle actions ---------------------------------------------------
    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        deal = self.get_object()
        services.submit_deal(deal, request.user)
        return Response(DealDetailSerializer(deal, context={"request": request}).data)

    @action(detail=True, methods=["post"], permission_classes=[CanAssessDeals])
    def take(self, request, pk=None):
        deal = get_object_or_404(Deal, pk=pk)
        services.take_for_review(deal, request.user)
        return Response(DealDetailSerializer(deal, context={"request": request}).data)

    @action(detail=True, methods=["post"], permission_classes=[CanAssessDeals])
    def reject(self, request, pk=None):
        deal = get_object_or_404(Deal, pk=pk)
        reason = request.data.get("reason", "")
        services.reject_to_bd(deal, request.user, reason)
        return Response(DealDetailSerializer(deal, context={"request": request}).data)

    # --- Stage 1 knockout gate assessment ------------------------------------
    @action(detail=True, methods=["get", "post"], permission_classes=[IsAuthenticated])
    def gates(self, request, pk=None):
        """
        GET  — the five knockout gates merged with this deal's recorded verdicts
               (readable by anyone; the UI shows them read-only to non-assessors).
        POST — save verdicts (assessors only — enforced by the service):
               {"results": [{gate, verdict, evidence_notes}, ...]}, then return
               the refreshed merged list.
        """
        deal = get_object_or_404(Deal, pk=pk)
        if request.method == "POST":
            payload = request.data.get("results", request.data)
            serializer = GateResultInputSerializer(data=payload, many=True)
            serializer.is_valid(raise_exception=True)
            services.save_gate_results(deal, request.user, serializer.validated_data)

        results = {r.gate_id: r for r in deal.gate_results.all()}
        data = [
            {
                "gate": g.number,
                "name": g.name,
                "pass_condition": g.pass_condition,
                "required_evidence": g.required_evidence,
                "verdict": results[g.id].verdict if g.id in results else "",
                "evidence_notes": results[g.id].evidence_notes if g.id in results else "",
            }
            for g in KnockoutGate.objects.all()
        ]
        return Response(data)

    @action(detail=True, methods=["post"], permission_classes=[CanAssessDeals])
    def finalize_stage1(self, request, pk=None):
        """Derive and commit the Stage 1 outcome from the recorded gate verdicts."""
        deal = get_object_or_404(Deal, pk=pk)
        services.finalize_stage1(deal, request.user)
        return Response(DealDetailSerializer(deal, context={"request": request}).data)

    # --- Stage 2 pillar scoring ----------------------------------------------
    @action(detail=True, methods=["get", "post"], permission_classes=[IsAuthenticated])
    def scoring(self, request, pk=None):
        """
        GET  — the full scoring breakdown (pillars, sub-criteria, weighted total),
               readable by anyone who can see the deal.
        POST — save sub-criterion grades and pillar comments (assessors only):
               {"grades": [{sub_criterion, grade, notes}], "comments": [{pillar, comment}]}.
        """
        if request.method == "POST":
            deal = get_object_or_404(Deal, pk=pk)
            grades = SubScoreInputSerializer(data=request.data.get("grades", []), many=True)
            grades.is_valid(raise_exception=True)
            comments = PillarCommentInputSerializer(data=request.data.get("comments", []), many=True)
            comments.is_valid(raise_exception=True)
            scoring_engine.save_scores(deal, request.user, grades.validated_data, comments.validated_data)
        else:
            deal = self.get_object()  # enforces deal visibility
        return Response(scoring_engine.compute_scores(deal))

    @action(detail=True, methods=["post"], permission_classes=[CanDecideStage2])
    def decide_stage2(self, request, pk=None):
        """Record the IC's final Stage 2 GO / CONDITIONAL / NO-GO decision."""
        deal = get_object_or_404(Deal, pk=pk)
        serializer = Stage2DecisionInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.decide_stage2(
            deal, request.user,
            serializer.validated_data["decision"],
            serializer.validated_data.get("rationale", ""),
        )
        return Response(DealDetailSerializer(deal, context={"request": request}).data)

    # --- Deal discussion (BD <-> assessors Q&A) ------------------------------
    @action(detail=True, methods=["get", "post"])
    def comments(self, request, pk=None):
        deal = get_object_or_404(Deal, pk=pk)
        user = request.user
        can_see = user.can_view_full_pipeline or deal.created_by_id == user.id
        if not can_see:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "POST":
            body = (request.data.get("body") or "").strip()
            if not body:
                return Response({"detail": "Message cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)
            comment = DealComment.objects.create(deal=deal, author=user, body=body)
            # Notify the other side of the conversation.
            if user.is_business_developer:
                recipients = notifications.assessors()
            else:
                recipients = [deal.created_by]
            who = user.full_name or user.email
            snippet = body if len(body) <= 80 else body[:77] + "…"
            notifications.notify_comment(
                deal, recipients, f"New message on {deal.deal_ref} from {who}: {snippet}",
            )
            return Response(DealCommentSerializer(comment).data, status=status.HTTP_201_CREATED)

        qs = deal.comments.select_related("author")
        return Response(DealCommentSerializer(qs, many=True).data)

    # --- Audit history (visible in-app; BD sees their own) -------------------
    @action(detail=True, methods=["get"])
    def history(self, request, pk=None):
        deal = self.get_object()  # runs object permission check
        states = StateHistorySerializer(deal.state_history.all(), many=True).data
        fields = FieldHistorySerializer(deal.field_history.all(), many=True).data
        return Response({"state_history": states, "field_history": fields})

    # --- Edit-access requests ------------------------------------------------
    @action(detail=True, methods=["post"], url_path="request-edit")
    def request_edit(self, request, pk=None):
        deal = self.get_object()
        if not request.user.is_business_developer:
            return Response(
                {"detail": "Only a Business Developer may request edit access."},
                status=status.HTTP_403_FORBIDDEN,
            )
        req = EditAccessRequest.objects.create(
            deal=deal,
            requested_by=request.user,
            justification=request.data.get("justification", ""),
        )
        notifications.notify_edit_requested(req)
        return Response(EditAccessRequestSerializer(req).data, status=status.HTTP_201_CREATED)


class EditAccessRequestViewSet(viewsets.ReadOnlyModelViewSet):
    """List/inspect edit-access requests, plus approve/deny actions."""
    serializer_class = EditAccessRequestSerializer
    permission_classes = [CanAssessDeals]

    def get_queryset(self):
        return EditAccessRequest.objects.select_related("deal", "requested_by")

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        req = self.get_object()
        req.mark_decided(EditAccessRequest.Status.APPROVED, request.user)
        services.reopen_for_edit(req.deal, request.user)
        notifications.notify_edit_decided(req)
        return Response(EditAccessRequestSerializer(req).data)

    @action(detail=True, methods=["post"])
    def deny(self, request, pk=None):
        req = self.get_object()
        reason = request.data.get("reason", "")
        req.mark_decided(EditAccessRequest.Status.DENIED, request.user, reason)
        notifications.notify_edit_decided(req)
        return Response(EditAccessRequestSerializer(req).data)
