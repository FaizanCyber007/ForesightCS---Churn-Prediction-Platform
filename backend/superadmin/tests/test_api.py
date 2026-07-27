import base64

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from core.factories import CustomUserFactory, OrganizationFactory
from core.models import AuditLog, Organization
from customers.factories import CustomerFactory

pytestmark = pytest.mark.django_db


def _basic_auth_header(username: str, password: str) -> str:
    credentials = base64.b64encode(f"{username}:{password}".encode()).decode()
    return f"Basic {credentials}"


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def superuser():
    return CustomUserFactory(is_superuser=True, organization=None)


def test_anonymous_request_is_rejected(api_client):
    OrganizationFactory()

    response = api_client.get(reverse("admin-organization-list"))

    assert response.status_code == 401


def test_non_superuser_is_forbidden(api_client):
    org = OrganizationFactory()
    user = CustomUserFactory(organization=org)
    api_client.force_authenticate(user=user)

    response = api_client.get(reverse("admin-organization-list"))

    assert response.status_code == 403


def test_superuser_lists_every_organization_with_counts(api_client, superuser):
    org_a = OrganizationFactory()
    org_b = OrganizationFactory()
    # owner=None avoids CustomerFactory's default owner SubFactory chain
    # (CustomUserFactory -> its own SubFactory'd Organization) spawning
    # extra, unrelated tenants that would pollute this cross-tenant listing.
    CustomerFactory.create_batch(2, organization=org_a, owner=None)
    api_client.force_authenticate(user=superuser)

    response = api_client.get(reverse("admin-organization-list"))

    assert response.status_code == 200
    returned_ids = {row["id"] for row in response.data["results"]}
    assert returned_ids == {str(org_a.id), str(org_b.id)}
    row_a = next(row for row in response.data["results"] if row["id"] == str(org_a.id))
    assert row_a["customer_count"] == 2
    assert row_a["subscription_status"] == Organization.SubscriptionStatus.ACTIVE


def test_suspend_action_sets_subscription_status(api_client, superuser):
    org = OrganizationFactory(subscription_status=Organization.SubscriptionStatus.ACTIVE)
    api_client.force_authenticate(user=superuser)

    response = api_client.post(reverse("admin-organization-suspend", args=[org.id]))

    assert response.status_code == 200
    assert response.data["subscription_status"] == Organization.SubscriptionStatus.SUSPENDED
    org.refresh_from_db()
    assert org.subscription_status == Organization.SubscriptionStatus.SUSPENDED
    entry = AuditLog.objects.get(action=AuditLog.Action.ORG_SUSPENDED)
    assert entry.organization_id == org.id
    assert entry.actor_id == superuser.id


def test_suspend_action_requires_superuser(api_client):
    org = OrganizationFactory()
    user = CustomUserFactory(organization=org)
    api_client.force_authenticate(user=user)

    response = api_client.post(reverse("admin-organization-suspend", args=[org.id]))

    assert response.status_code == 403
    org.refresh_from_db()
    assert org.subscription_status == Organization.SubscriptionStatus.ACTIVE


def test_reactivate_action_sets_subscription_status(api_client, superuser):
    org = OrganizationFactory(subscription_status=Organization.SubscriptionStatus.SUSPENDED)
    api_client.force_authenticate(user=superuser)

    response = api_client.post(reverse("admin-organization-reactivate", args=[org.id]))

    assert response.status_code == 200
    assert response.data["subscription_status"] == Organization.SubscriptionStatus.ACTIVE
    org.refresh_from_db()
    assert org.subscription_status == Organization.SubscriptionStatus.ACTIVE
    entry = AuditLog.objects.get(action=AuditLog.Action.ORG_REACTIVATED)
    assert entry.organization_id == org.id
    assert entry.actor_id == superuser.id


def test_reactivate_action_requires_superuser(api_client):
    org = OrganizationFactory(subscription_status=Organization.SubscriptionStatus.SUSPENDED)
    user = CustomUserFactory(organization=org)
    api_client.force_authenticate(user=user)

    response = api_client.post(reverse("admin-organization-reactivate", args=[org.id]))

    assert response.status_code == 403
    org.refresh_from_db()
    assert org.subscription_status == Organization.SubscriptionStatus.SUSPENDED


def test_customers_action_lists_only_that_organizations_customers(api_client, superuser):
    org_a = OrganizationFactory()
    org_b = OrganizationFactory()
    CustomerFactory.create_batch(2, organization=org_a, owner=None)
    CustomerFactory.create_batch(3, organization=org_b, owner=None)
    api_client.force_authenticate(user=superuser)

    response = api_client.get(reverse("admin-organization-customers", args=[org_a.id]))

    assert response.status_code == 200
    assert response.data["count"] == 2


def test_customers_action_requires_superuser(api_client):
    org = OrganizationFactory()
    user = CustomUserFactory(organization=org)
    api_client.force_authenticate(user=user)

    response = api_client.get(reverse("admin-organization-customers", args=[org.id]))

    assert response.status_code == 403


def test_basic_auth_grants_access_for_seeded_superadmin(api_client):
    """
    Exercises the real (non force_authenticate) auth path the Next.js
    server uses in dev -- see frontend/services/admin.ts -- since that's
    the one everything else in these tests bypasses.
    """
    OrganizationFactory()
    superuser = CustomUserFactory(is_superuser=True, organization=None)
    superuser.set_password("correct-horse-battery-staple")
    superuser.save()

    response = api_client.get(
        reverse("admin-organization-list"),
        HTTP_AUTHORIZATION=_basic_auth_header(superuser.username, "correct-horse-battery-staple"),
    )

    assert response.status_code == 200


def test_basic_auth_with_wrong_password_is_rejected(api_client):
    superuser = CustomUserFactory(is_superuser=True, organization=None)
    superuser.set_password("correct-horse-battery-staple")
    superuser.save()

    response = api_client.get(
        reverse("admin-organization-list"),
        HTTP_AUTHORIZATION=_basic_auth_header(superuser.username, "wrong-password"),
    )

    assert response.status_code == 401


class TestAuditLogList:
    def test_anonymous_request_is_rejected(self, api_client):
        response = api_client.get(reverse("admin-audit-log-list"))

        assert response.status_code == 401

    def test_non_superuser_is_forbidden(self, api_client):
        org = OrganizationFactory()
        user = CustomUserFactory(organization=org)
        api_client.force_authenticate(user=user)

        response = api_client.get(reverse("admin-audit-log-list"))

        assert response.status_code == 403

    def test_superuser_sees_entries_across_every_organization(self, api_client, superuser):
        org = OrganizationFactory()
        api_client.force_authenticate(user=superuser)
        api_client.post(reverse("admin-organization-suspend", args=[org.id]))

        response = api_client.get(reverse("admin-audit-log-list"))

        assert response.status_code == 200
        assert response.data["count"] == 1
        entry = response.data["results"][0]
        assert entry["action"] == AuditLog.Action.ORG_SUSPENDED
        assert entry["actor_username"] == superuser.username
        assert entry["organization_name"] == org.name

    def test_endpoint_is_read_only(self, api_client, superuser):
        api_client.force_authenticate(user=superuser)

        response = api_client.post(reverse("admin-audit-log-list"), {}, format="json")

        assert response.status_code == 405
