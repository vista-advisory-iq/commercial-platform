"""
Audit tables are visible in the admin but strictly read-only — they cannot
be added, changed, or deleted through the back office. This enforces the
append-only guarantee at the UI layer as well as in code.
"""
from django.contrib import admin
from .models import DealStateHistory, DealFieldHistory


class _ReadOnlyAudit(admin.ModelAdmin):
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(DealStateHistory)
class DealStateHistoryAdmin(_ReadOnlyAudit):
    list_display = ("deal", "from_state", "to_state", "actor", "occurred_at")
    list_filter = ("to_state", "occurred_at")
    search_fields = ("deal__deal_ref",)


@admin.register(DealFieldHistory)
class DealFieldHistoryAdmin(_ReadOnlyAudit):
    list_display = ("deal", "entity", "field_name", "actor", "occurred_at")
    list_filter = ("entity", "occurred_at")
    search_fields = ("deal__deal_ref", "field_name")
