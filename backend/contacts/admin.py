from django.contrib import admin

from contacts.models import Contact


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ("name", "role", "customer", "organization", "email")
    list_filter = ("organization",)
    search_fields = ("name", "email", "customer__company_name")
