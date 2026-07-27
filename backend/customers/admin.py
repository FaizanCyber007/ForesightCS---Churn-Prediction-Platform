from django.contrib import admin
from django.core.exceptions import ValidationError

from core.models import Organization
from customers.models import Customer, EventLog


class OrganizationListFilter(admin.SimpleListFilter):
    title = "organization"
    parameter_name = "organization"

    def lookups(self, request, model_admin):
        if request.user.is_superuser:
            return [(str(org.id), org.name) for org in Organization.objects.all()]
        if request.user.organization_id:
            return [(str(request.user.organization_id), request.user.organization)]
        return []

    def queryset(self, request, queryset):
        selected_organization = self.value()
        if selected_organization:
            return queryset.filter(organization_id=selected_organization)
        return queryset


class TenantScopedAdmin(admin.ModelAdmin):
    """Restricts non-superuser staff to records in their own Organization."""

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        if request.user.is_superuser:
            return queryset
        return queryset.filter(organization=request.user.organization)

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if request.user.is_superuser:
            return super().formfield_for_foreignkey(db_field, request, **kwargs)
        if db_field.name == "organization":
            kwargs["queryset"] = Organization.objects.filter(id=request.user.organization_id)
        elif db_field.name == "customer":
            kwargs["queryset"] = Customer.objects.filter(organization=request.user.organization)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    def save_model(self, request, obj, form, change):
        if not request.user.is_superuser:
            obj.organization = request.user.organization
        super().save_model(request, obj, form, change)


@admin.register(Customer)
class CustomerAdmin(TenantScopedAdmin):
    list_display = (
        "company_name",
        "organization",
        "segment",
        "plan",
        "health_score",
        "mrr",
        "renewal_date",
    )
    list_filter = (OrganizationListFilter, "segment", "plan")
    search_fields = ("company_name", "name")


@admin.register(EventLog)
class EventLogAdmin(TenantScopedAdmin):
    list_display = ("customer", "event_type", "occurred_at", "organization")
    list_filter = (OrganizationListFilter, "event_type")
    search_fields = ("customer__company_name", "description")

    def save_model(self, request, obj, form, change):
        if not request.user.is_superuser and obj.customer_id:
            if obj.customer.organization_id != request.user.organization_id:
                raise ValidationError(
                    {"customer": "Customer must belong to the requesting user's organization."}
                )
        super().save_model(request, obj, form, change)
