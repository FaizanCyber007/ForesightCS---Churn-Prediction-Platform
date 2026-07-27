from django.core.exceptions import ValidationError
from django.db import models

from core.models import BaseModel, CustomUser, Organization
from customers.models import Customer


class CustomerNote(BaseModel):
    """A free-text CS note logged against a Customer, shown on Customer 360."""

    organization = models.ForeignKey(
        Organization, on_delete=models.PROTECT, related_name="customer_notes"
    )
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="notes")
    author = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        related_name="customer_notes",
        null=True,
        blank=True,
    )
    body = models.TextField()

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Customer note"
        verbose_name_plural = "Customer notes"

    def __str__(self):
        return f"Note on {self.customer.company_name} @ {self.created_at:%Y-%m-%d}"

    def save(self, *args, **kwargs):
        if self.customer_id:
            if self.organization_id is None:
                self.organization_id = self.customer.organization_id
            elif self.organization_id != self.customer.organization_id:
                raise ValidationError(
                    {"organization": "organization must match the related customer's organization."}
                )
        super().save(*args, **kwargs)
