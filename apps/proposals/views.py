"""
Proposal API. Status changes are exposed as explicit actions (submit, return,
send, outcome) — clients never PATCH `status` directly; the lifecycle service
owns it. PATCH edits only the offer fields, and only while in draft.
"""
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.deals.models import Deal
from . import services
from .models import Proposal
from .pdf import build_proposal_pdf
from .serializers import (
    ProposalSerializer, OfferUpdateSerializer,
    ProposalStateHistorySerializer,
)


class ProposalViewSet(viewsets.ModelViewSet):
    serializer_class = ProposalSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch"]  # no PUT/DELETE

    def get_queryset(self):
        user = self.request.user
        qs = Proposal.objects.select_related("deal", "deal__intake", "created_by")
        if not user.can_view_full_pipeline:
            qs = qs.filter(deal__created_by=user)  # BD: own deals only
        deal_id = self.request.query_params.get("deal")
        if deal_id:
            qs = qs.filter(deal_id=deal_id)
        return qs

    def create(self, request, *args, **kwargs):
        deal = get_object_or_404(Deal, pk=request.data.get("deal"))
        proposal = services.create_proposal(deal, request.user)
        return Response(ProposalSerializer(proposal).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        proposal = self.get_object()
        serializer = OfferUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        services.update_offer(proposal, request.user, serializer.validated_data)
        proposal.refresh_from_db()
        return Response(ProposalSerializer(proposal).data)

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        proposal = self.get_object()
        services.submit_for_review(proposal, request.user)
        return Response(ProposalSerializer(proposal).data)

    @action(detail=True, methods=["post"], url_path="return")
    def return_to_draft(self, request, pk=None):
        proposal = self.get_object()
        services.return_to_draft(proposal, request.user, request.data.get("reason", ""))
        return Response(ProposalSerializer(proposal).data)

    @action(detail=True, methods=["post"])
    def send(self, request, pk=None):
        proposal = self.get_object()
        services.send_to_client(proposal, request.user)
        return Response(ProposalSerializer(proposal).data)

    @action(detail=True, methods=["post"])
    def outcome(self, request, pk=None):
        proposal = self.get_object()
        accepted = bool(request.data.get("accepted"))
        services.record_outcome(proposal, request.user, accepted, request.data.get("reason", ""))
        return Response(ProposalSerializer(proposal).data)

    @action(detail=True, methods=["get"])
    def history(self, request, pk=None):
        proposal = self.get_object()
        data = ProposalStateHistorySerializer(proposal.state_history.all(), many=True).data
        return Response(data)

    @action(detail=True, methods=["get"])
    def document(self, request, pk=None):
        """Stream the proposal as a PDF (live render of the current offer)."""
        proposal = self.get_object()
        pdf_bytes = build_proposal_pdf(proposal)
        resp = HttpResponse(pdf_bytes, content_type="application/pdf")
        resp["Content-Disposition"] = f'inline; filename="proposal-{proposal.deal.deal_ref}.pdf"'
        return resp
