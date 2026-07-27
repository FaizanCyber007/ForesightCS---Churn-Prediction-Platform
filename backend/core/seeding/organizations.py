"""Organization + SuperAdmin seeding."""

from django.conf import settings
from django.core.management import CommandError
from django.utils.text import slugify
from faker import Faker

from core.factories import OrganizationFactory
from core.models import CustomUser, Organization

fake = Faker()

DEFAULT_SUPERADMIN_USERNAME = "superadmin"


def seed_organizations(count: int) -> list[Organization]:
    """
    Create `count` Organizations sequentially (not bulk_create) so
    `created_at` strictly increases -- core.tenancy.resolve_organization
    scopes anonymous/unauthenticated requests to the *earliest-created*
    active Organization, so the first one created here becomes the tenant
    the frontend actually renders.
    """
    organizations = []
    for _ in range(count):
        name = fake.unique.company()
        organizations.append(
            OrganizationFactory.create(
                name=name,
                slug=slugify(name),
                is_active=True,
                subscription_status=Organization.SubscriptionStatus.ACTIVE,
                lemon_squeezy_customer_id=f"cus_{fake.uuid4()[:12]}",
            )
        )
    return organizations


def seed_superadmin() -> tuple[CustomUser, str]:
    """
    Create the single platform SuperAdmin (organization=None, per CLAUDE.md
    ##1 Super Admin Bypass). Requires `DJANGO_SUPERADMIN_PASSWORD` to be
    configured -- this command reseeds real (if disposable) production-scale
    data, so it must never fall back to a fixed, publicly-known password.
    """
    if not settings.SUPERADMIN_PASSWORD:
        raise CommandError(
            "DJANGO_SUPERADMIN_PASSWORD is not set -- refusing to seed a super admin "
            "with a fallback password. Set it in backend/.env before running this command."
        )
    username = settings.SUPERADMIN_USERNAME or DEFAULT_SUPERADMIN_USERNAME
    password = settings.SUPERADMIN_PASSWORD

    superadmin = CustomUser(
        username=username,
        email=f"{username}@foresightcs.com",
        first_name="Platform",
        last_name="Admin",
        is_superuser=True,
        is_staff=True,
        organization=None,
    )
    superadmin.set_password(password)
    superadmin.save()
    return superadmin, password
