"""
Tenant-resolution helper shared by every app's viewsets.

Authenticated users scope to their own Organization; superusers bypass
tenant scoping entirely. Anonymous requests are fail-closed by default,
with a development-only escape hatch for the explicitly seeded demo
Organization so local demo flows can still work -- unauthenticated
requests are never allowed to pick a tenant via request headers, which
would let an anonymous client scope itself into any active Organization
by sending an `X-Organization-ID` header.
"""

from django.conf import settings
from rest_framework.exceptions import PermissionDenied

from core.models import Organization


def resolve_organization(request):
    """
    Return the Organization a request's queryset should be scoped to.

        - Superusers bypass tenant scoping entirely (return None -> caller
            should skip the organization filter) per CLAUDE.md ##1.
        - Authenticated non-superuser users scope to their own organization.
        - Anonymous requests only scope to the seeded demo Organization in
            development, and never via request headers.
    """
    user = getattr(request, "user", None)

    if user is not None and getattr(user, "is_authenticated", False):
        if user.is_superuser:
            return None
        if user.organization_id:
            return user.organization

    if settings.DEBUG:
        return Organization.objects.filter(slug="foresight-demo", is_active=True).first()

    return None


def resolve_write_organization(request):
    """
    Like `resolve_organization`, but always returns a concrete Organization
    (never None) -- superusers writing without picking a tenant explicitly
    still need one Organization to stamp onto the new row.

    Anonymous callers are rejected with 403 (PermissionDenied). Previously
    this function would silently fall back to "any active organization" for
    anonymous POSTs, letting an unauthenticated client write rows into a
    tenant it had no right to. The seeded demo Organization is still
    resolved for anonymous requests in DEBUG, matching `resolve_organization`.
    """
    user = getattr(request, "user", None)
    is_authenticated = user is not None and getattr(user, "is_authenticated", False)
    if not is_authenticated:
        raise PermissionDenied("Authentication required to perform write operations.")

    organization = resolve_organization(request)
    if organization is not None:
        return organization

    is_superuser = bool(getattr(user, "is_superuser", False))

    # Superusers without a tenant get the same DEBUG/first-active fallback
    # they had before -- they explicitly bypass tenant scoping (CLAUDE.md ##1)
    # and still need a concrete Organization to stamp on the new row.
    if is_superuser:
        if settings.DEBUG:
            return Organization.objects.filter(slug="foresight-demo", is_active=True).first()
        return Organization.objects.filter(is_active=True).order_by("created_at").first()

    raise PermissionDenied(
        "Authenticated user must belong to an organization to perform write operations."
    )
