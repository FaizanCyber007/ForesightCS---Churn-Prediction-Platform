import pytest
from django.db import IntegrityError

from playbooks.factories import PlaybookFactory
from playbooks.models import Playbook

pytestmark = pytest.mark.django_db


def test_soft_delete_excludes_from_default_manager():
    playbook = PlaybookFactory()
    playbook_id = playbook.id

    playbook.delete()

    assert not Playbook.objects.filter(id=playbook_id).exists()
    assert Playbook.all_objects.filter(id=playbook_id).exists()
    assert Playbook.all_objects.get(id=playbook_id).deleted_at is not None


def test_duplicate_active_name_within_org_is_rejected():
    playbook = PlaybookFactory(name="Critical Churn Intervention")

    with pytest.raises(IntegrityError):
        PlaybookFactory(organization=playbook.organization, name="Critical Churn Intervention")
