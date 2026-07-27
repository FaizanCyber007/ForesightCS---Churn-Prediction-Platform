import pytest

from tasks.factories import TaskFactory
from tasks.models import Task

pytestmark = pytest.mark.django_db


def test_soft_delete_excludes_from_default_manager():
    task = TaskFactory()
    task_id = task.id

    task.delete()

    assert not Task.objects.filter(id=task_id).exists()
    assert Task.all_objects.filter(id=task_id).exists()
    assert Task.all_objects.get(id=task_id).deleted_at is not None
