from django.contrib import admin

from .models import CostModel, CostLine


class CostLineInline(admin.TabularInline):
    model = CostLine
    extra = 0


@admin.register(CostModel)
class CostModelAdmin(admin.ModelAdmin):
    list_display = ("deal", "currency", "annual_revenue", "project_life_years", "created_at")
    search_fields = ("deal__deal_ref",)
    readonly_fields = ("id", "created_at", "updated_at")
    inlines = [CostLineInline]
