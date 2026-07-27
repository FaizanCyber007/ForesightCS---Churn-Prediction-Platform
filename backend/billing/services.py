"""
Organization subscription-state transitions.

Kept isolated from `core` and `superadmin` (CLAUDE.md engineering
constraints): this is the single place that mutates
`Organization.subscription_status`, shared by the Lemon Squeezy webhook
handler (`billing.views`) and the super-admin manual "Suspend" action
(`superadmin.views`) so both paths behave identically.
"""

from core.audit import log_action
from core.models import AuditLog, CustomUser, Organization


def suspend_organization(
    organization: Organization, actor: CustomUser | None = None
) -> Organization:
    organization.subscription_status = Organization.SubscriptionStatus.SUSPENDED
    organization.save(update_fields=["subscription_status", "updated_at"])
    log_action(
        action=AuditLog.Action.ORG_SUSPENDED,
        description=f"Organization '{organization.name}' suspended.",
        organization=organization,
        actor=actor,
    )
    return organization


def reactivate_organization(
    organization: Organization, actor: CustomUser | None = None
) -> Organization:
    organization.subscription_status = Organization.SubscriptionStatus.ACTIVE
    organization.save(update_fields=["subscription_status", "updated_at"])
    log_action(
        action=AuditLog.Action.ORG_REACTIVATED,
        description=f"Organization '{organization.name}' reactivated.",
        organization=organization,
        actor=actor,
    )
    return organization
