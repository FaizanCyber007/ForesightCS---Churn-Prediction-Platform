from django.db.models import Count
from rest_framework.authentication import (
    BasicAuthentication,
    SessionAuthentication,
    TokenAuthentication,
)
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response
from rest_framework.viewsets import ReadOnlyModelViewSet

from billing.services import reactivate_organization, suspend_organization
from core.authentication import CookieJWTAuthentication
from core.models import AuditLog, Organization
from core.permissions import IsSuperUser
from customers.models import Customer
from customers.serializers import CustomerSerializer
from superadmin.serializers import AuditLogSerializer, OrganizationAdminSerializer


class OrganizationAdminViewSet(ReadOnlyModelViewSet):
    """
    Cross-tenant Organization directory for platform superusers.

    Deliberately does NOT go through `core.tenancy.resolve_organization` --
    that helper scopes to *one* tenant, while this is the one surface in the
    platform meant to see every tenant at once (CLAUDE.md ##1 Super Admin
    Bypass), gated by `IsSuperUser` instead of query scoping.

    Adds `BasicAuthentication` on top of the project defaults so the Next.js
    server can call this endpoint as the seeded super-admin account (see
    `customers.management.commands.seed_demo_data` and frontend/services/admin.ts)
    without a full session/JWT login flow. `CookieJWTAuthentication` is also
    included so a superuser who *did* log in through the HttpOnly-cookie
    flow can hit this endpoint directly too. Scoped to this viewset only,
    not project-wide.
    """

    authentication_classes = [
        CookieJWTAuthentication,
        BasicAuthentication,
        SessionAuthentication,
        TokenAuthentication,
    ]
    permission_classes = [IsSuperUser]
    serializer_class = OrganizationAdminSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["name", "slug"]
    ordering_fields = ["name", "created_at", "subscription_status"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return Organization.objects.annotate(
            customer_count=Count("customers", distinct=True),
            user_count=Count("users", distinct=True),
        )

    @action(detail=True, methods=["post"], url_path="suspend")
    def suspend(self, request, pk=None):
        """Manual override mirroring the Lemon Squeezy `subscription_payment_failed` handler."""
        organization = suspend_organization(self.get_object(), actor=request.user)
        serializer = self.get_serializer(organization)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="reactivate")
    def reactivate(self, request, pk=None):
        """Manual override that reverses `suspend` (billing.services.reactivate_organization)."""
        organization = reactivate_organization(self.get_object(), actor=request.user)
        serializer = self.get_serializer(organization)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="customers")
    def customers(self, request, pk=None):
        """
        Cross-tenant drill-down: every Customer belonging to one Organization,
        for the Super Admin hub's "View Customers by Organization" filter.
        Deliberately bypasses TenantScopedViewSetMixin like the rest of this
        viewset -- gated by IsSuperUser only, per docs/architecture.md ##1's
        Super Admin Bypass.
        """
        organization = self.get_object()
        queryset = (
            Customer.objects.filter(organization=organization)
            .select_related("owner")
            .order_by("-created_at")
        )
        page = self.paginate_queryset(queryset)
        serializer = CustomerSerializer(page, many=True)
        return self.get_paginated_response(serializer.data)


class AuditLogViewSet(ReadOnlyModelViewSet):
    """
    Read-only, cross-tenant SOC2-style audit trail for platform superusers
    (see core.audit.log_action -- the only writer). Same auth/permission
    posture as OrganizationAdminViewSet: gated by IsSuperUser, not query
    scoping, since this is deliberately a whole-platform view.
    """

    authentication_classes = [
        CookieJWTAuthentication,
        BasicAuthentication,
        SessionAuthentication,
        TokenAuthentication,
    ]
    permission_classes = [IsSuperUser]
    serializer_class = AuditLogSerializer
    queryset = AuditLog.objects.select_related("organization", "actor")
    filter_backends = [OrderingFilter]
    ordering_fields = ["created_at", "action"]
    ordering = ["-created_at"]
