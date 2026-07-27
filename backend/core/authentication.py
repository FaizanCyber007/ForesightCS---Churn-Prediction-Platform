"""
JWT-in-HttpOnly-cookie authentication.

Tokens are never handed to client-side JS (see core.views.LoginView) --
they only ever travel as HttpOnly cookies, so authenticating a request
means reading the cookie instead of simplejwt's default `Authorization`
header. Cookie names/attributes are centralized here so LoginView and
LogoutView can't drift out of sync on what they set vs. what this class
reads.
"""

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.tokens import RefreshToken

ACCESS_TOKEN_COOKIE = "access_token"
REFRESH_TOKEN_COOKIE = "refresh_token"

# SameSite=Lax is this app's CSRF defense for JWT-authenticated requests
# (DRF's own CSRF enforcement only covers SessionAuthentication) -- it still
# attaches on same-site navigation/top-level GETs but not on cross-site
# POSTs, which is what actually matters for an API that takes state-changing
# requests. Secure is safe for local dev too: browsers treat http://localhost
# as a potentially-trustworthy origin and still accept Secure cookies there.
_COOKIE_KWARGS = {"httponly": True, "secure": True, "samesite": "Lax", "path": "/"}


class CookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        raw_token = request.COOKIES.get(ACCESS_TOKEN_COOKIE)
        if raw_token is None:
            return None
        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token


def set_auth_cookies(response, user) -> None:
    """Issue a fresh access/refresh token pair for `user` as HttpOnly cookies."""
    refresh = RefreshToken.for_user(user)
    access = refresh.access_token

    response.set_cookie(
        ACCESS_TOKEN_COOKIE,
        str(access),
        max_age=int(api_settings.ACCESS_TOKEN_LIFETIME.total_seconds()),
        **_COOKIE_KWARGS,
    )
    response.set_cookie(
        REFRESH_TOKEN_COOKIE,
        str(refresh),
        max_age=int(api_settings.REFRESH_TOKEN_LIFETIME.total_seconds()),
        **_COOKIE_KWARGS,
    )


def clear_auth_cookies(response) -> None:
    response.delete_cookie(ACCESS_TOKEN_COOKIE, path="/")
    response.delete_cookie(REFRESH_TOKEN_COOKIE, path="/")
