import django_filters

from customers.models import Customer

HEALTH_SCORE_RANGES = {
    "Healthy": (71, 100),
    "At-Risk": (41, 70),
    "Critical": (0, 40),
}


class CustomerFilterSet(django_filters.FilterSet):
    health = django_filters.ChoiceFilter(
        choices=[(key, key) for key in HEALTH_SCORE_RANGES],
        method="filter_health",
        label="Health tier",
    )
    min_mrr = django_filters.NumberFilter(field_name="mrr", lookup_expr="gte")
    max_mrr = django_filters.NumberFilter(field_name="mrr", lookup_expr="lte")
    renewal_before = django_filters.DateFilter(field_name="renewal_date", lookup_expr="lte")
    renewal_after = django_filters.DateFilter(field_name="renewal_date", lookup_expr="gte")

    class Meta:
        model = Customer
        fields = [
            "segment",
            "plan",
            "health",
            "min_mrr",
            "max_mrr",
            "renewal_before",
            "renewal_after",
        ]

    def filter_health(self, queryset, name, value):
        low, high = HEALTH_SCORE_RANGES[value]
        return queryset.filter(health_score__gte=low, health_score__lte=high)
