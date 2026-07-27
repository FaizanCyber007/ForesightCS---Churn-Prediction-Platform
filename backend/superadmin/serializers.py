from rest_framework import serializers

from core.models import AuditLog, Organization


class AuditLogSerializer(serializers.ModelSerializer):
    action_display = serializers.CharField(source="get_action_display", read_only=True)
    actor_username = serializers.CharField(source="actor.username", read_only=True, default=None)
    organization_name = serializers.CharField(
        source="organization.name", read_only=True, default=None
    )

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "action",
            "action_display",
            "description",
            "actor_username",
            "organization_name",
            "metadata",
            "created_at",
        ]
        read_only_fields = fields


class OrganizationAdminSerializer(serializers.ModelSerializer):
    subscription_status_display = serializers.CharField(
        source="get_subscription_status_display", read_only=True
    )
    customer_count = serializers.IntegerField(read_only=True)
    user_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Organization
        fields = [
            "id",
            "name",
            "slug",
            "is_active",
            "subscription_status",
            "subscription_status_display",
            "customer_count",
            "user_count",
            "created_at",
        ]
        read_only_fields = fields
