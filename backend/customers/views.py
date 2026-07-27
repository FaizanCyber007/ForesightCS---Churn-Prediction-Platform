from django.db.models import Count, Max, Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status
from rest_framework.authentication import (
    BasicAuthentication,
    SessionAuthentication,
    TokenAuthentication,
)
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from core.authentication import CookieJWTAuthentication
from core.mixins import IdempotencyKeyMixin, TenantScopedViewSetMixin
from customers.filters import CustomerFilterSet
from customers.models import Customer, EventLog
from customers.serializers import CustomerDetailSerializer, CustomerSerializer
from customers.services import HealthScoreEngine


class CustomerViewSet(TenantScopedViewSetMixin, IdempotencyKeyMixin, ModelViewSet):
    queryset = Customer.objects.select_related("owner", "organization").annotate(
        support_tickets_count_annotated=Count(
            "events", filter=Q(events__event_type=EventLog.EventType.SUPPORT_TICKET)
        ),
        last_event_at_annotated=Max("events__occurred_at"),
    )
    permission_classes = [IsAuthenticated]
    # CookieJWTAuthentication is the primary path for real frontend users;
    # Basic/Session/Token remain so the seeded super-admin account can still
    # authenticate here too (same pattern as superadmin.views), and hit the
    # real is_superuser bypass in TenantScopedViewSetMixin instead of a
    # spoofable header.
    authentication_classes = [
        CookieJWTAuthentication,
        BasicAuthentication,
        SessionAuthentication,
        TokenAuthentication,
    ]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = CustomerFilterSet
    search_fields = ["name", "company_name"]
    ordering_fields = ["health_score", "mrr", "renewal_date", "created_at"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return CustomerDetailSerializer
        return CustomerSerializer

    @action(detail=True, methods=["post"], url_path="calculate")
    def calculate(self, request, pk=None):
        """
        Recalculate this Customer's health_score against their Organization's
        active HealthRules and EventLog telemetry (see services.HealthScoreEngine).
        """
        customer = self.get_object()
        updated = HealthScoreEngine(customer.organization).run(customer_ids=[customer.id])
        instance = updated[0] if updated else customer
        serializer = CustomerDetailSerializer(instance, context=self.get_serializer_context())
        return Response(serializer.data, status=status.HTTP_200_OK)
