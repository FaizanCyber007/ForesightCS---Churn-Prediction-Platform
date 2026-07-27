from django.core.validators import MaxValueValidator, MinValueValidator
from rest_framework import serializers

from rules.models import HealthRule


class HealthRuleSerializer(serializers.ModelSerializer):
    metric_type_display = serializers.CharField(source="get_metric_type_display", read_only=True)
    weight = serializers.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(100)],
        help_text="Must be greater than 0 and no more than 100.",
    )

    class Meta:
        model = HealthRule
        fields = [
            "id",
            "name",
            "metric_type",
            "metric_type_display",
            "threshold",
            "weight",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_threshold(self, value):
        if value < 0:
            raise serializers.ValidationError("Threshold must be zero or greater.")
        return value
