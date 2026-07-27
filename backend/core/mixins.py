"""Reusable DRF viewset mixins shared across apps."""

from django.core.cache import cache
from django.db import IntegrityError, transaction
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from core.models import IdempotencyRecord
from core.tenancy import resolve_write_organization


class IdempotencyKeyMixin:
    """
    Makes a ModelViewSet's `create()` safe to retry.

    If the client sends an `Idempotency-Key` header, the response for the
    first request with that key is cached and replayed verbatim on any
    retry with the same key -- preventing duplicate DB rows from network
    retries on critical POST endpoints (CLAUDE.md ##3).

    The key is scoped by viewset + organization + caller so two different
    tenants/callers can never share or replay each other's cached response.
    A concurrent duplicate is prevented by claiming the key in an
    `IdempotencyRecord` row with a DB-level unique constraint *before*
    calling `super().create()` -- a cache-only get-then-set has a race
    where two requests can both read a cache miss before either writes.
    """

    idempotency_cache_timeout = 60 * 60 * 24

    def create(self, request, *args, **kwargs):
        key = request.headers.get("Idempotency-Key")
        if not key:
            return super().create(request, *args, **kwargs)

        cache_key = self._idempotency_cache_key(request, key)

        cached = cache.get(cache_key)
        if cached is not None:
            return self._replay_response(cached)

        return self._execute_and_store(request, cache_key, *args, **kwargs)

    def _execute_and_store(self, request, cache_key, *args, **kwargs):
        record, claimed = self._claim_record(cache_key)
        if not claimed:
            return self._replay_or_conflict(cache_key, record)

        try:
            response = super().create(request, *args, **kwargs)
        except Exception:
            record.delete()
            raise

        self._store_result(record, cache_key, response)
        return response

    def _claim_record(self, cache_key):
        """
        Atomically claim `cache_key` via a unique `IdempotencyRecord` row.

        Returns `(record, claimed)`. `claimed` is False if another request
        already holds -- or previously held -- this key: either
        `get_or_create` found an existing row, or a concurrent insert raced
        us and hit the unique constraint first.
        """
        try:
            with transaction.atomic():
                record, created = IdempotencyRecord.objects.select_for_update().get_or_create(
                    key=cache_key
                )
        except IntegrityError:
            return IdempotencyRecord.objects.filter(key=cache_key).first(), False
        return record, created

    def _store_result(self, record, cache_key, response):
        if response.status_code == 201:
            cached = {"data": response.data, "status_code": response.status_code}
            cache.set(cache_key, cached, self.idempotency_cache_timeout)
            record.response_status = response.status_code
            record.response_data = response.data
            record.save(update_fields=["response_status", "response_data"])
        else:
            record.delete()

    def _idempotency_cache_key(self, request, key: str) -> str:
        organization = resolve_write_organization(request)
        if organization is None:
            raise ValidationError({"organization": "An active organization is required."})
        user = getattr(request, "user", None)
        principal = user.pk if user is not None and user.is_authenticated else "anonymous"
        endpoint = getattr(request, "path", self.__class__.__name__)
        return (
            f"idempotency:{self.__class__.__name__}:{endpoint}:{organization.id}:{principal}:{key}"
        )

    def _replay_or_conflict(self, cache_key, record):
        if record is not None and record.response_status is not None:
            cached = {"data": record.response_data, "status_code": record.response_status}
            cache.set(cache_key, cached, self.idempotency_cache_timeout)
            return self._replay_response(cached)
        return Response(
            {"non_field_errors": ["A request with this Idempotency-Key is already in progress."]},
            status=409,
        )

    def _replay_response(self, cached):
        return Response(cached["data"], status=cached["status_code"])


class TenantScopedViewSetMixin:
    """
    Strictly scopes a ModelViewSet's queryset and creates to the requesting
    user's own Organization (CLAUDE.md ##1 -- data leakage is a fatal
    error). Requires IsAuthenticated (or stricter) on the view: every
    non-superuser request must carry a real `request.user.organization_id`,
    never a client-suppliable value, so this is also what stops malicious
    tenant-assignment injection on create.

    Superusers bypass the organization scope entirely, per CLAUDE.md ##1's
    Super Admin Bypass.
    """

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.user.is_superuser:
            return queryset
        return queryset.filter(organization_id=self.request.user.organization_id)

    def perform_create(self, serializer):
        if self.request.user.organization_id is None:
            raise ValidationError(
                {"organization": "Your account has no organization to assign this record to."}
            )
        serializer.save(
            organization_id=self.request.user.organization_id, **self.extra_create_kwargs()
        )

    def extra_create_kwargs(self) -> dict:
        """Override to pass additional fields to `serializer.save()` on create."""
        return {}
