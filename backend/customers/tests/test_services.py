import pytest
from django.utils import timezone

from core.factories import OrganizationFactory
from customers.factories import CustomerFactory, EventLogFactory
from customers.models import Customer, EventLog
from customers.services import HealthScoreEngine
from rules.factories import HealthRuleFactory
from rules.models import HealthRule

pytestmark = pytest.mark.django_db


def test_low_volume_metric_violated_when_count_below_threshold():
    org = OrganizationFactory()
    customer = CustomerFactory(organization=org, health_score=100)
    HealthRuleFactory(
        organization=org, metric_type=HealthRule.MetricType.LOGIN, threshold=3, weight=15
    )
    EventLogFactory.create_batch(
        2, customer=customer, organization=org, event_type=EventLog.EventType.LOGIN
    )

    HealthScoreEngine(org).run()
    customer.refresh_from_db()

    assert customer.health_score == 85


def test_low_volume_metric_not_violated_when_count_meets_threshold():
    org = OrganizationFactory()
    customer = CustomerFactory(organization=org, health_score=100)
    HealthRuleFactory(
        organization=org, metric_type=HealthRule.MetricType.LOGIN, threshold=2, weight=15
    )
    EventLogFactory.create_batch(
        2, customer=customer, organization=org, event_type=EventLog.EventType.LOGIN
    )

    HealthScoreEngine(org).run()
    customer.refresh_from_db()

    assert customer.health_score == 100


def test_high_volume_metric_violated_when_count_at_or_above_threshold():
    org = OrganizationFactory()
    customer = CustomerFactory(organization=org, health_score=100)
    HealthRuleFactory(
        organization=org,
        metric_type=HealthRule.MetricType.SUPPORT_TICKET,
        threshold=3,
        weight=20,
    )
    EventLogFactory.create_batch(
        3, customer=customer, organization=org, event_type=EventLog.EventType.SUPPORT_TICKET
    )

    HealthScoreEngine(org).run()
    customer.refresh_from_db()

    assert customer.health_score == 80


def test_nps_metric_compares_customer_nps_field_not_event_count():
    org = OrganizationFactory()
    customer = CustomerFactory(organization=org, health_score=100, nps=5)
    HealthRuleFactory(
        organization=org, metric_type=HealthRule.MetricType.NPS_RESPONSE, threshold=20, weight=15
    )

    HealthScoreEngine(org).run()
    customer.refresh_from_db()

    assert customer.health_score == 85


def test_events_outside_evaluation_window_are_ignored():
    org = OrganizationFactory()
    customer = CustomerFactory(organization=org, health_score=100)
    HealthRuleFactory(
        organization=org, metric_type=HealthRule.MetricType.LOGIN, threshold=1, weight=15
    )
    EventLogFactory(
        customer=customer,
        organization=org,
        event_type=EventLog.EventType.LOGIN,
        occurred_at=timezone.now() - timezone.timedelta(days=90),
    )

    HealthScoreEngine(org).run()
    customer.refresh_from_db()

    # The stale login falls outside the 30-day window, so the recent count is
    # still 0 and the low-volume rule (< threshold) is violated.
    assert customer.health_score == 85


def test_score_floors_at_zero_instead_of_going_negative():
    org = OrganizationFactory()
    customer = CustomerFactory(organization=org, health_score=100, nps=-90)
    HealthRuleFactory(
        organization=org, metric_type=HealthRule.MetricType.NPS_RESPONSE, threshold=0, weight=90
    )
    HealthRuleFactory(
        organization=org, metric_type=HealthRule.MetricType.LOGIN, threshold=99, weight=90
    )

    HealthScoreEngine(org).run()
    customer.refresh_from_db()

    assert customer.health_score == 0


def test_run_scoped_to_customer_ids_leaves_other_customers_untouched():
    org = OrganizationFactory()
    target = CustomerFactory(organization=org, health_score=100, nps=5)
    other = CustomerFactory(organization=org, health_score=100, nps=5)
    HealthRuleFactory(
        organization=org, metric_type=HealthRule.MetricType.NPS_RESPONSE, threshold=20, weight=15
    )

    HealthScoreEngine(org).run(customer_ids=[target.id])
    target.refresh_from_db()
    other.refresh_from_db()

    assert target.health_score == 85
    assert other.health_score == 100


def test_no_active_rules_leaves_health_scores_unchanged():
    org = OrganizationFactory()
    customer = CustomerFactory(organization=org, health_score=42)
    HealthRuleFactory(
        organization=org,
        metric_type=HealthRule.MetricType.LOGIN,
        threshold=99,
        weight=50,
        is_active=False,
    )

    HealthScoreEngine(org).run()
    customer.refresh_from_db()

    assert customer.health_score == 42


def test_multiple_violated_rules_stack_their_weights():
    org = OrganizationFactory()
    customer = CustomerFactory(organization=org, health_score=100, nps=-10)
    HealthRuleFactory(
        organization=org, metric_type=HealthRule.MetricType.LOGIN, threshold=5, weight=15
    )
    HealthRuleFactory(
        organization=org, metric_type=HealthRule.MetricType.NPS_RESPONSE, threshold=0, weight=20
    )

    HealthScoreEngine(org).run()
    customer.refresh_from_db()

    assert customer.health_score == 65


def test_run_only_queries_customers_in_target_organization(django_assert_max_num_queries):
    org = OrganizationFactory()
    other_org = OrganizationFactory()
    CustomerFactory.create_batch(5, organization=org, health_score=100)
    CustomerFactory.create_batch(5, organization=other_org, health_score=100)
    HealthRuleFactory(
        organization=org, metric_type=HealthRule.MetricType.LOGIN, threshold=1, weight=10
    )
    HealthRuleFactory(
        organization=org, metric_type=HealthRule.MetricType.SUPPORT_TICKET, threshold=1, weight=10
    )

    # One query for active rules, one annotated query for customers, one
    # bulk UPDATE -- flat regardless of customer count (no N+1).
    with django_assert_max_num_queries(3):
        result = HealthScoreEngine(org).run()

    assert len(result) == 5
    assert Customer.objects.filter(organization=other_org, health_score=100).count() == 5
