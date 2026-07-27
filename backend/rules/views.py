from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from core.audit import log_action
from core.mixins import IdempotencyKeyMixin, TenantScopedViewSetMixin
from core.models import AuditLog
from rules.models import HealthRule
from rules.serializers import HealthRuleSerializer


class HealthRuleViewSet(TenantScopedViewSetMixin, IdempotencyKeyMixin, ModelViewSet):
    queryset = HealthRule.objects.select_related("organization")
    serializer_class = HealthRuleSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["name"]
    ordering_fields = ["weight", "threshold", "created_at"]
    ordering = ["-created_at"]

    def perform_create(self, serializer):
        super().perform_create(serializer)
        rule = serializer.instance
        log_action(
            action=AuditLog.Action.RULE_CREATED,
            description=f"User {self.request.user.username} created rule '{rule.name}'.",
            organization=rule.organization,
            actor=self.request.user,
        )

    def perform_update(self, serializer):
        super().perform_update(serializer)
        rule = serializer.instance
        log_action(
            action=AuditLog.Action.RULE_UPDATED,
            description=f"User {self.request.user.username} updated rule '{rule.name}'.",
            organization=rule.organization,
            actor=self.request.user,
        )

    @action(detail=False, methods=["get"], url_path="metric-types")
    def metric_types(self, request):
        """
        Available HealthRule metric types, sourced from the model's own
        choices so the frontend never hardcodes this dropdown.
        """
        return Response(
            [{"value": value, "label": label} for value, label in HealthRule.MetricType.choices]
        )
