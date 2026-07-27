from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from core.models import AuditLog, CustomUser, Organization


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "subscription_status", "is_active", "created_at")
    list_filter = ("subscription_status", "is_active")
    search_fields = ("name", "slug", "lemon_squeezy_customer_id")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (("Tenant", {"fields": ("organization", "is_org_admin")}),)
    list_display = UserAdmin.list_display + ("organization", "is_org_admin")
    list_filter = UserAdmin.list_filter + ("organization", "is_org_admin")


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("action", "description", "organization", "actor", "created_at")
    list_filter = ("action",)
    search_fields = ("description", "organization__name", "actor__username")
    readonly_fields = [f.name for f in AuditLog._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
