"""
JWT-in-HttpOnly-cookie authentication.

Tokens are never handed to client-side JS (see core.views.LoginView) --
they only ever travel as HttpOnly cookies, so authenticating a request
means reading the cookie instead of simplejwt's default `Authorization`
header. Cookie names/attributes are centralized here so LoginView and
LogoutView can't drift out of sync on what they set vs. what this class
reads.
"""

from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.tokens import RefreshToken

ACCESS_TOKEN_COOKIE = "access_token"
REFRESH_TOKEN_COOKIE = "refresh_token"


def _cookie_kwargs() -> dict:
    """Return the correct SameSite policy for the current deployment.

    - Local dev (DEBUG=True or no FRONTEND_URL): SameSite=Lax is fine because
      the frontend and backend share the same hostname (localhost). Lax is
      the safer default -- it blocks cross-site POST requests (CSRF vectors)
      while still attaching on same-site navigation.

    - Production (FRONTEND_URL is set): The Vercel frontend and the Render
      backend are on *different* registered domains (vercel.app vs.
      onrender.com), so the browser treats every API call as cross-site and
      refuses to attach SameSite=Lax cookies. SameSite=None; Secure is
      required for cross-domain cookie sharing. CORS + CORS_ALLOW_CREDENTIALS
      in settings.py limit which origins may actually use those cookies, so
      the CSRF risk of None is still contained.
    """
    frontend_url = getattr(settings, "FRONTEND_URL", "")
    if frontend_url:
        # Cross-domain production deployment -- must use None so the browser
        # attaches the cookie on cross-origin fetch requests.
        samesite = "None"
    else:
        # Same-site local dev -- Lax is the safer default.
        samesite = "Lax"
    return {"httponly": True, "secure": True, "samesite": samesite, "path": "/"}


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
    kwargs = _cookie_kwargs()

    response.set_cookie(
        ACCESS_TOKEN_COOKIE,
        str(access),
        max_age=int(api_settings.ACCESS_TOKEN_LIFETIME.total_seconds()),
        **kwargs,
    )
    response.set_cookie(
        REFRESH_TOKEN_COOKIE,
        str(refresh),
        max_age=int(api_settings.REFRESH_TOKEN_LIFETIME.total_seconds()),
        **kwargs,
    )


def clear_auth_cookies(response) -> None:
    response.delete_cookie(ACCESS_TOKEN_COOKIE, path="/", samesite=_cookie_kwargs()["samesite"])
    response.delete_cookie(REFRESH_TOKEN_COOKIE, path="/", samesite=_cookie_kwargs()["samesite"])
