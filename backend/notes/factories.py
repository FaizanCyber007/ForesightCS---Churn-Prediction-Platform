import factory

from customers.factories import CustomerFactory
from notes.models import CustomerNote


class CustomerNoteFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = CustomerNote

    organization = factory.SelfAttribute("customer.organization")
    customer = factory.SubFactory(CustomerFactory)
    author = None
    body = factory.Sequence(lambda n: f"Demo note {n}")
