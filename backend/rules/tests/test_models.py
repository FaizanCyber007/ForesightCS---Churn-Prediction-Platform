import pytest
from django.db import IntegrityError

from rules.factories import HealthRuleFactory
from rules.models import HealthRule

pytestmark = pytest.mark.django_db


def test_soft_delete_excludes_from_default_manager():
    rule = HealthRuleFactory()
    rule_id = rule.id

    rule.delete()

    assert not HealthRule.objects.filter(id=rule_id).exists()
    assert HealthRule.all_objects.filter(id=rule_id).exists()
    assert HealthRule.all_objects.get(id=rule_id).deleted_at is not None


def test_duplicate_active_name_within_org_is_rejected():
    rule = HealthRuleFactory(name="Login drop")

    with pytest.raises(IntegrityError):
        HealthRuleFactory(organization=rule.organization, name="Login drop")


def test_duplicate_name_allowed_across_organizations():
    rule = HealthRuleFactory(name="Login drop")
    other = HealthRuleFactory(name="Login drop")

    assert rule.organization_id != other.organization_id
