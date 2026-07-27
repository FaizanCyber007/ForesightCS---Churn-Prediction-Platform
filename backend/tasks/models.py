from django.core.exceptions import ValidationError
from django.db import models

from core.models import BaseModel, Organization
from customers.models import Customer


class Task(BaseModel):
    """A CS action item, either manually created or raised by an automated signal."""

    class Priority(models.TextChoices):
        LOW = "Low", "Low"
        MEDIUM = "Medium", "Medium"
        HIGH = "High", "High"
        CRITICAL = "Critical", "Critical"

    class Status(models.TextChoices):
        OPEN = "Open", "Open"
        IN_PROGRESS = "In Progress", "In Progress"
        COMPLETED = "Completed", "Completed"

    class TaskType(models.TextChoices):
        MANUAL = "Manual", "Manual"
        AUTOMATED_PLAYBOOK = "Automated Playbook", "Automated Playbook"
        SYSTEM_ALERT = "System Alert", "System Alert"

    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="tasks")
    customer = models.ForeignKey(
        Customer,
        on_delete=models.SET_NULL,
        related_name="tasks",
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    priority = models.CharField(max_length=20, choices=Priority.choices, db_index=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.OPEN, db_index=True
    )
    task_type = models.CharField(max_length=32, choices=TaskType.choices, default=TaskType.MANUAL)
    due_date = models.DateField()

    class Meta:
        ordering = ["due_date"]
        verbose_name = "Task"
        verbose_name_plural = "Tasks"

    def __str__(self):
        return self.title

    def clean(self):
        # Customer-organization invariant. Lives in `clean` (not `save`) so
        # the Django admin's ModelForm validation and any custom DRF
        # serializer that calls `instance.full_clean()` (e.g. via
        # `validate=True` or ModelSerializer.is_valid) surfaces the same
        # ValidationError as direct ORM writes -- the previous save-only
        # version was unreachable from admin form submission.
        super().clean()
        if self.customer_id and self.customer.organization_id != self.organization_id:
            raise ValidationError({"customer": "customer must belong to the task's organization."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
