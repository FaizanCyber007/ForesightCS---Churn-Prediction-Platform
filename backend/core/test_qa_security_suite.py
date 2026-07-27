"""
QA suite for the security/RBAC, tenant-isolation, and E2E-lifecycle
requirements a senior QA automation engineer would demonstrate for
ForesightCS's now-secured, multi-tenant API.

Not everything requested here is new coverage -- duplicating an
already-robust test under a different name isn't useful. Two of the
required scenarios are already covered elsewhere and are left there
rather than repeated:
  - Successful login sets HttpOnly/Secure/SameSite cookies and omits
    tokens from the body: core/test_auth.py::TestLoginView::
    test_valid_login_sets_httponly_jwt_cookies_and_omits_tokens_from_body
  - Anonymous access to /customers/ returns 401: customers/tests/test_api.py::
    TestCustomerList::test_anonymous_request_is_rejected

This file adds the pieces that weren't covered anywhere yet: an
OrgAdmin-specific role-based-denial test (existing superadmin tests only
ever used a plain non-admin member), an explicit "exactly zero" framing
for HealthRule tenant isolation, and a full register/login/create/
retrieve E2E happy path driven entirely over HTTP.
"""

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from core.factories import CustomUserFactory, OrganizationFactory
from core.models import Organization
from customers.models import Customer
from rules.factories import HealthRuleFactory
from rules.models import HealthRule

pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    return APIClient()


class TestRoleBasedAccessControl:
    """
    CLAUDE.md ##1 Super Admin Bypass: being an admin *within* your own
    organization must never imply cross-tenant/platform access.
    `CustomUser.is_org_admin` is a distinct, more-privileged persona than
    a plain member -- worth its own explicit denial test rather than
    assuming the existing plain-member coverage
    (superadmin/tests/test_api.py::test_non_superuser_is_forbidden)
    generalizes to it.
    """

    def test_org_admin_gets_403_at_the_superadmin_organizations_endpoint(self, api_client):
        org = OrganizationFactory()
        org_admin = CustomUserFactory(organization=org, is_org_admin=True)
        api_client.force_authenticate(user=org_admin)

        response = api_client.get(reverse("admin-organization-list"))

        assert response.status_code == 403


class TestTenantDataIsolationRules:
    """Direct proof that Tenant A never receives any of Tenant B's HealthRules."""

    def test_tenant_a_receives_exactly_zero_of_tenant_bs_rules(self, api_client):
        tenant_a = OrganizationFactory()
        tenant_b = OrganizationFactory()
        HealthRuleFactory.create_batch(2, organization=tenant_a)
        tenant_b_rules = HealthRuleFactory.create_batch(4, organization=tenant_b)
        tenant_a_member = CustomUserFactory(organization=tenant_a)
        api_client.force_authenticate(user=tenant_a_member)

        response = api_client.get(reverse("healthrule-list"), {"page_size": 200})

        assert response.status_code == 200
        returned_ids = {row["id"] for row in response.data["results"]}
        tenant_b_ids = {str(rule.id) for rule in tenant_b_rules}
        assert len(returned_ids & tenant_b_ids) == 0
        assert returned_ids == {str(rule.id) for rule in tenant_a.health_rules.all()}


class TestCustomerLifecycleE2E:
    """
    Full happy-path lifecycle driven entirely through Django's test
    client and real HTTP requests -- no `force_authenticate` anywhere, so
    this genuinely exercises the HttpOnly-cookie session end to end
    rather than shortcutting around it: register -> log in -> create a
    Customer -> create a HealthRule -> calculate the churn score, in that
    order, with each step's response feeding the next.
    """

    def test_register_login_create_customer_create_rule_and_calculate_score(self, api_client):
        # 1. Register for real over HTTP (core.views.RegisterView) -- founds
        # a brand-new Organization + its first CustomUser and logs them in.
        password = "correct-horse-battery-staple"
        register_response = api_client.post(
            reverse("auth_register"),
            {
                "full_name": "Jane Founder",
                "company_name": "Acme Retention Inc",
                "email": "new.user@acme.test",
                "username": "new.user",
                "password": password,
            },
            format="json",
        )
        assert register_response.status_code == 201
        assert "access_token" in register_response.cookies
        assert register_response.data["user"]["companyName"] == "Acme Retention Inc"

        # 2. Log out, then log back in for real over HTTP -- proves the
        # credentials just registered actually work via LoginView too, not
        # only via the auto-login RegisterView already performs. A real
        # browser stops sending a cookie once its Set-Cookie expiry is in
        # the past (core.authentication.clear_auth_cookies); Django's test
        # client instead keeps sending it with an empty value, which
        # CookieJWTAuthentication would (correctly) reject as an invalid
        # token -- so the cookie jar is cleared explicitly here to model
        # what an actual browser does after logout.
        api_client.cookies = register_response.cookies
        api_client.post(reverse("auth_logout"))
        api_client.cookies.clear()

        login_response = api_client.post(
            reverse("auth_login"),
            {"identifier": "new.user", "password": password},
            format="json",
        )
        assert login_response.status_code == 200
        assert "access_token" in login_response.cookies

        # 3. Carry the session cookies forward explicitly, the same way
        # every other cookie-session test in this codebase does.
        api_client.cookies = login_response.cookies
        organization = Organization.objects.get(name="Acme Retention Inc")

        # 4. Create a Customer using only the cookie session.
        customer_payload = {
            "name": "Jane Doe",
            "company_name": "New Customer Co",
            "segment": "SMB",
            "plan": "Starter",
            "health_score": 100,
            "mrr": "1000.00",
            "annual_contract_value": "12000.00",
            "renewal_date": "2027-01-01",
            "nps": 0,
            "expansion_potential": 0,
        }
        create_response = api_client.post(reverse("customer-list"), customer_payload, format="json")
        assert create_response.status_code == 201
        customer_id = create_response.data["id"]
        created = Customer.objects.get(id=customer_id)
        assert created.organization_id == organization.id
        assert created.health_score == 100  # base score before any rule has run

        # 5. Create a HealthRule using only the cookie session. A brand-new
        # customer has zero LOGIN EventLogs, so any positive threshold is
        # immediately violated (customers.services.LOW_VOLUME_METRICS).
        rule_payload = {
            "name": "No login activity",
            "metric_type": HealthRule.MetricType.LOGIN,
            "threshold": "5.00",
            "weight": 40,
        }
        rule_response = api_client.post(reverse("healthrule-list"), rule_payload, format="json")
        assert rule_response.status_code == 201
        assert (
            HealthRule.objects.get(id=rule_response.data["id"]).organization_id == organization.id
        )

        # 6. Calculate the churn score using only the cookie session, and
        # confirm the violated rule's weight was actually subtracted.
        calculate_response = api_client.post(reverse("customer-calculate", args=[customer_id]))

        assert calculate_response.status_code == 200
        assert calculate_response.data["health_score"] == 60  # 100 - weight(40)
        assert calculate_response.data["health"] == "At-Risk"  # 41-70 tier
        created.refresh_from_db()
        assert created.health_score == 60
