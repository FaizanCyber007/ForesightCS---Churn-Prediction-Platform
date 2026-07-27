import pytest
from django.contrib.auth.models import AnonymousUser
from rest_framework.test import APIRequestFactory

from core.factories import CustomUserFactory
from core.permissions import IsSuperUser, IsTenantAdmin

pytestmark = pytest.mark.django_db


@pytest.fixture
def request_factory():
    return APIRequestFactory()


def _request(request_factory, user):
    request = request_factory.get("/")
    request.user = user
    return request


class TestIsTenantAdmin:
    def test_allows_authenticated_org_admin(self, request_factory):
        user = CustomUserFactory(is_org_admin=True)
        assert IsTenantAdmin().has_permission(_request(request_factory, user), None) is True

    def test_denies_authenticated_non_admin(self, request_factory):
        user = CustomUserFactory(is_org_admin=False)
        assert IsTenantAdmin().has_permission(_request(request_factory, user), None) is False

    def test_denies_anonymous_user(self, request_factory):
        assert (
            IsTenantAdmin().has_permission(_request(request_factory, AnonymousUser()), None)
            is False
        )


class TestIsSuperUser:
    def test_allows_superuser(self, request_factory):
        user = CustomUserFactory(is_superuser=True, organization=None)
        assert IsSuperUser().has_permission(_request(request_factory, user), None) is True

    def test_denies_regular_user(self, request_factory):
        user = CustomUserFactory(is_superuser=False)
        assert IsSuperUser().has_permission(_request(request_factory, user), None) is False

    def test_denies_anonymous_user(self, request_factory):
        assert (
            IsSuperUser().has_permission(_request(request_factory, AnonymousUser()), None) is False
        )
