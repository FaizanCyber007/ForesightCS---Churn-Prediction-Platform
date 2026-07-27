import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from core.factories import CustomUserFactory, OrganizationFactory
from playbooks.factories import PlaybookFactory
from playbooks.models import Playbook

pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    return APIClient()


def _authenticate_as_member_of(api_client, organization):
    user = CustomUserFactory(organization=organization)
    api_client.force_authenticate(user=user)
    return user


def test_anonymous_request_is_rejected(api_client):
    OrganizationFactory()

    response = api_client.get(reverse("playbook-list"))

    assert response.status_code == 401


def test_list_only_returns_playbooks_from_the_authenticated_users_organization(api_client):
    org_a = OrganizationFactory()
    org_b = OrganizationFactory()
    PlaybookFactory.create_batch(2, organization=org_a)
    PlaybookFactory.create_batch(3, organization=org_b)
    _authenticate_as_member_of(api_client, org_a)

    response = api_client.get(reverse("playbook-list"))

    assert response.status_code == 200
    returned_ids = {row["id"] for row in response.data["results"]}
    expected_ids = {str(p.id) for p in org_a.playbooks.all()}
    assert returned_ids == expected_ids
    assert len(returned_ids) == 2


def test_superuser_sees_playbooks_across_all_organizations(api_client):
    org_a = OrganizationFactory()
    org_b = OrganizationFactory()
    PlaybookFactory.create_batch(2, organization=org_a)
    PlaybookFactory.create_batch(3, organization=org_b)
    superuser = CustomUserFactory(is_superuser=True, organization=None)

    api_client.force_authenticate(user=superuser)
    response = api_client.get(reverse("playbook-list"), {"page_size": 200})

    assert response.status_code == 200
    assert response.data["count"] == 5


def test_list_reflects_customers_in_play_set_via_factory(api_client):
    org = OrganizationFactory()
    PlaybookFactory(organization=org, customers_in_play=7)
    _authenticate_as_member_of(api_client, org)

    response = api_client.get(reverse("playbook-list"))

    assert response.status_code == 200
    assert response.data["results"][0]["customers_in_play"] == 7


def test_create_playbook_stamps_the_authenticated_users_organization(api_client):
    org = OrganizationFactory()
    _authenticate_as_member_of(api_client, org)
    payload = {
        "name": "90-Day Renewal Prep",
        "description": "Prep for upcoming renewal.",
        "trigger": "Renewal date in 90 days",
        "status": Playbook.Status.ACTIVE,
        "steps": ["Check usage", "Schedule call"],
    }

    response = api_client.post(reverse("playbook-list"), payload, format="json")

    assert response.status_code == 201
    created = Playbook.objects.get(id=response.data["id"])
    assert created.organization_id == org.id
    assert created.steps == ["Check usage", "Schedule call"]


def test_soft_deleted_playbook_is_not_retrievable(api_client):
    playbook = PlaybookFactory()
    _authenticate_as_member_of(api_client, playbook.organization)
    playbook.delete()

    response = api_client.get(reverse("playbook-detail", args=[playbook.id]))

    assert response.status_code == 404
