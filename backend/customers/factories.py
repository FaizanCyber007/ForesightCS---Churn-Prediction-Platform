import random

import factory
import factory.fuzzy
from django.utils import timezone
from faker import Faker

from core.factories import CustomUserFactory, OrganizationFactory
from customers.models import Customer, EventLog

fake = Faker()

# Realistic MRR bands and segment->plan affinity, used to keep generated
# customers internally consistent (an Enterprise plan shouldn't carry a
# Starter-tier MRR) when seeding at scale -- see core/seeding/customers.py.
PLAN_MRR_RANGES = {
    Customer.Plan.STARTER: (500, 3_000),
    Customer.Plan.GROWTH: (3_000, 9_000),
    Customer.Plan.SCALE: (9_000, 20_000),
    Customer.Plan.ENTERPRISE: (20_000, 50_000),
}

SEGMENT_PLAN_AFFINITY = {
    Customer.Segment.SMB: [Customer.Plan.STARTER, Customer.Plan.GROWTH],
    Customer.Segment.MID_MARKET: [Customer.Plan.GROWTH, Customer.Plan.SCALE],
    Customer.Segment.EXPANSION: [Customer.Plan.SCALE, Customer.Plan.ENTERPRISE],
}


class CustomerFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Customer

    class Params:
        customer = None

    organization = factory.LazyAttribute(
        lambda obj: obj.customer.organization if obj.customer else OrganizationFactory()
    )
    name = factory.Faker("name")
    # LazyAttributeSequence keeps company names realistic (via Faker) while
    # the trailing sequence number guarantees they stay unique even across
    # 500+ builds in one process, satisfying the unique-per-org constraint.
    company_name = factory.LazyAttributeSequence(lambda o, n: f"{fake.company()} {n}")
    owner = factory.SubFactory(
        CustomUserFactory, organization=factory.SelfAttribute("..organization")
    )
    segment = factory.fuzzy.FuzzyChoice(Customer.Segment.values)
    plan = factory.LazyAttribute(lambda o: random.choice(SEGMENT_PLAN_AFFINITY[o.segment]))
    health_score = 80
    mrr = factory.LazyAttribute(lambda o: random.randint(*PLAN_MRR_RANGES[o.plan]))
    annual_contract_value = factory.LazyAttribute(lambda o: o.mrr * 12)
    renewal_date = factory.LazyFunction(
        lambda: (timezone.now() + timezone.timedelta(days=random.randint(-30, 240))).date()
    )
    nps = factory.LazyFunction(lambda: random.randint(-80, 90))
    expansion_potential = factory.LazyFunction(lambda: random.randint(0, 100))


class EventLogFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = EventLog

    organization = factory.SelfAttribute("customer.organization")
    customer = factory.SubFactory(CustomerFactory)
    event_type = EventLog.EventType.LOGIN
    description = "User logged in."
    occurred_at = factory.LazyFunction(timezone.now)
