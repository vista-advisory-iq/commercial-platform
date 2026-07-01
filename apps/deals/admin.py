from django.contrib import admin
from .models import (
    Deal, DealIntake, DealGateResult, DealPillarComment, EditAccessRequest,
)


class DealIntakeInline(admin.StackedInline):
    model = DealIntake
    extra = 0


class StateHistoryInline(admin.TabularInline):
    from apps.audit.models import DealStateHistory
    model = DealStateHistory
    extra = 0
    can_delete = False
    readonly_fields = ("from_state", "to_state", "actor", "reason", "occurred_at")

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Deal)
class DealAdmin(admin.ModelAdmin):
    list_display = ("deal_ref", "state", "created_by", "assigned_analyst", "created_at")
    list_filter = ("state", "stage1_decision")
    search_fields = ("deal_ref",)
    readonly_fields = ("deal_ref", "state", "created_at", "submitted_at", "updated_at")
    inlines = [DealIntakeInline, StateHistoryInline]


@admin.register(DealGateResult)
class DealGateResultAdmin(admin.ModelAdmin):
    list_display = ("deal", "gate", "verdict", "assessed_by")
    list_filter = ("verdict",)


@admin.register(DealPillarComment)
class DealPillarCommentAdmin(admin.ModelAdmin):
    list_display = ("deal", "pillar", "authored_by", "updated_at")


@admin.register(EditAccessRequest)
class EditAccessRequestAdmin(admin.ModelAdmin):
    list_display = ("id", "deal", "requested_by", "status", "decided_by", "created_at")
    list_filter = ("status",)
