import logging

from rest_framework import status
from rest_framework.parsers import JSONParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from billing.authentication import LemonSqueezyWebhookAuthentication
from billing.services import reactivate_organization, suspend_organization
from core.models import Organization

logger = logging.getLogger(__name__)

SUBSCRIPTION_PAYMENT_FAILED = "subscription_payment_failed"
SUBSCRIPTION_PAYMENT_SUCCESS = "subscription_payment_success"
SUBSCRIPTION_RESUMED = "subscription_resumed"


class LemonSqueezyWebhookView(APIView):
    """
    Receives Lemon Squeezy billing webhooks.

    Signature verification is delegated to `LemonSqueezyWebhookAuthentication`
    (CLAUDE.md ##3 Front-to-Back Symmetry & Idempotency -- critical POSTs
    must be safe against replay/spoofing). `subscription_payment_failed`
    suspends the matching org; `subscription_payment_success` and
    `subscription_resumed` reactivate it (a dunned org paying or a paused
    subscription being resumed both mean "let them back in"). Other
    recognized event types are accepted (200) and ignored so Lemon Squeezy
    doesn't retry-storm us for events we don't yet handle.
    """

    permission_classes = [AllowAny]
    authentication_classes = [LemonSqueezyWebhookAuthentication]
    parser_classes = [JSONParser]

    def post(self, request, *args, **kwargs):
        payload = request.data
        event_name = payload.get("meta", {}).get("event_name")

        if event_name == SUBSCRIPTION_PAYMENT_FAILED:
            self._transition(payload, suspend_organization, event_name)
        elif event_name in (SUBSCRIPTION_PAYMENT_SUCCESS, SUBSCRIPTION_RESUMED):
            self._transition(payload, reactivate_organization, event_name)

        return Response(status=status.HTTP_200_OK)

    def _transition(self, payload: dict, transition, event_name: str) -> None:
        customer_id = str(payload.get("data", {}).get("attributes", {}).get("customer_id", ""))
        if not customer_id:
            logger.warning("%s webhook is missing data.attributes.customer_id.", event_name)
            return

        try:
            organization = Organization.objects.get(lemon_squeezy_customer_id=customer_id)
        except Organization.DoesNotExist:
            logger.warning("No Organization found for Lemon Squeezy customer_id=%s", customer_id)
            return

        transition(organization)
