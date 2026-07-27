import pytest
from django.contrib.admin.sites import AdminSite

from core.factories import CustomUserFactory, OrganizationFactory
from customers.admin import CustomerAdmin, EventLogAdmin
from customers.factories import CustomerFactory, EventLogFactory
from customers.models import Customer, EventLog

pytestmark = pytest.mark.django_db


class _Request:
    def __init__(self, user):
        self.user = user


def test_customer_admin_hides_other_organizations_for_non_superuser_staff():
    org_a = OrganizationFactory()
    org_b = OrganizationFactory()
    CustomerFactory(organization=org_a, company_name="Own Org Co")
    CustomerFactory(organization=org_b, company_name="Other Org Co")
    staff = CustomUserFactory(organization=org_a, is_staff=True, is_superuser=False)

    admin_instance = CustomerAdmin(Customer, AdminSite())
    queryset = admin_instance.get_queryset(_Request(staff))

    assert set(queryset.values_list("company_name", flat=True)) == {"Own Org Co"}


def test_customer_admin_shows_all_organizations_for_superuser():
    org_a = OrganizationFactory()
    org_b = OrganizationFactory()
    CustomerFactory(organization=org_a)
    CustomerFactory(organization=org_b)
    superuser = CustomUserFactory(organization=None, is_staff=True, is_superuser=True)

    admin_instance = CustomerAdmin(Customer, AdminSite())
    queryset = admin_instance.get_queryset(_Request(superuser))

    assert queryset.count() == 2


def test_event_log_admin_hides_other_organizations_for_non_superuser_staff():
    org_a = OrganizationFactory()
    org_b = OrganizationFactory()
    EventLogFactory(customer=CustomerFactory(organization=org_a))
    EventLogFactory(customer=CustomerFactory(organization=org_b))
    staff = CustomUserFactory(organization=org_a, is_staff=True, is_superuser=False)

    admin_instance = EventLogAdmin(EventLog, AdminSite())
    queryset = admin_instance.get_queryset(_Request(staff))

    assert queryset.count() == 1
    assert queryset.first().organization_id == org_a.id
