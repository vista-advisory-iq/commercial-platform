from django.contrib import admin

from .models import Project, Milestone, Risk, ProjectStateHistory


class MilestoneInline(admin.TabularInline):
    model = Milestone
    extra = 0


class RiskInline(admin.TabularInline):
    model = Risk
    extra = 0


class ProjectStateHistoryInline(admin.TabularInline):
    model = ProjectStateHistory
    extra = 0
    can_delete = False
    readonly_fields = ("from_status", "to_status", "actor", "reason", "occurred_at")


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("deal", "status", "health", "created_at")
    list_filter = ("status", "health")
    search_fields = ("deal__deal_ref", "name")
    readonly_fields = ("id", "created_at", "updated_at")
    inlines = [MilestoneInline, RiskInline, ProjectStateHistoryInline]


@admin.register(ProjectStateHistory)
class ProjectStateHistoryAdmin(admin.ModelAdmin):
    list_display = ("project", "from_status", "to_status", "actor", "occurred_at")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
