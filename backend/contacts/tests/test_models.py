import pytest

from contacts.factories import ContactFactory
from contacts.models import Contact

pytestmark = pytest.mark.django_db


def test_soft_delete_excludes_from_default_manager():
    contact = ContactFactory()
    contact_id = contact.id

    contact.delete()

    assert not Contact.objects.filter(id=contact_id).exists()
    assert Contact.all_objects.filter(id=contact_id).exists()
    assert Contact.all_objects.get(id=contact_id).deleted_at is not None


def test_str_includes_customer_company_name():
    contact = ContactFactory()
    assert contact.customer.company_name in str(contact)
