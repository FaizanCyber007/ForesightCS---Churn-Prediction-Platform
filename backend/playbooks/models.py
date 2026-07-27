from django.db import models

from core.models import BaseModel, Organization


class Playbook(BaseModel):
    """
    An automated retention play triggered by a churn signal condition.

    `customers_in_play`/`last_triggered` are stored fields, not live-computed
    from `trigger` -- mapping a free-text trigger condition to a real
    customer-matching query engine is a separate rules-engine feature.
    """

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"

    organization = models.ForeignKey(
        Organization, on_delete=models.PROTECT, related_name="playbooks"
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    trigger = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    customers_in_play = models.PositiveIntegerField(default=0)
    last_triggered = models.DateTimeField(null=True, blank=True)
    steps = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "name"],
                condition=models.Q(deleted_at__isnull=True),
                name="unique_active_playbook_name_per_org",
            )
        ]
        verbose_name = "Playbook"
        verbose_name_plural = "Playbooks"

    def __str__(self):
        return self.name
