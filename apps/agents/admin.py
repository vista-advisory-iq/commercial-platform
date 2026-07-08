from django.contrib import admin

from .models import SalesAgent


@admin.register(SalesAgent)
class SalesAgentAdmin(admin.ModelAdmin):
    list_display = ["name", "company", "status", "email", "phone", "agreement_signed_on"]
    list_filter = ["status"]
    search_fields = ["name", "company", "email"]
