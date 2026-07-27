import factory

from contacts.models import Contact
from customers.factories import CustomerFactory


class ContactFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Contact

    organization = factory.SelfAttribute("customer.organization")
    customer = factory.SubFactory(CustomerFactory)
    name = factory.Sequence(lambda n: f"Contact {n}")
    role = "Stakeholder"
    email = factory.Sequence(lambda n: f"contact{n}@example.com")
    phone = ""
