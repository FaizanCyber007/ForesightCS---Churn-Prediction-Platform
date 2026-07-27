from rest_framework import serializers

from contacts.models import Contact
from core.tenancy import resolve_write_organization


class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = ["id", "customer", "name", "role", "email", "phone", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate_customer(self, value):
        organization = resolve_write_organization(self.context["request"])
        if value.organization_id != organization.id:
            raise serializers.ValidationError("Customer does not belong to your organization.")
        return value
