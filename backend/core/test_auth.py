import pytest
from django.urls import reverse
from rest_framework.test import APIClient, APIRequestFactory
from rest_framework_simplejwt.exceptions import InvalidToken

from core.authentication import ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, CookieJWTAuthentication
from core.factories import CustomUserFactory
from core.models import CustomUser, Organization

pytestmark = pytest.mark.django_db

PASSWORD = "correct-horse-battery-staple"


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user():
    user = CustomUserFactory()
    user.set_password(PASSWORD)
    user.save()
    return user


class TestRegisterView:
    def _payload(self, **overrides):
        payload = {
            "full_name": "Ari Johnson",
            "company_name": "Ari's Workspace",
            "title": "Founder",
            "email": "ari@ari-workspace.test",
            "username": "ari.johnson",
            "password": "correct-horse-battery-staple-9",
        }
        payload.update(overrides)
        return payload

    def test_valid_registration_creates_org_and_admin_user_and_logs_them_in(self, api_client):
        response = api_client.post(reverse("auth_register"), self._payload(), format="json")

        assert response.status_code == 201
        assert response.data["user"]["fullName"] == "Ari Johnson"
        assert response.data["user"]["companyName"] == "Ari's Workspace"
        assert response.data["user"]["role"] == "Admin"
        assert response.data["user"]["title"] == "Founder"
        assert ACCESS_TOKEN_COOKIE in response.cookies

        organization = Organization.objects.get(name="Ari's Workspace")
        user = CustomUser.objects.get(username="ari.johnson")
        assert user.organization_id == organization.id
        assert user.is_org_admin is True
        assert user.title == "Founder"
        assert user.check_password("correct-horse-battery-staple-9")

    def test_duplicate_company_name_is_rejected(self, api_client):
        api_client.post(reverse("auth_register"), self._payload(), format="json")

        response = api_client.post(
            reverse("auth_register"),
            self._payload(username="someone.else", email="someone@else.test"),
            format="json",
        )

        assert response.status_code == 400
        assert "company_name" in response.data

    def test_duplicate_username_is_rejected(self, api_client, user):
        response = api_client.post(
            reverse("auth_register"),
            self._payload(username=user.username, company_name="A Different Company"),
            format="json",
        )

        assert response.status_code == 400
        assert "username" in response.data

    def test_weak_password_is_rejected(self, api_client):
        response = api_client.post(
            reverse("auth_register"), self._payload(password="password"), format="json"
        )

        assert response.status_code == 400
        assert "password" in response.data


class TestLoginView:
    def test_valid_login_sets_httponly_jwt_cookies_and_omits_tokens_from_body(
        self, api_client, user
    ):
        response = api_client.post(
            reverse("auth_login"),
            {"identifier": user.username, "password": PASSWORD},
            format="json",
        )

        assert response.status_code == 200
        assert "access" not in response.data["user"]
        assert "token" not in response.data["user"]
        assert response.data["user"]["id"] == str(user.id)
        assert response.data["user"]["username"] == user.username
        assert response.data["user"]["isSuperuser"] is False

        access_cookie = response.cookies[ACCESS_TOKEN_COOKIE]
        refresh_cookie = response.cookies[REFRESH_TOKEN_COOKIE]
        assert access_cookie["httponly"]
        assert access_cookie["secure"]
        assert access_cookie["samesite"] == "Lax"
        assert refresh_cookie["httponly"]
        assert refresh_cookie["secure"]
        assert refresh_cookie["samesite"] == "Lax"

    def test_login_by_email_works(self, api_client, user):
        response = api_client.post(
            reverse("auth_login"), {"identifier": user.email, "password": PASSWORD}, format="json"
        )

        assert response.status_code == 200

    def test_wrong_password_returns_401_and_sets_no_cookies(self, api_client, user):
        response = api_client.post(
            reverse("auth_login"),
            {"identifier": user.username, "password": "wrong-password"},
            format="json",
        )

        assert response.status_code == 401
        assert ACCESS_TOKEN_COOKIE not in response.cookies

    def test_missing_fields_returns_400(self, api_client):
        response = api_client.post(reverse("auth_login"), {}, format="json")

        assert response.status_code == 400


class TestLogoutView:
    def test_logout_clears_cookies(self, api_client, user):
        login_response = api_client.post(
            reverse("auth_login"),
            {"identifier": user.username, "password": PASSWORD},
            format="json",
        )
        api_client.cookies = login_response.cookies

        response = api_client.post(reverse("auth_logout"))

        assert response.status_code == 204
        assert response.cookies[ACCESS_TOKEN_COOKIE]["max-age"] == 0
        assert response.cookies[REFRESH_TOKEN_COOKIE]["max-age"] == 0

    def test_logout_blacklists_refresh_token_against_reuse(self, api_client, user):
        from rest_framework_simplejwt.exceptions import TokenError
        from rest_framework_simplejwt.tokens import RefreshToken

        login_response = api_client.post(
            reverse("auth_login"),
            {"identifier": user.username, "password": PASSWORD},
            format="json",
        )
        refresh_token = login_response.cookies[REFRESH_TOKEN_COOKIE].value
        api_client.cookies = login_response.cookies

        response = api_client.post(reverse("auth_logout"))

        assert response.status_code == 204
        with pytest.raises(TokenError):
            RefreshToken(refresh_token).blacklist()

    def test_logout_without_a_session_still_succeeds(self, api_client):
        response = api_client.post(reverse("auth_logout"))

        assert response.status_code == 204


class TestMeView:
    def test_anonymous_request_is_rejected(self, api_client):
        response = api_client.get(reverse("auth_me"))

        assert response.status_code == 401

    def test_authenticated_request_returns_the_same_shape_as_login(self, api_client, user):
        login_response = api_client.post(
            reverse("auth_login"),
            {"identifier": user.username, "password": PASSWORD},
            format="json",
        )
        api_client.cookies = login_response.cookies

        response = api_client.get(reverse("auth_me"))

        assert response.status_code == 200
        assert response.data["user"] == login_response.data["user"]

    def test_reflects_superuser_status(self, api_client):
        superuser = CustomUserFactory(is_superuser=True, organization=None)
        superuser.set_password(PASSWORD)
        superuser.save()
        login_response = api_client.post(
            reverse("auth_login"),
            {"identifier": superuser.username, "password": PASSWORD},
            format="json",
        )
        api_client.cookies = login_response.cookies

        response = api_client.get(reverse("auth_me"))

        assert response.status_code == 200
        assert response.data["user"]["isSuperuser"] is True

    def test_tampered_cookie_is_rejected(self, api_client, user):
        login_response = api_client.post(
            reverse("auth_login"),
            {"identifier": user.username, "password": PASSWORD},
            format="json",
        )
        api_client.cookies = login_response.cookies
        api_client.cookies[ACCESS_TOKEN_COOKIE] = "not-a-real-token"

        response = api_client.get(reverse("auth_me"))

        assert response.status_code == 401

    def test_reflects_title(self, api_client):
        titled_user = CustomUserFactory(title="Head of Customer Success")
        titled_user.set_password(PASSWORD)
        titled_user.save()
        login_response = api_client.post(
            reverse("auth_login"),
            {"identifier": titled_user.username, "password": PASSWORD},
            format="json",
        )
        api_client.cookies = login_response.cookies

        response = api_client.get(reverse("auth_me"))

        assert response.status_code == 200
        assert response.data["user"]["title"] == "Head of Customer Success"


class TestRefreshView:
    def test_valid_refresh_issues_new_cookies_and_blacklists_the_old_refresh_token(
        self, api_client, user
    ):
        from rest_framework_simplejwt.exceptions import TokenError
        from rest_framework_simplejwt.tokens import RefreshToken

        login_response = api_client.post(
            reverse("auth_login"),
            {"identifier": user.username, "password": PASSWORD},
            format="json",
        )
        old_refresh = login_response.cookies[REFRESH_TOKEN_COOKIE].value
        api_client.cookies = login_response.cookies

        response = api_client.post(reverse("auth_refresh"))

        assert response.status_code == 200
        assert response.data["user"]["username"] == user.username
        new_refresh = response.cookies[REFRESH_TOKEN_COOKIE].value
        assert new_refresh != old_refresh
        assert response.cookies[ACCESS_TOKEN_COOKIE].value
        with pytest.raises(TokenError):
            RefreshToken(old_refresh).blacklist()

    def test_missing_refresh_cookie_returns_401(self, api_client):
        response = api_client.post(reverse("auth_refresh"))

        assert response.status_code == 401

    def test_tampered_refresh_cookie_returns_401_and_clears_cookies(self, api_client):
        api_client.cookies[REFRESH_TOKEN_COOKIE] = "not-a-real-token"

        response = api_client.post(reverse("auth_refresh"))

        assert response.status_code == 401
        assert response.cookies[ACCESS_TOKEN_COOKIE]["max-age"] == 0
        assert response.cookies[REFRESH_TOKEN_COOKIE]["max-age"] == 0

    def test_already_blacklisted_refresh_token_returns_401(self, api_client, user):
        login_response = api_client.post(
            reverse("auth_login"),
            {"identifier": user.username, "password": PASSWORD},
            format="json",
        )
        refresh_token = login_response.cookies[REFRESH_TOKEN_COOKIE].value
        api_client.cookies = login_response.cookies
        api_client.post(reverse("auth_logout"))  # blacklists it

        api_client.cookies[REFRESH_TOKEN_COOKIE] = refresh_token
        response = api_client.post(reverse("auth_refresh"))

        assert response.status_code == 401


class TestCookieJWTAuthentication:
    """
    Exercises CookieJWTAuthentication directly via APIRequestFactory rather
    than through a real endpoint: DRF viewsets can (and some in this
    codebase do, e.g. CustomerViewSet) override `authentication_classes`
    away from the project defaults, so routing through one would only prove
    that particular viewset's wiring, not this authentication class itself.
    """

    def test_access_cookie_authenticates_the_request(self, api_client, user):
        login_response = api_client.post(
            reverse("auth_login"),
            {"identifier": user.username, "password": PASSWORD},
            format="json",
        )
        access_token = login_response.cookies[ACCESS_TOKEN_COOKIE].value
        request = APIRequestFactory().get("/")
        request.COOKIES[ACCESS_TOKEN_COOKIE] = access_token

        authenticated_user, validated_token = CookieJWTAuthentication().authenticate(request)

        assert authenticated_user == user

    def test_no_cookie_returns_none(self):
        request = APIRequestFactory().get("/")

        assert CookieJWTAuthentication().authenticate(request) is None

    def test_tampered_access_cookie_raises_invalid_token(self):
        request = APIRequestFactory().get("/")
        request.COOKIES[ACCESS_TOKEN_COOKIE] = "not-a-real-token"

        with pytest.raises(InvalidToken):
            CookieJWTAuthentication().authenticate(request)
