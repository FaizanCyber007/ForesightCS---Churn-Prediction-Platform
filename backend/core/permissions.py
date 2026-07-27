"""
RBAC permission classes.

Not yet wired into any ViewSet -- DEFAULT_PERMISSION_CLASSES stays AllowAny
(CLAUDE.md ##3 Phased Security Implementation) until each endpoint is
deliberately locked down. This module is the infrastructure for that pass.
"""

from rest_framework.permissions import BasePermission


class IsTenantAdmin(BasePermission):
    """Allows access only to an authenticated user who admins their Organization."""

    def has_permission(self, request, view) -> bool:
        user = request.user
        return bool(user and user.is_authenticated and user.is_org_admin)


class IsSuperUser(BasePermission):
    """Allows access only to an authenticated platform superuser."""

    def has_permission(self, request, view) -> bool:
        # AnonymousUser.is_superuser is always False, so this is already
        # implicitly authenticated-only -- no separate is_authenticated check needed.
        return bool(request.user and request.user.is_superuser)
