import pytest

from customers.factories import CustomerFactory
from customers.models import Customer

pytestmark = pytest.mark.django_db


class TestCustomerModel:
    @pytest.mark.parametrize(
        "health_score,expected_tier",
        [
            (100, Customer.HEALTHY),
            (71, Customer.HEALTHY),
            (70, Customer.AT_RISK),
            (41, Customer.AT_RISK),
            (40, Customer.CRITICAL),
            (0, Customer.CRITICAL),
        ],
    )
    def test_health_tier_boundaries(self, health_score, expected_tier):
        customer = CustomerFactory(health_score=health_score)
        assert customer.health == expected_tier

    def test_churn_probability_is_inverse_of_health_score(self):
        customer = CustomerFactory(health_score=65)
        assert customer.churn_probability == 35

    def test_soft_delete_excludes_from_default_manager(self):
        customer = CustomerFactory()
        customer_id = customer.id

        customer.delete()

        assert not Customer.objects.filter(id=customer_id).exists()
        assert Customer.all_objects.filter(id=customer_id).exists()
        assert Customer.all_objects.get(id=customer_id).deleted_at is not None
