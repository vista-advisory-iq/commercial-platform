"""Per-user notification inbox API. Everyone sees only their own.

Supports splitting the inbox by kind so the UI can show messages
(DEAL_COMMENT) separately from other alerts:
  ?kind=DEAL_COMMENT          include only these kinds (comma-separated)
  ?exclude_kind=DEAL_COMMENT  exclude these kinds
applied to list, unread_count, and mark_all_read.
"""
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def _kind_filtered(self, qs):
        params = self.request.query_params
        kind = params.get("kind")
        exclude = params.get("exclude_kind")
        if kind:
            qs = qs.filter(kind__in=[k for k in kind.split(",") if k])
        if exclude:
            qs = qs.exclude(kind__in=[k for k in exclude.split(",") if k])
        return qs

    def get_queryset(self):
        qs = Notification.objects.filter(recipient=self.request.user).select_related("deal")
        if self.request.query_params.get("unread") == "true":
            qs = qs.filter(is_read=False)
        return self._kind_filtered(qs)

    @action(detail=False, methods=["get"])
    def unread_count(self, request):
        qs = Notification.objects.filter(recipient=request.user, is_read=False)
        return Response({"count": self._kind_filtered(qs).count()})

    @action(detail=True, methods=["post"])
    def read(self, request, pk=None):
        note = self.get_object()  # get_queryset already scopes to the current user
        if not note.is_read:
            note.is_read = True
            note.save(update_fields=["is_read"])
        return Response(NotificationSerializer(note).data)

    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        qs = Notification.objects.filter(recipient=request.user, is_read=False)
        updated = self._kind_filtered(qs).update(is_read=True)
        return Response({"marked_read": updated})
