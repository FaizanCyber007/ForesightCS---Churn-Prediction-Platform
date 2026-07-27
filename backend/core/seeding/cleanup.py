"""
Destructive reset used only by `seed_production_db` to make reseeding
idempotent.

This deliberately bypasses the soft-delete standard (CLAUDE.md ##2): that
rule protects the audited lifecycle of real tenant data reached through the
API, not a scratch/staging database being wiped and regenerated from
scratch by a seed script. `all_objects` (the plain, non-soft-delete manager)
is used so `.delete()` issues real SQL DELETEs.
"""

from core.models import CustomUser, Organization
from customers.models import Customer, EventLog
from notes.models import CustomerNote
from playbooks.models import Playbook
from rules.models import HealthRule
from tasks.models import Task


def clear_all() -> None:
    """Delete every seed-managed row, in FK-safe order (children first)."""
    EventLog.all_objects.all().delete()
    CustomerNote.all_objects.all().delete()
    Task.all_objects.all().delete()
    Playbook.all_objects.all().delete()
    Customer.all_objects.all().delete()
    HealthRule.all_objects.all().delete()
    CustomUser.all_objects.all().delete()
    Organization.all_objects.all().delete()
