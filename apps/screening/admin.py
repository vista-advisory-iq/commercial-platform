from django.contrib import admin
from .models import KnockoutGate, Pillar, SubCriterion


class SubCriterionInline(admin.TabularInline):
    model = SubCriterion
    extra = 0


@admin.register(KnockoutGate)
class KnockoutGateAdmin(admin.ModelAdmin):
    list_display = ("number", "name")
    ordering = ("number",)


@admin.register(Pillar)
class PillarAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "weight_pct", "pass_threshold")
    inlines = [SubCriterionInline]


@admin.register(SubCriterion)
class SubCriterionAdmin(admin.ModelAdmin):
    list_display = ("pillar", "name", "weight_in_pillar")
    list_filter = ("pillar",)
