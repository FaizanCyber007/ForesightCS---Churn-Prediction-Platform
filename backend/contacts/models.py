from django.core.exceptions import ValidationError
from django.db import models

from core.models import BaseModel, Organization
from customers.models import Customer


class Contact(BaseModel):
    """A stakeholder at a Customer's company, shown on Customer 360."""

    organization = models.ForeignKey(
        Organization, on_delete=models.PROTECT, related_name="contacts"
    )
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="contacts")
    name = models.CharField(max_length=255)
    role = models.CharField(max_length=255, blank=True, default="")
    email = models.EmailField()
    phone = models.CharField(max_length=32, blank=True, default="")

    class Meta:
        ordering = ["name"]
        verbose_name = "Contact"
        verbose_name_plural = "Contacts"

    def __str__(self):
        return f"{self.name} ({self.customer.company_name})"

    def save(self, *args, **kwargs):
        if self.customer_id:
            if self.organization_id is None:
                self.organization_id = self.customer.organization_id
            elif self.organization_id != self.customer.organization_id:
                raise ValidationError(
                    {"organization": "organization must match the related customer's organization."}
                )
        super().save(*args, **kwargs)
