import factory

from core.factories import OrganizationFactory
from playbooks.models import Playbook


class PlaybookFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Playbook

    organization = factory.SubFactory(OrganizationFactory)
    name = factory.Sequence(lambda n: f"Playbook {n}")
    description = "Demo playbook."
    trigger = "Churn probability > 65%"
    status = Playbook.Status.ACTIVE
    customers_in_play = 0
    last_triggered = None
    steps = factory.LazyFunction(lambda: ["Step one", "Step two"])
