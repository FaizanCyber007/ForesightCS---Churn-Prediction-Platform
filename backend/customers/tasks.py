"""
Celery entrypoints for the Churn Scoring Engine.

Thin wrappers only -- HealthScoreEngine itself stays in services.py per
docs/business-logic.md ("DRF layers stay thin and only orchestrate calls
into this module"); the same rule applies to the task layer.
"""

from celery import shared_task

from core.models import Organization
from customers.services import HealthScoreEngine


@shared_task
def run_health_score_engine(organization_id: str) -> int:
    """Recalculate health_score for every Customer in one Organization."""
    organization = Organization.objects.get(id=organization_id)
    updated = HealthScoreEngine(organization).run()
    return len(updated)


@shared_task
def recalculate_all_organizations_health_scores() -> int:
    """
    Nightly beat entrypoint (see CELERY_BEAT_SCHEDULE). Fans out one task per
    active Organization rather than evaluating every tenant in a single task,
    so one slow/failing org doesn't block or retry the rest.
    """
    organization_ids = list(
        Organization.objects.filter(is_active=True).values_list("id", flat=True)
    )
    for organization_id in organization_ids:
        run_health_score_engine.delay(str(organization_id))
    return len(organization_ids)
