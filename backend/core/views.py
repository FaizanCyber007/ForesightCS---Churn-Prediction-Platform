from django.contrib.auth import get_user_model
from django.http import Http404
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from core.authentication import REFRESH_TOKEN_COOKIE, clear_auth_cookies, set_auth_cookies
from core.serializers import (
    LoginSerializer,
    OrganizationSerializer,
    RegisterSerializer,
    UserUpdateSerializer,
    build_user_session,
)

User = get_user_model()


class LoginView(APIView):
    permission_classes = [AllowAny]
    # Its own tight scope (settings.py REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"])
    # independent of the generous anon/user defaults -- brute-forcing
    # credentials is the highest-value attack against this endpoint.
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            if "identifier" in serializer.errors or "password" in serializer.errors:
                return Response(
                    {"error": "Must provide identifier and password."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            return Response({"error": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)

        user = serializer.validated_data["user"]
        # Tokens are never included here -- they're only ever set as
        # HttpOnly cookies (CLAUDE.md ##1/##3: enterprise-grade auth, never
        # exposed to JS).
        response = Response({"user": build_user_session(user)})
        set_auth_cookies(response, user)
        return response


class RegisterView(APIView):
    """
    Founds a brand-new Organization + its first (is_org_admin) CustomUser,
    then logs them straight in -- same cookie-issuing contract as
    LoginView, so a successful signup lands the user in the dashboard
    exactly like a returning user logging in would.
    """

    permission_classes = [AllowAny]
    # Own scope, stricter than the generic anon rate -- registration
    # spam/abuse (mass-creating Organizations) is the risk here, not
    # credential brute-forcing.
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "register"

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        response = Response({"user": build_user_session(user)}, status=status.HTTP_201_CREATED)
        set_auth_cookies(response, user)
        return response


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_cookie = request.COOKIES.get(REFRESH_TOKEN_COOKIE)
        if refresh_cookie:
            try:
                RefreshToken(refresh_cookie).blacklist()
            except TokenError:
                pass  # already expired/invalid -- nothing left to invalidate

        response = Response(status=status.HTTP_204_NO_CONTENT)
        clear_auth_cookies(response)
        return response


class RefreshView(APIView):
    """
    Silent session renewal. Reads the refresh_token cookie and, if it's
    still valid, issues a fresh access/refresh pair -- letting a tab whose
    15-minute access token has simply expired stay logged in without a
    full re-login, as long as the 7-day refresh token hasn't also expired.

    This is the fix for the reported "opening a link in a new tab logs me
    out" bug (see docs/superpowers/specs/2026-07-26-session-fix-and-settings-wiring-design.md):
    there was previously no renewal path at all, so any request made
    after the access token expired -- most visibly a fresh tab's first
    `GET /auth/me/` -- looked like a dead session even though the refresh
    token was fine. Called automatically by frontend/lib/apiClient.ts on
    any 401, never directly by user action.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        raw_refresh = request.COOKIES.get(REFRESH_TOKEN_COOKIE)
        if not raw_refresh:
            response = Response(
                {"error": "No active session."}, status=status.HTTP_401_UNAUTHORIZED
            )
            clear_auth_cookies(response)
            return response

        try:
            refresh = RefreshToken(raw_refresh)
            requesting_user = User.objects.get(pk=refresh["user_id"])
        except (TokenError, User.DoesNotExist):
            response = Response(
                {"error": "Session expired. Please log in again."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            clear_auth_cookies(response)
            return response

        response = Response({"user": build_user_session(requesting_user)})
        # Mints a brand-new pair (rather than simplejwt's rotate-on-refresh)
        # so this can reuse the exact same cookie-issuing path as
        # Login/RegisterView (CLAUDE.md ##4 DRY) -- which is why the old
        # token needs an explicit blacklist call below instead of relying
        # on ROTATE_REFRESH_TOKENS to do it implicitly.
        set_auth_cookies(response, requesting_user)
        try:
            refresh.blacklist()
        except AttributeError:
            # token_blacklist app not installed -- settings.py has it, so
            # this is defensive only.
            pass
        return response


class MeView(APIView):
    """
    "Who am I right now" -- the frontend's AuthProvider calls this once on
    initial load to resolve real session state from the access_token
    cookie instead of trusting client-side-only state (e.g. localStorage)
    that could be stale or spoofed. A 401 here (no/invalid/expired cookie)
    is the signal the frontend treats as "not logged in".
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"user": build_user_session(request.user)})


class UserMeView(APIView):
    """Lets the authenticated user edit their own profile (Settings -> Profile tab)."""

    permission_classes = [IsAuthenticated]

    def patch(self, request):
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"user": build_user_session(request.user)})


class OrganizationMeView(APIView):
    """
    Lets an org member view/edit their own workspace (Settings -> Workspace
    tab). 404s for a superuser -- superusers aren't members of any tenant
    (CLAUDE.md ##1 Super Admin Bypass).
    """

    permission_classes = [IsAuthenticated]

    def _get_organization(self, request):
        organization = request.user.organization
        if organization is None:
            raise Http404("No organization for this account.")
        return organization

    def get(self, request):
        return Response(OrganizationSerializer(self._get_organization(request)).data)

    def patch(self, request):
        organization = self._get_organization(request)
        serializer = OrganizationSerializer(organization, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
