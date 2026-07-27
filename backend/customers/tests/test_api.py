import base64

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from core.factories import CustomUserFactory, OrganizationFactory
from customers.factories import CustomerFactory
from customers.models import Customer
from rules.factories import HealthRuleFactory
from rules.models import HealthRule

pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    return APIClient()


def _authenticate_as_member_of(api_client, organization):
    user = CustomUserFactory(organization=organization)
    api_client.force_authenticate(user=user)
    return user


class TestCustomerList:
    def test_anonymous_request_is_rejected(self, api_client):
        OrganizationFactory()

        response = api_client.get(reverse("customer-list"))

        assert response.status_code == 401

    def test_authenticated_user_sees_only_their_organizations_customers(self, api_client):
        org_a = OrganizationFactory()
        org_b = OrganizationFactory()
        CustomerFactory.create_batch(2, organization=org_a)
        CustomerFactory.create_batch(3, organization=org_b)
        _authenticate_as_member_of(api_client, org_a)

        response = api_client.get(reverse("customer-list"))

        assert response.status_code == 200
        returned_org_ids = {row["id"] for row in response.data["results"]}
        expected_ids = {str(c.id) for c in org_a.customers.all()}
        assert returned_org_ids == expected_ids
        assert len(returned_org_ids) == 2

    def test_user_cannot_see_another_organizations_customers(self, api_client):
        """
        Data leakage is a fatal error (CLAUDE.md ##1): a member of org_b must
        never see org_a's customers, regardless of any header/query param.
        """
        org_a = OrganizationFactory()
        org_b = OrganizationFactory()
        CustomerFactory.create_batch(2, organization=org_a)
        CustomerFactory.create_batch(3, organization=org_b)
        _authenticate_as_member_of(api_client, org_b)

        response = api_client.get(reverse("customer-list"), HTTP_X_ORGANIZATION_ID=str(org_a.id))

        assert response.status_code == 200
        returned_org_ids = {row["id"] for row in response.data["results"]}
        expected_ids = {str(c.id) for c in org_b.customers.all()}
        assert returned_org_ids == expected_ids
        assert len(returned_org_ids) == 3

    def test_superuser_sees_customers_across_all_organizations(self, api_client):
        org_a = OrganizationFactory()
        org_b = OrganizationFactory()
        CustomerFactory.create_batch(2, organization=org_a)
        CustomerFactory.create_batch(3, organization=org_b)
        superuser = CustomUserFactory(is_superuser=True, organization=None)

        api_client.force_authenticate(user=superuser)
        response = api_client.get(reverse("customer-list"), {"page_size": 200})

        assert response.status_code == 200
        assert response.data["count"] == 5

    def test_superuser_via_basic_auth_sees_all_organizations(self, api_client):
        """
        The seeded super-admin account (no full JWT login flow for it yet,
        see superadmin.views) can authenticate over HTTP Basic Auth and
        still hit the real is_superuser bypass in TenantScopedViewSetMixin.
        """
        org_a = OrganizationFactory()
        org_b = OrganizationFactory()
        CustomerFactory.create_batch(2, organization=org_a)
        CustomerFactory.create_batch(3, organization=org_b)
        superuser = CustomUserFactory(is_superuser=True, organization=None)
        superuser.set_password("s3cret-pass")
        superuser.save()
        credentials = base64.b64encode(f"{superuser.username}:s3cret-pass".encode()).decode()

        api_client.credentials(HTTP_AUTHORIZATION=f"Basic {credentials}")
        response = api_client.get(reverse("customer-list"), {"page_size": 200})

        assert response.status_code == 200
        assert response.data["count"] == 5

    def test_pagination_page_size_query_param(self, api_client):
        org = OrganizationFactory()
        CustomerFactory.create_batch(5, organization=org)
        _authenticate_as_member_of(api_client, org)

        response = api_client.get(reverse("customer-list"), {"page_size": 2})

        assert response.status_code == 200
        assert len(response.data["results"]) == 2
        assert response.data["count"] == 5

    def test_filter_by_health_tier(self, api_client):
        org = OrganizationFactory()
        CustomerFactory(organization=org, health_score=90, company_name="Healthy Co")
        CustomerFactory(organization=org, health_score=20, company_name="Critical Co")
        _authenticate_as_member_of(api_client, org)

        response = api_client.get(reverse("customer-list"), {"health": "Critical"})

        assert response.status_code == 200
        companies = {row["company_name"] for row in response.data["results"]}
        assert companies == {"Critical Co"}

    def test_search_by_company_name(self, api_client):
        org = OrganizationFactory()
        CustomerFactory(organization=org, company_name="Zephyr Robotics")
        CustomerFactory(organization=org, company_name="Nimbus Retail")
        _authenticate_as_member_of(api_client, org)

        response = api_client.get(reverse("customer-list"), {"search": "Zephyr"})

        assert response.status_code == 200
        assert response.data["count"] == 1
        assert response.data["results"][0]["company_name"] == "Zephyr Robotics"

    def test_list_uses_a_flat_number_of_queries_regardless_of_customer_count(
        self, api_client, django_assert_max_num_queries
    ):
        """
        `support_tickets_count` and `last_active_days` must be resolved via
        the `.annotate()`d queryset (CLAUDE.md ##8 N+1 fix), not per-row
        `SerializerMethodField` queries -- otherwise listing customers would
        cost O(n) extra queries as the org's customer count grows.
        """
        org = OrganizationFactory()
        CustomerFactory.create_batch(10, organization=org)
        _authenticate_as_member_of(api_client, org)

        # One query for the annotated customer page, one for the paginator's
        # .count() -- flat regardless of how many customers are returned.
        with django_assert_max_num_queries(2):
            response = api_client.get(reverse("customer-list"), {"page_size": 200})

        assert response.status_code == 200
        assert len(response.data["results"]) == 10


class TestCustomerCreate:
    def _payload(self, **overrides):
        payload = {
            "name": "Jane Doe",
            "company_name": "Header Scoped Co",
            "segment": "SMB",
            "plan": "Starter",
            "health_score": 100,
            "mrr": "1000.00",
            "annual_contract_value": "12000.00",
            "renewal_date": "2027-01-01",
            "nps": 0,
            "expansion_potential": 0,
        }
        payload.update(overrides)
        return payload

    def test_anonymous_create_is_rejected(self, api_client):
        response = api_client.post(reverse("customer-list"), self._payload(), format="json")

        assert response.status_code == 401

    def test_create_assigns_customer_to_the_authenticated_users_organization(self, api_client):
        org = OrganizationFactory()
        _authenticate_as_member_of(api_client, org)

        response = api_client.post(reverse("customer-list"), self._payload(), format="json")

        assert response.status_code == 201
        created = Customer.objects.get(company_name="Header Scoped Co")
        assert created.organization_id == org.id

    def test_create_ignores_a_client_supplied_organization_field(self, api_client):
        """
        Malicious tenant-assignment injection: even if a request tries to
        smuggle another org's id in, the server must still force the
        authenticated user's own organization (CLAUDE.md ##1/##3).
        """
        own_org = OrganizationFactory()
        other_org = OrganizationFactory()
        _authenticate_as_member_of(api_client, own_org)

        response = api_client.post(
            reverse("customer-list"),
            self._payload(organization=str(other_org.id)),
            format="json",
        )

        assert response.status_code == 201
        created = Customer.objects.get(company_name="Header Scoped Co")
        assert created.organization_id == own_org.id
        assert created.organization_id != other_org.id

    def test_superuser_without_an_organization_gets_a_clear_error(self, api_client):
        superuser = CustomUserFactory(is_superuser=True, organization=None)
        api_client.force_authenticate(user=superuser)

        response = api_client.post(reverse("customer-list"), self._payload(), format="json")

        assert response.status_code == 400
        assert "organization" in response.data

    def test_idempotency_key_replays_cached_response_on_duplicate_post(self, api_client):
        org = OrganizationFactory()
        _authenticate_as_member_of(api_client, org)
        payload = self._payload(company_name="Idempotent Co")
        headers = {"HTTP_IDEMPOTENCY_KEY": "req-123"}

        first = api_client.post(reverse("customer-list"), payload, format="json", **headers)
        second = api_client.post(reverse("customer-list"), payload, format="json", **headers)

        assert first.status_code == 201
        assert second.status_code == 201
        assert first.data["id"] == second.data["id"]
        assert Customer.all_objects.filter(company_name="Idempotent Co").count() == 1


class TestCustomerRetrieve:
    def test_retrieve_returns_customer_owner_email(self, api_client):
        customer = CustomerFactory()
        _authenticate_as_member_of(api_client, customer.organization)

        response = api_client.get(reverse("customer-detail", args=[customer.id]))

        assert response.status_code == 200
        assert response.data["customer_owner_email"] == customer.owner.email


class TestCustomerUpdate:
    def test_patch_ignores_client_supplied_health_score(self, api_client):
        """
        health_score is read-only via the API: per CLAUDE.md's Churn Scoring
        Engine rules, it can only change through HealthScoreEngine (the
        `/calculate/` action), never a direct client-supplied value.
        """
        customer = CustomerFactory(health_score=90)
        _authenticate_as_member_of(api_client, customer.organization)

        response = api_client.patch(
            reverse("customer-detail", args=[customer.id]), {"health_score": 20}, format="json"
        )

        assert response.status_code == 200
        assert response.data["health_score"] == 90
        assert response.data["health"] == Customer.HEALTHY
        customer.refresh_from_db()
        assert customer.health_score == 90

    def test_user_cannot_patch_another_organizations_customer(self, api_client):
        customer = CustomerFactory(health_score=90)
        other_org = OrganizationFactory()
        _authenticate_as_member_of(api_client, other_org)

        response = api_client.patch(
            reverse("customer-detail", args=[customer.id]), {"name": "Hijacked"}, format="json"
        )

        assert response.status_code == 404
        customer.refresh_from_db()
        assert customer.name != "Hijacked"


class TestCustomerDelete:
    def test_soft_deleted_customer_is_not_retrievable(self, api_client):
        customer = CustomerFactory()
        _authenticate_as_member_of(api_client, customer.organization)
        customer.delete()

        response = api_client.get(reverse("customer-detail", args=[customer.id]))

        assert response.status_code == 404


class TestCustomerCalculate:
    def test_calculate_action_recalculates_and_persists_health_score(self, api_client):
        org = OrganizationFactory()
        customer = CustomerFactory(organization=org, health_score=100, nps=5)
        HealthRuleFactory(
            organization=org,
            metric_type=HealthRule.MetricType.NPS_RESPONSE,
            threshold=20,
            weight=15,
        )
        _authenticate_as_member_of(api_client, org)

        response = api_client.post(reverse("customer-calculate", args=[customer.id]))

        assert response.status_code == 200
        assert response.data["health_score"] == 85
        customer.refresh_from_db()
        assert customer.health_score == 85

    def test_calculate_action_only_affects_the_targeted_customer(self, api_client):
        org = OrganizationFactory()
        target = CustomerFactory(organization=org, health_score=100)
        other = CustomerFactory(organization=org, health_score=100)
        HealthRuleFactory(
            organization=org, metric_type=HealthRule.MetricType.LOGIN, threshold=99, weight=15
        )
        _authenticate_as_member_of(api_client, org)

        api_client.post(reverse("customer-calculate", args=[target.id]))
        other.refresh_from_db()

        assert other.health_score == 100

    def test_calculate_action_returns_404_for_unknown_customer(self, api_client):
        org = OrganizationFactory()
        _authenticate_as_member_of(api_client, org)

        unknown_id = "11111111-1111-1111-1111-111111111111"
        response = api_client.post(reverse("customer-calculate", args=[unknown_id]))

        assert response.status_code == 404

    def test_user_cannot_calculate_another_organizations_customer(self, api_client):
        org = OrganizationFactory()
        customer = CustomerFactory(organization=org, health_score=100, nps=5)
        HealthRuleFactory(
            organization=org,
            metric_type=HealthRule.MetricType.NPS_RESPONSE,
            threshold=20,
            weight=15,
        )
        other_org = OrganizationFactory()
        _authenticate_as_member_of(api_client, other_org)

        response = api_client.post(reverse("customer-calculate", args=[customer.id]))

        assert response.status_code == 404
        customer.refresh_from_db()
        assert customer.health_score == 100
