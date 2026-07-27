from django.contrib import admin

from rules.models import HealthRule


@admin.register(HealthRule)
class HealthRuleAdmin(admin.ModelAdmin):
    list_display = ("name", "organization", "metric_type", "threshold", "weight", "is_active")
    list_filter = ("organization", "metric_type", "is_active")
    search_fields = ("name",)
