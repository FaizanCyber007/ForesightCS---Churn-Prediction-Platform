"""
Customer seeding at scale.

Weighted across organizations (50/30/20 for 3 orgs) rather than split
evenly: `core.tenancy.resolve_organization` scopes every anonymous/frontend
request to the single earliest-created Organization, so that tenant needs
the bulk of the portfolio for the dashboard's pagination and filtering to
mean anything -- the other tenants exist to demonstrate multi-tenant
isolation, not to be browsed by this Phase 1 frontend.
"""

import random

from core.factories import CustomUserFactory
from customers.factories import CustomerFactory
from customers.models import Customer

OWNERS_PER_ORG = 4


def _weighted_split(total: int, organizations: list) -> list[int]:
    if not organizations:
        return []

    weights = [0.5, 0.3, 0.2] if len(organizations) == 3 else None
    if weights is None:
        weights = [1 / len(organizations)] * len(organizations)

    counts = [round(total * w) for w in weights]
    counts[-1] += total - sum(counts)  # absorb rounding drift into the last bucket
    return counts


def seed_customers(organizations: list, total: int) -> list[Customer]:
    counts = _weighted_split(total, organizations)

    all_customers: list[Customer] = []
    for organization, count in zip(organizations, counts, strict=True):
        owners = [
            CustomUserFactory.create(organization=organization, is_org_admin=(i == 0))
            for i in range(OWNERS_PER_ORG)
        ]

        batch = [
            CustomerFactory.build(organization=organization, owner=random.choice(owners))
            for _ in range(count)
        ]
        Customer.objects.bulk_create(batch, batch_size=200)
        all_customers.extend(batch)

    return all_customers
