from django.core.validators import MaxValueValidator, MinLengthValidator, MinValueValidator
from django.db import models

from core.models import BaseModel, Organization


class HealthRule(BaseModel):
    """
    A weighted condition an Organization's churn Scoring Engine evaluates
    against a Customer's EventLog telemetry (see CLAUDE.md ## Churn Scoring
    Engine). When a Customer violates the rule, `weight` is subtracted from
    their health score.
    """

    class MetricType(models.TextChoices):
        LOGIN = "login", "Login frequency"
        FEATURE_USAGE = "feature_usage", "Feature usage"
        SUPPORT_TICKET = "support_ticket", "Support ticket volume"
        BILLING_ISSUE = "billing_issue", "Billing issue"
        NPS_RESPONSE = "nps_response", "NPS response"
        CONTRACT_SIGNAL = "contract_signal", "Contract signal"

    organization = models.ForeignKey(
        Organization, on_delete=models.PROTECT, related_name="health_rules"
    )
    name = models.CharField(max_length=255, validators=[MinLengthValidator(3)])
    metric_type = models.CharField(max_length=32, choices=MetricType.choices)
    threshold = models.DecimalField(
        max_digits=10, decimal_places=2, validators=[MinValueValidator(0)]
    )
    weight = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(100)],
        help_text="Points subtracted from a customer's health score when this rule is violated.",
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "name"],
                condition=models.Q(deleted_at__isnull=True),
                name="unique_active_health_rule_name_per_org",
            )
        ]
        verbose_name = "Health rule"
        verbose_name_plural = "Health rules"

    def __str__(self):
        return f"{self.name} ({self.get_metric_type_display()})"
