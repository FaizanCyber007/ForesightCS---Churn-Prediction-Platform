import hashlib
import hmac
import logging

from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

logger = logging.getLogger(__name__)


class LemonSqueezyWebhookAuthentication(BaseAuthentication):
    """
    Verifies a Lemon Squeezy webhook's `X-Signature` header against
    `settings.LEMON_SQUEEZY_WEBHOOK_SECRET` before the payload is trusted
    (CLAUDE.md ##3 Front-to-Back Symmetry & Idempotency -- critical POSTs
    must be safe against replay/spoofing). Raises AuthenticationFailed
    (401) for a missing/invalid signature so the view body never has to
    reason about trust -- reaching the view means the request is genuine.
    """

    def authenticate(self, request):
        if not self._signature_is_valid(request):
            raise AuthenticationFailed("Invalid webhook signature.")
        return None

    def authenticate_header(self, request):
        # A non-empty value here is what keeps DRF's exception handler at
        # 401 for a failed signature -- without it, AuthenticationFailed is
        # downgraded to 403 (see APIView.handle_exception).
        return "Signature"

    def _signature_is_valid(self, request) -> bool:
        secret = settings.LEMON_SQUEEZY_WEBHOOK_SECRET
        if not secret:
            logger.error("LEMON_SQUEEZY_WEBHOOK_SECRET is not configured; rejecting webhook.")
            return False

        signature = request.headers.get("X-Signature", "")
        if not signature:
            return False

        digest = hmac.new(secret.encode("utf-8"), request.body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(digest, signature)
