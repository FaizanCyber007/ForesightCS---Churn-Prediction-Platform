"""
EventLog seeding at scale.

Splits a fixed total budget across all seeded customers with organic
variance (some customers end up disengaged, some very active) rather than
an identical count each -- so the HealthScoreEngine (core/seeding/scoring.py)
produces a real spread across Healthy/At-Risk/Critical tiers instead of
every customer landing on the same score.
"""

import random
from datetime import timedelta

from django.utils import timezone

from customers.factories import EventLogFactory
from customers.models import Customer, EventLog

# (event_type, description, relative weight) -- weighted so product usage
# dominates and support/billing/contract friction stays comparatively rare,
# mirroring a realistic SaaS telemetry mix.
EVENT_TEMPLATES = [
    (EventLog.EventType.LOGIN, "User session recorded.", 35),
    (EventLog.EventType.FEATURE_USAGE, "Feature interaction logged.", 30),
    (EventLog.EventType.SUPPORT_TICKET, "Support ticket opened.", 12),
    (EventLog.EventType.BILLING_ISSUE, "Invoice payment flagged.", 8),
    (EventLog.EventType.NPS_RESPONSE, "NPS survey response received.", 7),
    (EventLog.EventType.CONTRACT_SIGNAL, "Contract/renewal signal detected.", 8),
]
FEATURES = ["reports", "automations", "integrations", "dashboards", "api"]

_EVENT_TYPES = [row[0] for row in EVENT_TEMPLATES]
_EVENT_DESCRIPTIONS = {row[0]: row[1] for row in EVENT_TEMPLATES}
_EVENT_WEIGHTS = [row[2] for row in EVENT_TEMPLATES]

# Telemetry is generated across a 90-day lookback so only a portion of it
# falls inside the HealthScoreEngine's 30-day evaluation window -- another
# source of natural variance between customers.
LOOKBACK_DAYS = 90


def _distribute_counts(total: int, n: int) -> list[int]:
    """n non-negative ints summing exactly to `total`, with organic variance."""
    if n == 0:
        return []

    base, remainder = divmod(total, n)
    counts = [base] * n
    for i in random.sample(range(n), remainder):
        counts[i] += 1

    if n >= 2:
        for _ in range(n):
            i, j = random.sample(range(n), 2)
            shift = min(counts[i], random.randint(0, 5))
            counts[i] -= shift
            counts[j] += shift

    return counts


def seed_event_logs(customers: list[Customer], total: int) -> int:
    counts = _distribute_counts(total, len(customers))
    now = timezone.now()

    batch = []
    for customer, count in zip(customers, counts, strict=True):
        for _ in range(count):
            event_type = random.choices(_EVENT_TYPES, weights=_EVENT_WEIGHTS, k=1)[0]
            metadata = (
                {"feature": random.choice(FEATURES)}
                if event_type == EventLog.EventType.FEATURE_USAGE
                else {}
            )
            batch.append(
                EventLogFactory.build(
                    customer=customer,
                    event_type=event_type,
                    description=_EVENT_DESCRIPTIONS[event_type],
                    occurred_at=now
                    - timedelta(days=random.randint(0, LOOKBACK_DAYS), hours=random.randint(0, 23)),
                    metadata=metadata,
                )
            )

    EventLog.objects.bulk_create(batch, batch_size=1000)
    return len(batch)
