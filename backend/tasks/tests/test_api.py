import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from core.factories import CustomUserFactory, OrganizationFactory
from customers.factories import CustomerFactory
from tasks.factories import TaskFactory
from tasks.models import Task

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

    response = api_client.get(reverse("task-list"))

    assert response.status_code == 401


def test_list_only_returns_tasks_from_the_authenticated_users_organization(api_client):
    org_a = OrganizationFactory()
    org_b = OrganizationFactory()
    TaskFactory.create_batch(2, organization=org_a)
    TaskFactory.create_batch(3, organization=org_b)
    _authenticate_as_member_of(api_client, org_a)

    response = api_client.get(reverse("task-list"))

    assert response.status_code == 200
    returned_ids = {row["id"] for row in response.data["results"]}
    expected_ids = {str(t.id) for t in org_a.tasks.all()}
    assert returned_ids == expected_ids
    assert len(returned_ids) == 2


def test_superuser_sees_tasks_across_all_organizations(api_client):
    org_a = OrganizationFactory()
    org_b = OrganizationFactory()
    TaskFactory.create_batch(2, organization=org_a)
    TaskFactory.create_batch(3, organization=org_b)
    superuser = CustomUserFactory(is_superuser=True, organization=None)

    api_client.force_authenticate(user=superuser)
    response = api_client.get(reverse("task-list"), {"page_size": 200})

    assert response.status_code == 200
    assert response.data["count"] == 5


def test_create_task_stamps_the_authenticated_users_organization(api_client):
    org = OrganizationFactory()
    _authenticate_as_member_of(api_client, org)
    payload = {
        "title": "Follow up on renewal",
        "priority": Task.Priority.HIGH,
        "status": Task.Status.OPEN,
        "type": Task.TaskType.MANUAL,
        "due_date": "2026-08-01",
    }

    response = api_client.post(reverse("task-list"), payload, format="json")

    assert response.status_code == 201
    assert response.data["type"] == Task.TaskType.MANUAL


def test_update_status_via_patch(api_client):
    task = TaskFactory(status=Task.Status.OPEN)
    _authenticate_as_member_of(api_client, task.organization)

    response = api_client.patch(
        reverse("task-detail", args=[task.id]), {"status": Task.Status.COMPLETED}, format="json"
    )

    assert response.status_code == 200
    task.refresh_from_db()
    assert task.status == Task.Status.COMPLETED


def test_related_customer_reflects_customer_company_name(api_client):
    customer = CustomerFactory(company_name="Acme Co")
    task = TaskFactory(organization=customer.organization, customer=customer)
    _authenticate_as_member_of(api_client, customer.organization)

    response = api_client.get(reverse("task-detail", args=[task.id]))

    assert response.status_code == 200
    assert response.data["related_customer"] == "Acme Co"


def test_soft_deleted_task_is_not_retrievable(api_client):
    task = TaskFactory()
    _authenticate_as_member_of(api_client, task.organization)
    task.delete()

    response = api_client.get(reverse("task-detail", args=[task.id]))

    assert response.status_code == 404
