from django.contrib import admin

from .models import Proposal, ProposalStateHistory, ProposalDocument


class ProposalStateHistoryInline(admin.TabularInline):
    model = ProposalStateHistory
    extra = 0
    can_delete = False
    readonly_fields = ("from_status", "to_status", "actor", "reason", "occurred_at")


@admin.register(Proposal)
class ProposalAdmin(admin.ModelAdmin):
    list_display = ("deal", "status", "version", "created_by", "sent_at")
    list_filter = ("status",)
    search_fields = ("deal__deal_ref", "title")
    readonly_fields = ("id", "created_at", "updated_at", "sent_at", "decided_at", "version")
    inlines = [ProposalStateHistoryInline]


@admin.register(ProposalStateHistory)
class ProposalStateHistoryAdmin(admin.ModelAdmin):
    """Append-only — visible but not editable."""
    list_display = ("proposal", "from_status", "to_status", "actor", "occurred_at")
    list_filter = ("to_status",)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(ProposalDocument)
class ProposalDocumentAdmin(admin.ModelAdmin):
    list_display = ("proposal", "version", "generated_by", "generated_at")
    readonly_fields = ("proposal", "version", "content", "generated_by", "generated_at")

    def has_add_permission(self, request):
        return False
