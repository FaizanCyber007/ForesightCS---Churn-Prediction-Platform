import factory

from core.factories import OrganizationFactory
from rules.models import HealthRule


class HealthRuleFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = HealthRule

    organization = factory.SubFactory(OrganizationFactory)
    name = factory.Sequence(lambda n: f"Health rule {n}")
    metric_type = HealthRule.MetricType.LOGIN
    threshold = 25
    weight = 10
    is_active = True
