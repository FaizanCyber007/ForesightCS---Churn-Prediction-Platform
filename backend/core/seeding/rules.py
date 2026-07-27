"""HealthRule seeding -- fixed, meaningful templates (not randomized, since
rule thresholds/weights encode real business logic) applied per Organization."""

from rules.factories import HealthRuleFactory
from rules.models import HealthRule

# (name, metric_type, threshold, weight) -- 5 templates x N organizations.
RULE_TEMPLATES = [
    ("Login drop watchlist", HealthRule.MetricType.LOGIN, 2, 15),
    ("Feature adoption stall", HealthRule.MetricType.FEATURE_USAGE, 1, 10),
    ("Support ticket spike", HealthRule.MetricType.SUPPORT_TICKET, 3, 20),
    ("Billing delinquency", HealthRule.MetricType.BILLING_ISSUE, 1, 30),
    ("NPS decline signal", HealthRule.MetricType.NPS_RESPONSE, 20, 15),
]


def seed_health_rules(organizations: list) -> list[HealthRule]:
    return [
        HealthRuleFactory.create(
            organization=organization,
            name=name,
            metric_type=metric_type,
            threshold=threshold,
            weight=weight,
            is_active=True,
        )
        for organization in organizations
        for name, metric_type, threshold, weight in RULE_TEMPLATES
    ]
