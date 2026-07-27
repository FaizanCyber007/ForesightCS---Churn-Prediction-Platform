"""
Central AuditLog writer -- the only place that creates AuditLog rows
(CLAUDE.md ##4 DRY), so every call site logs the same shape and nothing
writes directly via `AuditLog.objects.create(...)`.
"""

from __future__ import annotations

from core.models import AuditLog, CustomUser, Organization


def log_action(
    *,
    action: str,
    description: str,
    organization: Organization | None = None,
    actor: CustomUser | None = None,
    metadata: dict | None = None,
) -> AuditLog:
    return AuditLog.objects.create(
        organization=organization,
        actor=actor,
        action=action,
        description=description,
        metadata=metadata or {},
    )
