from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from core.models import BaseModel, CustomUser, Organization


class Customer(BaseModel):
    """A tenant's end customer, tracked for churn risk."""

    class Segment(models.TextChoices):
        SMB = "SMB", "SMB"
        MID_MARKET = "Mid-Market", "Mid-Market"
        EXPANSION = "Expansion", "Expansion"

    class Plan(models.TextChoices):
        STARTER = "Starter", "Starter"
        GROWTH = "Growth", "Growth"
        SCALE = "Scale", "Scale"
        ENTERPRISE = "Enterprise", "Enterprise"

    HEALTHY = "Healthy"
    AT_RISK = "At-Risk"
    CRITICAL = "Critical"

    organization = models.ForeignKey(
        Organization, on_delete=models.PROTECT, related_name="customers"
    )
    name = models.CharField(max_length=255, help_text="Primary contact person's name.")
    company_name = models.CharField(max_length=255)
    owner = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        related_name="owned_customers",
        null=True,
        blank=True,
        help_text="CS team member who owns this customer.",
    )
    segment = models.CharField(max_length=20, choices=Segment.choices)
    plan = models.CharField(max_length=20, choices=Plan.choices)
    health_score = models.PositiveSmallIntegerField(
        default=100,
        validators=[MaxValueValidator(100)],
        help_text="0-100. Tiers: 71-100 Healthy, 41-70 At Risk, 0-40 Critical.",
    )
    mrr = models.DecimalField(
        max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(0)]
    )
    annual_contract_value = models.DecimalField(
        max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(0)]
    )
    renewal_date = models.DateField()
    nps = models.SmallIntegerField(
        default=0,
        validators=[MinValueValidator(-100), MaxValueValidator(100)],
    )
    expansion_potential = models.PositiveSmallIntegerField(
        default=0, validators=[MaxValueValidator(100)]
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "company_name"],
                condition=models.Q(deleted_at__isnull=True),
                name="unique_active_company_name_per_org",
            ),
            # Composite-unique target for EventLog's DB-level FK trigger (see
            # customers/migrations -- Postgres has no native cross-table CHECK,
            # so this + a BEFORE INSERT/UPDATE trigger enforce that an
            # EventLog's organization can never diverge from its customer's,
            # even for writes that bypass EventLog.save(), e.g. bulk_create).
            models.UniqueConstraint(
                fields=["id", "organization"], name="unique_customer_id_organization"
            ),
        ]

    def __str__(self):
        return self.company_name

    @property
    def health(self) -> str:
        if self.health_score >= 71:
            return self.HEALTHY
        if self.health_score >= 41:
            return self.AT_RISK
        return self.CRITICAL

    @property
    def churn_probability(self) -> int:
        return 100 - self.health_score


class EventLog(BaseModel):
    """Telemetry event ingested for a customer, driving the health signal feed."""

    class EventType(models.TextChoices):
        LOGIN = "login", "Login"
        FEATURE_USAGE = "feature_usage", "Feature usage"
        SUPPORT_TICKET = "support_ticket", "Support ticket"
        BILLING_ISSUE = "billing_issue", "Billing issue"
        NPS_RESPONSE = "nps_response", "NPS response"
        CONTRACT_SIGNAL = "contract_signal", "Contract signal"

    CATEGORY_BY_EVENT_TYPE = {
        EventType.LOGIN: "product",
        EventType.FEATURE_USAGE: "product",
        EventType.SUPPORT_TICKET: "support",
        EventType.BILLING_ISSUE: "billing",
        EventType.NPS_RESPONSE: "signal",
        EventType.CONTRACT_SIGNAL: "signal",
    }

    organization = models.ForeignKey(
        Organization, on_delete=models.PROTECT, related_name="event_logs"
    )
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="events")
    event_type = models.CharField(max_length=32, choices=EventType.choices)
    description = models.CharField(max_length=255)
    occurred_at = models.DateTimeField()
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-occurred_at"]

    def __str__(self):
        return f"{self.customer.company_name} · {self.event_type} @ {self.occurred_at:%Y-%m-%d}"

    def save(self, *args, **kwargs):
        if self.customer_id:
            if self.organization_id is None:
                self.organization_id = self.customer.organization_id
            elif self.organization_id != self.customer.organization_id:
                raise ValidationError(
                    {"organization": "organization must match the related customer's organization."}
                )
        super().save(*args, **kwargs)

    @property
    def category(self) -> str:
        return self.CATEGORY_BY_EVENT_TYPE.get(self.event_type, "signal")
