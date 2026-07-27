import factory

from core.models import CustomUser, Organization


class OrganizationFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Organization
        django_get_or_create = ("slug",)

    name = factory.Sequence(lambda n: f"Organization {n}")
    slug = factory.Sequence(lambda n: f"organization-{n}")
    is_active = True


class CustomUserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = CustomUser
        django_get_or_create = ("username",)

    username = factory.Sequence(lambda n: f"user{n}")
    email = factory.Sequence(lambda n: f"user{n}@foresightcs.com")
    organization = factory.SubFactory(OrganizationFactory)
