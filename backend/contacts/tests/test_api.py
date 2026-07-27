import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from contacts.factories import ContactFactory
from contacts.models import Contact
from core.factories import CustomUserFactory, OrganizationFactory
from customers.factories import CustomerFactory

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

    response = api_client.get(reverse("contact-list"))

    assert response.status_code == 401


def test_list_only_returns_contacts_from_the_authenticated_users_organization(api_client):
    org_a = OrganizationFactory()
    org_b = OrganizationFactory()
    customer_a = CustomerFactory(organization=org_a)
    customer_b = CustomerFactory(organization=org_b)
    ContactFactory.create_batch(2, customer=customer_a)
    ContactFactory.create_batch(3, customer=customer_b)
    _authenticate_as_member_of(api_client, org_a)

    response = api_client.get(reverse("contact-list"))

    assert response.status_code == 200
    returned_ids = {row["id"] for row in response.data["results"]}
    expected_ids = {str(c.id) for c in org_a.contacts.all()}
    assert returned_ids == expected_ids
    assert len(returned_ids) == 2


def test_superuser_sees_contacts_across_all_organizations(api_client):
    org_a = OrganizationFactory()
    org_b = OrganizationFactory()
    customer_a = CustomerFactory(organization=org_a)
    customer_b = CustomerFactory(organization=org_b)
    ContactFactory.create_batch(2, customer=customer_a)
    ContactFactory.create_batch(3, customer=customer_b)
    superuser = CustomUserFactory(is_superuser=True, organization=None)

    api_client.force_authenticate(user=superuser)
    response = api_client.get(reverse("contact-list"), {"page_size": 200})

    assert response.status_code == 200
    assert response.data["count"] == 5


def test_create_contact_stamps_the_authenticated_users_organization(api_client):
    org = OrganizationFactory()
    customer = CustomerFactory(organization=org)
    _authenticate_as_member_of(api_client, org)
    payload = {
        "customer": str(customer.id),
        "name": "Jane Doe",
        "role": "Champion",
        "email": "jane@example.com",
    }

    response = api_client.post(reverse("contact-list"), payload, format="json")

    assert response.status_code == 201
    created = Contact.objects.get(id=response.data["id"])
    assert created.organization_id == org.id


def test_create_contact_for_cross_org_customer_is_rejected(api_client):
    own_org = OrganizationFactory()
    other_org = OrganizationFactory()
    customer = CustomerFactory(organization=other_org)
    _authenticate_as_member_of(api_client, own_org)
    payload = {
        "customer": str(customer.id),
        "name": "Jane Doe",
        "role": "Champion",
        "email": "jane@example.com",
    }

    response = api_client.post(reverse("contact-list"), payload, format="json")

    assert response.status_code == 400
    assert "customer" in response.data


def test_update_contact_persists_changes(api_client):
    contact = ContactFactory(role="Champion")
    _authenticate_as_member_of(api_client, contact.organization)

    response = api_client.patch(
        reverse("contact-detail", args=[contact.id]), {"role": "Detractor"}, format="json"
    )

    assert response.status_code == 200
    contact.refresh_from_db()
    assert contact.role == "Detractor"


def test_user_cannot_update_another_organizations_contact(api_client):
    contact = ContactFactory()
    _authenticate_as_member_of(api_client, OrganizationFactory())

    response = api_client.patch(
        reverse("contact-detail", args=[contact.id]), {"role": "Detractor"}, format="json"
    )

    assert response.status_code == 404


def test_soft_deleted_contact_is_not_retrievable(api_client):
    contact = ContactFactory()
    _authenticate_as_member_of(api_client, contact.organization)
    contact.delete()

    response = api_client.get(reverse("contact-detail", args=[contact.id]))

    assert response.status_code == 404


def test_idempotency_key_replays_cached_response_on_duplicate_post(api_client):
    org = OrganizationFactory()
    customer = CustomerFactory(organization=org)
    _authenticate_as_member_of(api_client, org)
    payload = {
        "customer": str(customer.id),
        "name": "Idempotent Contact",
        "role": "Admin",
        "email": "idempotent@example.com",
    }
    headers = {"HTTP_IDEMPOTENCY_KEY": "contact-req-123"}

    first = api_client.post(reverse("contact-list"), payload, format="json", **headers)
    second = api_client.post(reverse("contact-list"), payload, format="json", **headers)

    assert first.status_code == 201
    assert second.status_code == 201
    assert first.data["id"] == second.data["id"]
    assert Contact.all_objects.filter(name="Idempotent Contact").count() == 1
