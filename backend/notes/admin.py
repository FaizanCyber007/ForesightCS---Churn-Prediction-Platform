from django.contrib import admin

from notes.models import CustomerNote


@admin.register(CustomerNote)
class CustomerNoteAdmin(admin.ModelAdmin):
    list_display = ("customer", "organization", "author", "created_at")
    list_filter = ("organization",)
    search_fields = ("customer__company_name", "body")
