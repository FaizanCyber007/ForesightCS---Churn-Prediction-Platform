import hashlib
import hmac
import json

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from core.factories import OrganizationFactory
from core.models import AuditLog, Organization

pytestmark = pytest.mark.django_db

WEBHOOK_SECRET = "test-secret"


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture(autouse=True)
def webhook_secret(settings):
    settings.LEMON_SQUEEZY_WEBHOOK_SECRET = WEBHOOK_SECRET


def _post_webhook(api_client, payload, secret=WEBHOOK_SECRET):
    body = json.dumps(payload).encode("utf-8")
    signature = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    return api_client.generic(
        "POST",
        reverse("lemon-squeezy-webhook"),
        data=body,
        content_type="application/json",
        HTTP_X_SIGNATURE=signature,
    )


def _payment_failed_payload(customer_id):
    return {
        "meta": {"event_name": "subscription_payment_failed"},
        "data": {"attributes": {"customer_id": customer_id}},
    }


def _event_payload(event_name, customer_id):
    return {
        "meta": {"event_name": event_name},
        "data": {"attributes": {"customer_id": customer_id}},
    }


def test_valid_signature_suspends_matching_organization(api_client):
    org = OrganizationFactory(
        lemon_squeezy_customer_id="cus_123",
        subscription_status=Organization.SubscriptionStatus.ACTIVE,
    )

    response = _post_webhook(api_client, _payment_failed_payload("cus_123"))

    assert response.status_code == 200
    org.refresh_from_db()
    assert org.subscription_status == Organization.SubscriptionStatus.SUSPENDED
    entry = AuditLog.objects.get(action=AuditLog.Action.ORG_SUSPENDED)
    assert entry.organization_id == org.id
    assert entry.actor_id is None  # webhook-triggered, no authenticated user


def test_invalid_signature_is_rejected(api_client):
    org = OrganizationFactory(
        lemon_squeezy_customer_id="cus_123",
        subscription_status=Organization.SubscriptionStatus.ACTIVE,
    )

    response = _post_webhook(api_client, _payment_failed_payload("cus_123"), secret="wrong-secret")

    assert response.status_code == 401
    org.refresh_from_db()
    assert org.subscription_status == Organization.SubscriptionStatus.ACTIVE


def test_missing_secret_setting_rejects_webhook(api_client, settings):
    settings.LEMON_SQUEEZY_WEBHOOK_SECRET = ""

    response = _post_webhook(api_client, _payment_failed_payload("cus_123"))

    assert response.status_code == 401


def test_unrecognized_event_is_accepted_and_ignored(api_client):
    org = OrganizationFactory(
        lemon_squeezy_customer_id="cus_123",
        subscription_status=Organization.SubscriptionStatus.ACTIVE,
    )
    payload = {
        "meta": {"event_name": "subscription_created"},
        "data": {"attributes": {"customer_id": "cus_123"}},
    }

    response = _post_webhook(api_client, payload)

    assert response.status_code == 200
    org.refresh_from_db()
    assert org.subscription_status == Organization.SubscriptionStatus.ACTIVE


def test_unknown_customer_id_is_ignored_without_error(api_client):
    response = _post_webhook(api_client, _payment_failed_payload("cus_does_not_exist"))

    assert response.status_code == 200


@pytest.mark.parametrize("event_name", ["subscription_payment_success", "subscription_resumed"])
def test_reactivation_events_unsuspend_matching_organization(api_client, event_name):
    org = OrganizationFactory(
        lemon_squeezy_customer_id="cus_123",
        subscription_status=Organization.SubscriptionStatus.SUSPENDED,
    )

    response = _post_webhook(api_client, _event_payload(event_name, "cus_123"))

    assert response.status_code == 200
    org.refresh_from_db()
    assert org.subscription_status == Organization.SubscriptionStatus.ACTIVE
    assert AuditLog.objects.filter(
        action=AuditLog.Action.ORG_REACTIVATED, organization=org
    ).exists()


def test_reactivation_event_for_unknown_customer_is_ignored_without_error(api_client):
    response = _post_webhook(
        api_client, _event_payload("subscription_payment_success", "cus_does_not_exist")
    )

    assert response.status_code == 200
