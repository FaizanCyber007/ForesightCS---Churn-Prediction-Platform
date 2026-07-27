import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from core.factories import CustomUserFactory, OrganizationFactory
from core.models import AuditLog
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


class TestHealthRuleList:
    def test_anonymous_request_is_rejected(self, api_client):
        OrganizationFactory()

        response = api_client.get(reverse("healthrule-list"))

        assert response.status_code == 401

    def test_authenticated_user_sees_only_their_organizations_rules(self, api_client):
        org_a = OrganizationFactory()
        org_b = OrganizationFactory()
        HealthRuleFactory.create_batch(2, organization=org_a)
        HealthRuleFactory.create_batch(3, organization=org_b)
        _authenticate_as_member_of(api_client, org_a)

        response = api_client.get(reverse("healthrule-list"))

        assert response.status_code == 200
        returned_ids = {row["id"] for row in response.data["results"]}
        expected_ids = {str(r.id) for r in org_a.health_rules.all()}
        assert returned_ids == expected_ids
        assert len(returned_ids) == 2

    def test_user_cannot_see_another_organizations_rules(self, api_client):
        org_a = OrganizationFactory()
        org_b = OrganizationFactory()
        HealthRuleFactory.create_batch(2, organization=org_a)
        HealthRuleFactory.create_batch(3, organization=org_b)
        _authenticate_as_member_of(api_client, org_b)

        response = api_client.get(reverse("healthrule-list"))

        assert response.status_code == 200
        returned_ids = {row["id"] for row in response.data["results"]}
        expected_ids = {str(r.id) for r in org_b.health_rules.all()}
        assert returned_ids == expected_ids
        assert len(returned_ids) == 3

    def test_superuser_sees_rules_across_all_organizations(self, api_client):
        org_a = OrganizationFactory()
        org_b = OrganizationFactory()
        HealthRuleFactory.create_batch(2, organization=org_a)
        HealthRuleFactory.create_batch(3, organization=org_b)
        superuser = CustomUserFactory(is_superuser=True, organization=None)

        api_client.force_authenticate(user=superuser)
        response = api_client.get(reverse("healthrule-list"), {"page_size": 200})

        assert response.status_code == 200
        assert response.data["count"] == 5

    def test_metric_types_endpoint_lists_model_choices(self, api_client):
        _authenticate_as_member_of(api_client, OrganizationFactory())

        response = api_client.get(reverse("healthrule-metric-types"))

        assert response.status_code == 200
        values = {row["value"] for row in response.data}
        assert values == {choice.value for choice in HealthRule.MetricType}


class TestHealthRuleCreate:
    def _payload(self, **overrides):
        payload = {
            "name": "Login drop watchlist",
            "metric_type": HealthRule.MetricType.LOGIN,
            "threshold": "25.00",
            "weight": 15,
        }
        payload.update(overrides)
        return payload

    def test_anonymous_create_is_rejected(self, api_client):
        response = api_client.post(reverse("healthrule-list"), self._payload(), format="json")

        assert response.status_code == 401

    def test_create_assigns_rule_to_the_authenticated_users_organization(self, api_client):
        org = OrganizationFactory()
        _authenticate_as_member_of(api_client, org)

        response = api_client.post(reverse("healthrule-list"), self._payload(), format="json")

        assert response.status_code == 201
        assert response.data["metric_type_display"] == "Login frequency"
        created = HealthRule.objects.get(id=response.data["id"])
        assert created.organization_id == org.id

    def test_create_ignores_a_client_supplied_organization_field(self, api_client):
        own_org = OrganizationFactory()
        other_org = OrganizationFactory()
        _authenticate_as_member_of(api_client, own_org)

        response = api_client.post(
            reverse("healthrule-list"),
            self._payload(organization=str(other_org.id)),
            format="json",
        )

        assert response.status_code == 201
        created = HealthRule.objects.get(id=response.data["id"])
        assert created.organization_id == own_org.id

    def test_superuser_without_an_organization_gets_a_clear_error(self, api_client):
        superuser = CustomUserFactory(is_superuser=True, organization=None)
        api_client.force_authenticate(user=superuser)

        response = api_client.post(reverse("healthrule-list"), self._payload(), format="json")

        assert response.status_code == 400
        assert "organization" in response.data

    @pytest.mark.parametrize("weight", [0, -5, 101, 500])
    def test_weight_outside_valid_range_is_rejected(self, api_client, weight):
        _authenticate_as_member_of(api_client, OrganizationFactory())

        response = api_client.post(
            reverse("healthrule-list"), self._payload(weight=weight), format="json"
        )

        assert response.status_code == 400
        assert "weight" in response.data

    def test_negative_threshold_is_rejected(self, api_client):
        _authenticate_as_member_of(api_client, OrganizationFactory())

        response = api_client.post(
            reverse("healthrule-list"), self._payload(threshold="-1.00"), format="json"
        )

        assert response.status_code == 400
        assert "threshold" in response.data

    def test_idempotency_key_replays_cached_response_on_duplicate_post(self, api_client):
        org = OrganizationFactory()
        _authenticate_as_member_of(api_client, org)
        payload = self._payload(name="Idempotent rule")
        headers = {"HTTP_IDEMPOTENCY_KEY": "rule-req-123"}

        first = api_client.post(reverse("healthrule-list"), payload, format="json", **headers)
        second = api_client.post(reverse("healthrule-list"), payload, format="json", **headers)

        assert first.status_code == 201
        assert second.status_code == 201
        assert first.data["id"] == second.data["id"]
        assert HealthRule.all_objects.filter(name="Idempotent rule").count() == 1


class TestHealthRuleAuditLog:
    def _payload(self, **overrides):
        payload = {
            "name": "Login drop watchlist",
            "metric_type": HealthRule.MetricType.LOGIN,
            "threshold": "25.00",
            "weight": 15,
        }
        payload.update(overrides)
        return payload

    def test_create_writes_an_audit_log_entry(self, api_client):
        org = OrganizationFactory()
        user = _authenticate_as_member_of(api_client, org)

        response = api_client.post(reverse("healthrule-list"), self._payload(), format="json")

        assert response.status_code == 201
        entry = AuditLog.objects.get(action=AuditLog.Action.RULE_CREATED)
        assert entry.actor_id == user.id
        assert entry.organization_id == org.id
        assert "Login drop watchlist" in entry.description

    def test_update_writes_an_audit_log_entry(self, api_client):
        rule = HealthRuleFactory()
        user = _authenticate_as_member_of(api_client, rule.organization)

        response = api_client.patch(
            reverse("healthrule-detail", args=[rule.id]), {"weight": 42}, format="json"
        )

        assert response.status_code == 200
        entry = AuditLog.objects.get(action=AuditLog.Action.RULE_UPDATED)
        assert entry.actor_id == user.id
        assert entry.organization_id == rule.organization_id
        assert rule.name in entry.description


class TestHealthRuleDelete:
    def test_soft_deleted_rule_is_not_retrievable(self, api_client):
        rule = HealthRuleFactory()
        _authenticate_as_member_of(api_client, rule.organization)
        rule.delete()

        response = api_client.get(reverse("healthrule-detail", args=[rule.id]))

        assert response.status_code == 404

    def test_user_cannot_retrieve_another_organizations_rule(self, api_client):
        rule = HealthRuleFactory()
        _authenticate_as_member_of(api_client, OrganizationFactory())

        response = api_client.get(reverse("healthrule-detail", args=[rule.id]))

        assert response.status_code == 404
