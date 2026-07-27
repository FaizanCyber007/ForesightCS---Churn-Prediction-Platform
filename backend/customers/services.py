"""
HealthScoreEngine -- the churn-scoring business logic described in
CLAUDE.md ## The Churn Scoring Engine.

Kept out of views/serializers (CLAUDE.md ## Engineering Constraints): DRF
layers stay thin and only orchestrate calls into this module.
"""

from __future__ import annotations

from decimal import Decimal

from django.db.models import Count, Q
from django.utils import timezone

from customers.models import Customer
from rules.models import HealthRule

# Rolling window telemetry is evaluated over -- a customer's EventLog volume
# is judged against recent behavior, not their all-time history.
EVALUATION_WINDOW_DAYS = 30

BASE_SCORE = 100
MIN_SCORE = 0
MAX_SCORE = 100

# Metric types where a *low* EventLog count signals disengagement (too few
# logins/feature touches) -- violated when count < threshold.
LOW_VOLUME_METRICS = {
    HealthRule.MetricType.LOGIN,
    HealthRule.MetricType.FEATURE_USAGE,
}

# Metric types where a *high* EventLog count signals rising risk (support,
# billing, or contract friction piling up) -- violated when count >= threshold.
HIGH_VOLUME_METRICS = {
    HealthRule.MetricType.SUPPORT_TICKET,
    HealthRule.MetricType.BILLING_ISSUE,
    HealthRule.MetricType.CONTRACT_SIGNAL,
}


class HealthScoreEngine:
    """
    Evaluates an Organization's active HealthRules against each Customer's
    telemetry and persists the resulting `health_score`.

        HealthScoreEngine(organization).run()                   # whole org
        HealthScoreEngine(organization).run(customer_ids=[pk])  # one customer
    """

    def __init__(self, organization, window_days: int = EVALUATION_WINDOW_DAYS):
        self.organization = organization
        self.window_start = timezone.now() - timezone.timedelta(days=window_days)

    def run(self, customer_ids: list | None = None) -> list[Customer]:
        now = timezone.now()
        rules = list(HealthRule.objects.filter(organization=self.organization, is_active=True))
        customers = self._load_customers(rules, customer_ids)
        if not rules or not customers:
            return customers

        to_persist = []
        for customer in customers:
            new_score = self._evaluate(customer, rules)
            if new_score != customer.health_score:
                customer.health_score = new_score
                customer.updated_at = now
                to_persist.append(customer)

        if to_persist:
            Customer.objects.bulk_update(to_persist, ["health_score", "updated_at"])

        return customers

    def _load_customers(self, rules: list[HealthRule], customer_ids) -> list[Customer]:
        queryset = Customer.objects.filter(organization=self.organization)
        if customer_ids is not None:
            queryset = queryset.filter(id__in=customer_ids)

        # Annotate one Count per distinct metric type an active rule actually
        # references -- a single aggregate query regardless of customer
        # count, avoiding N+1 lookups into EventLog per customer.
        exclude = HealthRule.MetricType.NPS_RESPONSE
        metric_types = {rule.metric_type for rule in rules if rule.metric_type != exclude}
        for metric_type in metric_types:
            queryset = queryset.annotate(
                **{
                    self._count_field(metric_type): Count(
                        "events",
                        filter=Q(
                            events__event_type=metric_type,
                            events__occurred_at__gte=self.window_start,
                        ),
                    )
                }
            )
        return list(queryset)

    @staticmethod
    def _count_field(metric_type: str) -> str:
        return f"event_count_{metric_type}"

    def _evaluate(self, customer: Customer, rules: list[HealthRule]) -> int:
        score = BASE_SCORE
        for rule in rules:
            if self._is_violated(customer, rule):
                score -= rule.weight
        return max(MIN_SCORE, min(MAX_SCORE, score))

    def _is_violated(self, customer: Customer, rule: HealthRule) -> bool:
        if rule.metric_type == HealthRule.MetricType.NPS_RESPONSE:
            return Decimal(customer.nps) < rule.threshold

        count = getattr(customer, self._count_field(rule.metric_type), 0)
        if rule.metric_type in LOW_VOLUME_METRICS:
            return Decimal(count) < rule.threshold
        return Decimal(count) >= rule.threshold
