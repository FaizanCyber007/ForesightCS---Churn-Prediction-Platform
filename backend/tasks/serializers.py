from rest_framework import serializers

from core.tenancy import resolve_write_organization
from customers.models import Customer
from tasks.models import Task


class TaskSerializer(serializers.ModelSerializer):
    type = serializers.ChoiceField(source="task_type", choices=Task.TaskType.choices)
    customer = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.select_related("organization"),
        required=False,
        allow_null=True,
    )
    related_customer = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "description",
            "priority",
            "status",
            "due_date",
            "customer",
            "type",
            "related_customer",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_related_customer(self, obj) -> str | None:
        return obj.customer.company_name if obj.customer else None

    def validate_customer(self, value):
        if value is None:
            return value

        request = self.context.get("request")
        organization = resolve_write_organization(request) if request is not None else None
        if organization is not None and value.organization_id != organization.id:
            raise serializers.ValidationError("Customer must belong to the task's organization.")
        return value
