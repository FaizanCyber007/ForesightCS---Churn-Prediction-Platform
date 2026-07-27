import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from core.factories import CustomUserFactory, OrganizationFactory

pytestmark = pytest.mark.django_db

PASSWORD = "correct-horse-battery-staple"


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def logged_in_client(api_client):
    user = CustomUserFactory(title="Founder")
    user.set_password(PASSWORD)
    user.save()
    login_response = api_client.post(
        reverse("auth_login"),
        {"identifier": user.username, "password": PASSWORD},
        format="json",
    )
    api_client.cookies = login_response.cookies
    return api_client, user


class TestUserMeView:
    def test_anonymous_request_is_rejected(self, api_client):
        response = api_client.patch(
            reverse("auth_user_me"), {"full_name": "New Name"}, format="json"
        )

        assert response.status_code == 401

    def test_updates_full_name_email_and_title(self, logged_in_client):
        client, user = logged_in_client

        response = client.patch(
            reverse("auth_user_me"),
            {"full_name": "Jordan Rivers", "email": "jordan@example.test", "title": "VP CS"},
            format="json",
        )

        assert response.status_code == 200
        assert response.data["user"]["fullName"] == "Jordan Rivers"
        assert response.data["user"]["email"] == "jordan@example.test"
        assert response.data["user"]["title"] == "VP CS"
        user.refresh_from_db()
        assert user.first_name == "Jordan"
        assert user.last_name == "Rivers"

    def test_duplicate_email_is_rejected(self, logged_in_client):
        client, user = logged_in_client
        CustomUserFactory(email="taken@example.test")

        response = client.patch(
            reverse("auth_user_me"), {"email": "taken@example.test"}, format="json"
        )

        assert response.status_code == 400
        assert "email" in response.data

    def test_partial_update_leaves_other_fields_untouched(self, logged_in_client):
        client, user = logged_in_client
        original_email = user.email

        response = client.patch(reverse("auth_user_me"), {"title": "Head of CS"}, format="json")

        assert response.status_code == 200
        assert response.data["user"]["email"] == original_email

    def test_blank_email_is_rejected(self, logged_in_client):
        client, user = logged_in_client
        original_email = user.email

        response = client.patch(reverse("auth_user_me"), {"email": ""}, format="json")

        assert response.status_code == 400
        assert "email" in response.data
        user.refresh_from_db()
        assert user.email == original_email


class TestOrganizationMeView:
    def test_anonymous_request_is_rejected(self, api_client):
        response = api_client.get(reverse("organization_me"))

        assert response.status_code == 401

    def test_get_returns_the_users_own_organization(self, logged_in_client):
        client, user = logged_in_client

        response = client.get(reverse("organization_me"))

        assert response.status_code == 200
        assert response.data["id"] == str(user.organization_id)
        assert response.data["name"] == user.organization.name

    def test_patch_updates_the_organization_name(self, logged_in_client):
        client, user = logged_in_client

        response = client.patch(
            reverse("organization_me"), {"name": "Renamed Workspace"}, format="json"
        )

        assert response.status_code == 200
        assert response.data["name"] == "Renamed Workspace"
        user.organization.refresh_from_db()
        assert user.organization.name == "Renamed Workspace"

    def test_slug_is_read_only(self, logged_in_client):
        client, user = logged_in_client
        original_slug = user.organization.slug

        response = client.patch(reverse("organization_me"), {"slug": "hacked-slug"}, format="json")

        assert response.status_code == 200
        user.organization.refresh_from_db()
        assert user.organization.slug == original_slug

    def test_patch_with_another_organizations_name_is_rejected(self, logged_in_client):
        client, user = logged_in_client

        OrganizationFactory(name="Taken Workspace")
        original_name = user.organization.name

        response = client.patch(
            reverse("organization_me"), {"name": "Taken Workspace"}, format="json"
        )

        assert response.status_code == 400
        assert "name" in response.data
        user.organization.refresh_from_db()
        assert user.organization.name == original_name

    def test_patch_with_own_unchanged_name_still_succeeds(self, logged_in_client):
        client, user = logged_in_client
        own_name = user.organization.name

        response = client.patch(reverse("organization_me"), {"name": own_name}, format="json")

        assert response.status_code == 200
        assert response.data["name"] == own_name

    def test_superuser_without_organization_gets_404(self, api_client):
        superuser = CustomUserFactory(is_superuser=True, organization=None)
        superuser.set_password(PASSWORD)
        superuser.save()
        login_response = api_client.post(
            reverse("auth_login"),
            {"identifier": superuser.username, "password": PASSWORD},
            format="json",
        )
        api_client.cookies = login_response.cookies

        response = api_client.get(reverse("organization_me"))

        assert response.status_code == 404
