import pytest

from notes.factories import CustomerNoteFactory
from notes.models import CustomerNote

pytestmark = pytest.mark.django_db


def test_soft_delete_excludes_from_default_manager():
    note = CustomerNoteFactory()
    note_id = note.id

    note.delete()

    assert not CustomerNote.objects.filter(id=note_id).exists()
    assert CustomerNote.all_objects.filter(id=note_id).exists()
    assert CustomerNote.all_objects.get(id=note_id).deleted_at is not None


def test_str_includes_customer_company_name():
    note = CustomerNoteFactory()
    assert note.customer.company_name in str(note)
