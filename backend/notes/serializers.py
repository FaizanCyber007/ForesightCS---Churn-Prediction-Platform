from rest_framework import serializers

from core.tenancy import resolve_write_organization
from notes.models import CustomerNote


class CustomerNoteSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = CustomerNote
        fields = ["id", "customer", "body", "author_name", "created_at"]
        read_only_fields = ["id", "created_at"]

    def get_author_name(self, obj) -> str:
        if not obj.author:
            return "Unassigned"
        return obj.author.get_full_name() or obj.author.username

    def validate_customer(self, value):
        organization = resolve_write_organization(self.context["request"])
        if value.organization_id != organization.id:
            raise serializers.ValidationError("Customer does not belong to your organization.")
        return value
