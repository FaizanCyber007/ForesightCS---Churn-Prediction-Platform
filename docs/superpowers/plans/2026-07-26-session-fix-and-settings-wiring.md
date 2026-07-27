# Session Fix & Settings Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the reported "opening a link in a new tab logs me out" bug by implementing the silent-refresh flow the app has never had, and wire the inert Profile/Workspace Settings forms to real backend endpoints.

**Architecture:** Backend adds one new auth endpoint (`POST /api/v1/auth/refresh/`) that mints a fresh cookie pair from the still-valid refresh token, plus two small profile/workspace CRUD endpoints. Frontend's single shared `apiClient` gets a transparent single-retry-on-401 that calls the refresh endpoint before giving up, fixing both plain token expiry and the cross-tab blacklist race. Settings forms move from disabled stubs to real `react-hook-form` + Server Action forms, following the exact pattern `RuleBuilderForm`/`createHealthRuleAction` already establish elsewhere in this codebase.

**Tech Stack:** Django 5 / DRF / `rest_framework_simplejwt` / pytest-django (backend); Next.js 14 App Router / `react-hook-form` / `zod` / Vitest + React Testing Library (frontend).

## Global Constraints

- Multi-tenancy: every new/changed endpoint must resolve data through `request.user`/`request.user.organization` — never trust a client-supplied org id (CLAUDE.md ##1).
- Soft delete: not applicable to this plan's models (no new deletions).
- Front-to-back symmetry: every new Zod schema mirrors its DRF serializer field-for-field (CLAUDE.md ##3); DRF status codes stay RESTful (`200` for these PATCH/GET endpoints — none of them create a resource).
- DRY: reuse `set_auth_cookies`/`clear_auth_cookies`/`build_user_session` (backend) and the `FormActionResult<T>`/`zodIssuesToFieldErrors` Server Action pattern (frontend) rather than inventing new ones.
- Python lint/format: this session uses **`black` and `flake8`**, not `ruff` (`ruff` is blocked per the operator's explicit instruction, overriding `docs/engineering-standards.md`'s current wording — Task 1 updates those docs to match).
- TS lint: `npm run lint` (ESLint, existing config, unchanged).
- Every task ends with passing tests for the code it added, committed on its own.

---

### Task 1: Swap backend lint/format tooling from `ruff` to `black` + `flake8`

**Files:**
- Modify: `backend/pyproject.toml`
- Create: `backend/.flake8`
- Modify: `backend/requirements.txt`
- Modify: `docs/engineering-standards.md:3`
- Modify: `docs/roles/backend.md:7,21`

**Interfaces:**
- Produces: a working `black backend/` / `flake8 backend/` pair that every later backend task's steps run before committing.

- [ ] **Step 1: Replace the `[tool.ruff]` sections in `backend/pyproject.toml`**

Replace the entire file's `[tool.ruff]` / `[tool.ruff.lint]` / `[tool.ruff.lint.isort]` blocks (keep `[tool.pytest.ini_options]` as-is) with:

```toml
[tool.black]
line-length = 100
target-version = ["py312"]
extend-exclude = "/migrations/"

[tool.pytest.ini_options]
DJANGO_SETTINGS_MODULE = "foresight_backend.settings"
python_files = ["tests.py", "test_*.py", "*_tests.py"]
```

- [ ] **Step 2: Create `backend/.flake8`**

```ini
[flake8]
max-line-length = 100
extend-ignore = E203, W503
exclude = migrations,.venv,__pycache__
```

(`E203`/`W503` are the two rules that conflict with `black`'s own formatting choices — the standard flake8+black pairing excludes them.)

- [ ] **Step 3: Swap the dependency in `backend/requirements.txt`**

Replace the trailing `ruff` line with:

```
black==24.10.0
flake8==7.1.1
```

- [ ] **Step 4: Install and verify**

Run: `pip install black==24.10.0 flake8==7.1.1`
Run: `black --check backend/` (expect reformatting needed on nothing yet since no code changed — if it reports files to reformat, run `black backend/` and inspect the diff is whitespace-only)
Run: `flake8 backend/`
Expected: both exit 0 (flake8 may flag pre-existing issues `ruff` didn't catch — if so, fix only what's trivial/obviously safe, like unused imports; do not restructure unrelated code to satisfy flake8 opinions `ruff` didn't enforce, e.g. don't touch line lengths outside 100 that `ruff`'s `E501` already handled identically).

- [ ] **Step 5: Update docs to match**

In `docs/engineering-standards.md`, change line 3 from:
```
1. **Strict Linting**: The codebase must be CI-ready at all times. Python code MUST pass `ruff check .` and `ruff format .` with zero errors. TS code MUST pass `npm run lint`.
```
to:
```
1. **Strict Linting**: The codebase must be CI-ready at all times. Python code MUST pass `black --check .` and `flake8 .` with zero errors. TS code MUST pass `npm run lint`.
```

In `docs/roles/backend.md`, change:
```
**Tooling**: `ruff` (Python linting), `pytest` & `pytest-django`, `django-environ`, `factory_boy`, `drf-spectacular` (OpenAPI/Swagger docs).
```
to:
```
**Tooling**: `black` + `flake8` (Python linting/formatting), `pytest` & `pytest-django`, `django-environ`, `factory_boy`, `drf-spectacular` (OpenAPI/Swagger docs).
```
and:
```
- Format python: `cd backend && ruff format . && ruff check --fix .`
```
to:
```
- Format python: `cd backend && black . && flake8 .`
```

- [ ] **Step 6: Commit**

```bash
git add backend/pyproject.toml backend/.flake8 backend/requirements.txt docs/engineering-standards.md docs/roles/backend.md
git commit -m "chore(backend): swap ruff for black+flake8 per operator instruction"
```

---

### Task 2: Persist the job-title field on `CustomUser`

**Files:**
- Modify: `backend/core/models.py` (`CustomUser` class)
- Modify: `backend/core/serializers.py` (`RegisterSerializer.create`, `build_user_session`)
- Create: `backend/core/migrations/0006_customuser_title.py` (generated, not hand-written)
- Modify: `backend/core/test_auth.py` (`TestRegisterView`, `TestMeView`)

**Interfaces:**
- Produces: `CustomUser.title: str` (blank-default `""`); `build_user_session(user)["title"]`.
- Consumes: nothing new from other tasks.

- [ ] **Step 1: Write the failing tests first**

In `backend/core/test_auth.py`, update `TestRegisterView.test_valid_registration_creates_org_and_admin_user_and_logs_them_in` by adding two assertions (after the existing `assert response.data["user"]["role"] == "Admin"` line):

```python
        assert response.data["user"]["title"] == "Founder"
```

and after `user = CustomUser.objects.get(username="ari.johnson")`:

```python
        assert user.title == "Founder"
```

Add a new test to `TestMeView`:

```python
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && python -m pytest core/test_auth.py -v`
Expected: FAIL — `KeyError: 'title'` (the payload has no `title` key yet) and `AttributeError: 'CustomUser' object has no attribute 'title'`.

- [ ] **Step 3: Add the `title` field to `CustomUser`**

In `backend/core/models.py`, inside `class CustomUser(AbstractUser, BaseModel):`, add after the `is_org_admin` field:

```python
    title = models.CharField(
        max_length=100,
        blank=True,
        default="",
        help_text="Free-text job title (e.g. 'Founder', 'VP CS'), set at registration or in Settings.",
    )
```

- [ ] **Step 4: Persist it in `RegisterSerializer.create`**

In `backend/core/serializers.py`, in `RegisterSerializer.create`, change:

```python
            user = User(
                username=validated_data["username"],
                email=validated_data["email"],
                first_name=first_name,
                last_name=last_name,
                organization=organization,
                is_org_admin=True,
            )
```

to:

```python
            user = User(
                username=validated_data["username"],
                email=validated_data["email"],
                first_name=first_name,
                last_name=last_name,
                organization=organization,
                is_org_admin=True,
                title=validated_data.get("title", ""),
            )
```

Also update the class docstring's second sentence (currently: `` `title` (job title, e.g. "Founder") is accepted from the frontend's RegisterForm but intentionally not persisted -- there's no field on CustomUser for it today, and inventing one purely to round-trip a cosmetic onboarding dropdown wasn't worth a schema change for this pass. ``) to:

```
    `title` (job title, e.g. "Founder") is persisted onto the new user --
    see CustomUser.title.
```

- [ ] **Step 5: Add `title` to `build_user_session`**

In `backend/core/serializers.py`, change `build_user_session` to:

```python
def build_user_session(user) -> dict:
    """
    The UserSession payload shape shared by `LoginView`, `MeView`, and
    `RefreshView`.

    Kept in one place (CLAUDE.md ##4 DRY) so those endpoints can never
    drift out of sync on what a session actually contains. `role` is the
    computed Admin/User permission level (from `is_org_admin`); `title`
    is the separate free-text job title the user set at registration or
    in Settings -- the two used to collide under the same `role` key,
    which is why they're distinct fields here.
    """
    return {
        "id": str(user.id),
        "fullName": f"{user.first_name} {user.last_name}".strip() or user.username,
        "companyName": user.organization.name if user.organization else "Foresight Labs",
        "role": "Admin" if user.is_org_admin else "User",
        "title": user.title,
        "email": user.email,
        "username": user.username,
        "isSuperuser": user.is_superuser,
    }
```

- [ ] **Step 6: Generate and inspect the migration**

Run: `cd backend && python manage.py makemigrations core`
Expected: creates `backend/core/migrations/0006_customuser_title.py` (or similar auto-generated name) adding the `title` field. Open it and confirm it only adds that one field.

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd backend && python manage.py migrate && python -m pytest core/test_auth.py -v`
Expected: PASS, all of `TestRegisterView` and `TestMeView`.

- [ ] **Step 8: Lint and commit**

Run: `cd backend && black core/ && flake8 core/`

```bash
git add backend/core/models.py backend/core/serializers.py backend/core/migrations/0006_customuser_title.py backend/core/test_auth.py
git commit -m "feat(backend): persist user job title, closing RegisterSerializer's documented gap"
```

---

### Task 3: `POST /api/v1/auth/refresh/` — silent session renewal

**Files:**
- Modify: `backend/core/views.py` (add `RefreshView`)
- Modify: `backend/core/urls.py`
- Modify: `backend/core/test_auth.py` (add `TestRefreshView`)

**Interfaces:**
- Consumes: `core.authentication.{ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, set_auth_cookies, clear_auth_cookies}` (existing), `core.serializers.build_user_session` (existing, now includes `title` from Task 2).
- Produces: `POST /api/v1/auth/refresh/` (url name `auth_refresh`) — `200 {"user": <session>}` + fresh cookies on success, `401` + cleared cookies on failure. Task 5 (frontend) calls this by URL path, not by importing anything.

- [ ] **Step 1: Write the failing tests**

Add to `backend/core/test_auth.py`, after `class TestMeView` block:

```python
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && python -m pytest core/test_auth.py::TestRefreshView -v`
Expected: FAIL — `NoReverseMatch: Reverse for 'auth_refresh' not found`.

- [ ] **Step 3: Implement `RefreshView`**

In `backend/core/views.py`, change the import block from:

```python
from core.authentication import REFRESH_TOKEN_COOKIE, clear_auth_cookies, set_auth_cookies
from core.serializers import LoginSerializer, RegisterSerializer, build_user_session
```

to:

```python
from django.contrib.auth import get_user_model

from core.authentication import REFRESH_TOKEN_COOKIE, clear_auth_cookies, set_auth_cookies
from core.serializers import LoginSerializer, RegisterSerializer, build_user_session

User = get_user_model()
```

Then add, after `class LogoutView(APIView):` block and before `class MeView(APIView):`:

```python
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
            pass  # token_blacklist app not installed -- settings.py has it, so this is defensive only
        return response
```

- [ ] **Step 4: Register the URL**

In `backend/core/urls.py`, change:

```python
from django.urls import path

from .views import LoginView, LogoutView, MeView, RegisterView

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="auth_register"),
    path("auth/login/", LoginView.as_view(), name="auth_login"),
    path("auth/logout/", LogoutView.as_view(), name="auth_logout"),
    path("auth/me/", MeView.as_view(), name="auth_me"),
]
```

to:

```python
from django.urls import path

from .views import LoginView, LogoutView, MeView, RefreshView, RegisterView

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="auth_register"),
    path("auth/login/", LoginView.as_view(), name="auth_login"),
    path("auth/logout/", LogoutView.as_view(), name="auth_logout"),
    path("auth/refresh/", RefreshView.as_view(), name="auth_refresh"),
    path("auth/me/", MeView.as_view(), name="auth_me"),
]
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd backend && python -m pytest core/test_auth.py -v`
Expected: PASS, full file (existing tests unaffected, `TestRefreshView` now passes).

- [ ] **Step 6: Lint and commit**

Run: `cd backend && black core/ && flake8 core/`

```bash
git add backend/core/views.py backend/core/urls.py backend/core/test_auth.py
git commit -m "feat(backend): add POST /api/v1/auth/refresh/ for silent session renewal"
```

---

### Task 4: `PATCH /api/v1/auth/user/` + `GET/PATCH /api/v1/organizations/me/`

**Files:**
- Modify: `backend/core/serializers.py` (add `UserUpdateSerializer`, `OrganizationSerializer`)
- Modify: `backend/core/views.py` (add `UserMeView`, `OrganizationMeView`)
- Modify: `backend/core/urls.py`
- Create: `backend/core/test_settings_views.py`

**Interfaces:**
- Produces: `PATCH /api/v1/auth/user/` (url name `auth_user_me`) — `200 {"user": <session>}` or `400` field errors. `GET`/`PATCH /api/v1/organizations/me/` (url name `organization_me`) — `200 {"id", "name", "slug"}` or `404` (no organization, e.g. superuser) or `400` field errors.
- Consumes: `build_user_session` (Task 2/existing), `core.models.Organization` (existing).

- [ ] **Step 1: Write the failing tests**

Create `backend/core/test_settings_views.py`:

```python
import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from core.factories import CustomUserFactory

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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && python -m pytest core/test_settings_views.py -v`
Expected: FAIL — `NoReverseMatch` for both `auth_user_me` and `organization_me`.

- [ ] **Step 3: Add the serializers**

In `backend/core/serializers.py`, add after `RegisterSerializer` and before `def build_user_session`:

```python
class UserUpdateSerializer(serializers.ModelSerializer):
    """
    Backs `PATCH /api/v1/auth/user/`. `full_name` is a write-only
    passthrough (not a real model field), split into first_name/last_name
    the same way `RegisterSerializer.create` does, so both entry points
    stay consistent. Company name is deliberately not editable here --
    it's an Organization property, edited via `OrganizationSerializer`
    instead, never duplicated across two forms.
    """

    full_name = serializers.CharField(max_length=255, required=False)

    class Meta:
        model = User
        fields = ["full_name", "email", "title"]

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError("A user with that email already exists.")
        return value

    def update(self, instance, validated_data):
        full_name = validated_data.pop("full_name", None)
        if full_name is not None:
            first_name, _, last_name = full_name.strip().partition(" ")
            instance.first_name = first_name
            instance.last_name = last_name
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        return instance


class OrganizationSerializer(serializers.ModelSerializer):
    """Backs `GET`/`PATCH /api/v1/organizations/me/`. `slug` stays derived/immutable
    so existing references (e.g. billing webhooks matching on it) never break."""

    class Meta:
        model = Organization
        fields = ["id", "name", "slug"]
        read_only_fields = ["id", "slug"]
```

- [ ] **Step 4: Add the views**

In `backend/core/views.py`, change the import block to also pull in `IsAuthenticated` (already imported), `Http404`, and the new serializers:

```python
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
```

Then add, after `class MeView(APIView):` block:

```python
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
```

- [ ] **Step 5: Register the URLs**

In `backend/core/urls.py`:

```python
from django.urls import path

from .views import (
    LoginView,
    LogoutView,
    MeView,
    OrganizationMeView,
    RefreshView,
    RegisterView,
    UserMeView,
)

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="auth_register"),
    path("auth/login/", LoginView.as_view(), name="auth_login"),
    path("auth/logout/", LogoutView.as_view(), name="auth_logout"),
    path("auth/refresh/", RefreshView.as_view(), name="auth_refresh"),
    path("auth/me/", MeView.as_view(), name="auth_me"),
    path("auth/user/", UserMeView.as_view(), name="auth_user_me"),
    path("organizations/me/", OrganizationMeView.as_view(), name="organization_me"),
]
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd backend && python -m pytest core/test_settings_views.py -v`
Expected: PASS, all cases.

Run: `cd backend && python -m pytest core/ -v`
Expected: PASS, entire `core` app test suite (nothing else broken).

- [ ] **Step 7: Lint and commit**

Run: `cd backend && black core/ && flake8 core/`

```bash
git add backend/core/serializers.py backend/core/views.py backend/core/urls.py backend/core/test_settings_views.py
git commit -m "feat(backend): PATCH auth/user/ and GET/PATCH organizations/me/ for Settings"
```

---

### Task 5: Frontend `apiClient` — transparent refresh-and-retry on 401

**Files:**
- Modify: `frontend/lib/apiClient.ts`
- Create: `frontend/lib/apiClient.test.ts`

**Interfaces:**
- Produces: unchanged public API (`apiClient.get/post/patch/put/delete`) — the retry is entirely internal. Any 401 now transparently attempts `POST {baseUrl}/api/v1/auth/refresh/` once before falling through to existing `notifyUnauthorized()`/`ApiError` behavior.
- Consumes: nothing new (uses the endpoint from Task 3 by URL path only).

- [ ] **Step 1: Write the failing tests**

Create `frontend/lib/apiClient.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { apiClient, ApiError, UNAUTHORIZED_EVENT } from './apiClient';

function jsonResponse(status: number, body: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as Response;
}

describe('apiClient 401 refresh-and-retry', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('refreshes once and retries the original request after a 401', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { detail: 'Not authenticated.' }))
      .mockResolvedValueOnce(jsonResponse(200, { user: { id: '1' } }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    const result = await apiClient.get<{ ok: boolean }>('/api/v1/customers/');

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toContain('/api/v1/auth/refresh/');
  });

  it('still retries the original request even when the refresh call itself fails (cross-tab race)', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, {}))
      .mockResolvedValueOnce(jsonResponse(401, {}))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    const result = await apiClient.get<{ ok: boolean }>('/api/v1/customers/');

    expect(result).toEqual({ ok: true });
  });

  it('dispatches UNAUTHORIZED_EVENT and throws ApiError when the retry also 401s', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, {}))
      .mockResolvedValueOnce(jsonResponse(401, {}))
      .mockResolvedValueOnce(jsonResponse(401, { detail: 'Session expired.' }));

    const listener = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, listener);

    await expect(apiClient.get('/api/v1/customers/')).rejects.toBeInstanceOf(ApiError);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    window.removeEventListener(UNAUTHORIZED_EVENT, listener);
  });

  it('does not attempt a refresh for a 401 from the login endpoint itself', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { error: 'Invalid credentials.' }));

    await expect(
      apiClient.post(
        '/api/v1/auth/login/',
        { identifier: 'x', password: 'y' },
        { skipAuthRedirect: true }
      )
    ).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- apiClient.test.ts`
Expected: FAIL — no retry happens today, so calls 2/3 above never fire (`fetchMock` called once, result never resolves to the retried body).

- [ ] **Step 3: Implement the retry**

In `frontend/lib/apiClient.ts`, add near the top (after the `UNAUTHORIZED_EVENT`/`notifyUnauthorized` block, before `PaginatedResponse`):

```typescript
/**
 * 401s from these three endpoints are never worth a silent refresh-and-retry:
 * a failed login/register is a credentials problem, not an expired session,
 * and a 401 from the refresh call itself must not recursively try to
 * refresh again.
 */
const AUTH_ENDPOINTS_WITHOUT_REFRESH = new Set([
  '/api/v1/auth/login/',
  '/api/v1/auth/register/',
  '/api/v1/auth/refresh/',
]);
```

Then in the `ApiClient` class, add a field and a private method:

```typescript
class ApiClient {
  private readonly baseUrl: string;
  private refreshPromise: Promise<void> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  // ... existing get/post/patch/put/delete unchanged ...

  /**
   * Calls POST /api/v1/auth/refresh/ (see backend/core/views.py::RefreshView),
   * deduped per tab so concurrent 401s never fire more than one refresh
   * request at once. Resolves regardless of whether the refresh actually
   * succeeded -- `request()`'s caller always retries the original request
   * once afterward either way, which is what makes the cross-tab
   * ROTATE_REFRESH_TOKENS/BLACKLIST_AFTER_ROTATION race safe (see
   * docs/superpowers/specs/2026-07-26-session-fix-and-settings-wiring-design.md):
   * cookies are shared across tabs, so even a failed refresh in *this* tab
   * can still be followed by a successful retry if another tab's refresh
   * already rotated the cookie in the meantime.
   */
  private refreshSession(): Promise<void> {
    if (!this.refreshPromise) {
      this.refreshPromise = fetch(`${this.baseUrl}/api/v1/auth/refresh/`, {
        method: 'POST',
        credentials: 'include',
      })
        .catch(() => undefined)
        .then(() => undefined)
        .finally(() => {
          this.refreshPromise = null;
        });
    }
    return this.refreshPromise;
  }

  private async request<T>(path: string, options: RequestOptions, attempt = 0): Promise<T> {
    // ... unchanged body down to the `if (!response.ok) {` block ...
  }
}
```

Inside `private async request`, change the `if (!response.ok) {` block from:

```typescript
    if (!response.ok) {
      if (response.status === 401 && !skipAuthRedirect) {
        notifyUnauthorized();
      }
      if (response.status >= 500) {
        throw new ServiceUnavailableError(
          'The ForesightCS API returned a server error. The service may be temporarily unavailable.'
        );
      }
      throw new ApiError(response.status, normalizeFieldErrors(payload));
    }
```

to:

```typescript
    if (!response.ok) {
      if (
        response.status === 401 &&
        attempt === 0 &&
        !AUTH_ENDPOINTS_WITHOUT_REFRESH.has(path)
      ) {
        await this.refreshSession();
        return this.request<T>(path, options, attempt + 1);
      }

      if (response.status === 401 && !skipAuthRedirect) {
        notifyUnauthorized();
      }
      if (response.status >= 500) {
        throw new ServiceUnavailableError(
          'The ForesightCS API returned a server error. The service may be temporarily unavailable.'
        );
      }
      throw new ApiError(response.status, normalizeFieldErrors(payload));
    }
```

(The `get`/`post`/`patch`/`put`/`delete` public methods are unchanged — they already call `this.request<T>(path, {...})` without an `attempt` argument, which now defaults to `0`.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npm test -- apiClient.test.ts`
Expected: PASS, all four cases.

Run: `cd frontend && npm test`
Expected: PASS, full suite (no regressions in other files that use `apiClient`).

- [ ] **Step 5: Lint and commit**

Run: `cd frontend && npm run lint`

```bash
git add frontend/lib/apiClient.ts frontend/lib/apiClient.test.ts
git commit -m "fix(frontend): apiClient transparently refreshes and retries on 401

Fixes the reported 'opening a link in a new tab logs me out' bug: there
was no silent-refresh path at all, so any request made after the
15-minute access token expired looked like a dead session even with a
valid 7-day refresh token. Retrying the original request regardless of
whether the refresh call itself succeeded also fixes the cross-tab
ROTATE_REFRESH_TOKENS/BLACKLIST_AFTER_ROTATION race."
```

---

### Task 6: `AuthContext` — `title`, `updateUser`, `refreshSession`

**Files:**
- Modify: `frontend/context/auth-context.tsx`
- Create: `frontend/context/auth-context.test.tsx`

**Interfaces:**
- Consumes: `apiClient.get`/`apiClient.post` (existing, from Task 5's file but unchanged signatures).
- Produces: `UserSession.title: string`; `useAuth().updateUser(session: UserSession): void`; `useAuth().refreshSession(): Promise<void>`. Tasks 8/9 (ProfileSettings/WorkspaceSettings) call these.

- [ ] **Step 1: Write the failing tests**

Create `frontend/context/auth-context.test.tsx`:

```tsx
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AuthProvider, useAuth, type UserSession } from './auth-context';

vi.mock('@/lib/apiClient', async () => {
  const actual = await vi.importActual<typeof import('@/lib/apiClient')>('@/lib/apiClient');
  return {
    ...actual,
    apiClient: {
      get: vi.fn(),
      post: vi.fn(),
    },
  };
});

const sampleSession: UserSession = {
  id: '2',
  fullName: 'Updated Name',
  companyName: 'Co',
  role: 'Admin',
  title: 'CEO',
  email: 'a@b.test',
  username: 'a',
  isSuperuser: false,
};

function Probe() {
  const { user, updateUser, refreshSession } = useAuth();
  return (
    <div>
      <span data-testid="name">{user?.fullName ?? 'none'}</span>
      <button onClick={() => updateUser(sampleSession)}>set</button>
      <button onClick={() => refreshSession()}>refresh</button>
    </div>
  );
}

describe('AuthContext updateUser/refreshSession', () => {
  beforeEach(async () => {
    const { apiClient } = await import('@/lib/apiClient');
    vi.mocked(apiClient.get).mockReset();
    vi.mocked(apiClient.get).mockResolvedValue({ user: null });
  });

  it('updateUser replaces local session state directly, without a network call', async () => {
    const { apiClient } = await import('@/lib/apiClient');
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    const callsBeforeClick = vi.mocked(apiClient.get).mock.calls.length;

    await act(async () => {
      screen.getByText('set').click();
    });

    expect(screen.getByTestId('name').textContent).toBe('Updated Name');
    expect(vi.mocked(apiClient.get).mock.calls.length).toBe(callsBeforeClick);
  });

  it('refreshSession re-fetches /auth/me/ and applies the result', async () => {
    const { apiClient } = await import('@/lib/apiClient');
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({ user: null }) // initial mount effect
      .mockResolvedValueOnce({
        user: { ...sampleSession, id: '3', fullName: 'Refreshed Name' },
      });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByText('refresh').click();
    });

    expect(screen.getByTestId('name').textContent).toBe('Refreshed Name');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- auth-context.test.tsx`
Expected: FAIL — TS/runtime error, `updateUser`/`refreshSession` don't exist on the context yet.

- [ ] **Step 3: Add `title` to `UserSession` and the two new context methods**

In `frontend/context/auth-context.tsx`, change:

```typescript
export interface UserSession {
  id: string;
  fullName: string;
  companyName: string;
  role: string;
  email: string;
  username: string;
  isSuperuser: boolean;
}

interface AuthContextType {
  user: UserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (
    fullName: string,
    companyName: string,
    role: string,
    email: string,
    username: string,
    password: string
  ) => Promise<void>;
  logout: () => void;
}
```

to:

```typescript
export interface UserSession {
  id: string;
  fullName: string;
  companyName: string;
  role: string;
  title: string;
  email: string;
  username: string;
  isSuperuser: boolean;
}

interface AuthContextType {
  user: UserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (
    fullName: string,
    companyName: string,
    role: string,
    email: string,
    username: string,
    password: string
  ) => Promise<void>;
  logout: () => void;
  /** Replaces local session state directly from an already-fetched session object -- no network call. */
  updateUser: (session: UserSession) => void;
  /** Re-fetches /auth/me/ and applies the result -- for callers that only got back a partial resource (e.g. an Organization) and need the rest of `user` recomputed server-side. */
  refreshSession: () => Promise<void>;
}
```

Then, inside `AuthProvider`, add after the `logout` callback definition:

```typescript
  const updateUser = React.useCallback((session: UserSession) => {
    setUser(session);
  }, []);

  const refreshSession = React.useCallback(async () => {
    try {
      const data = await apiClient.get<{ user: UserSession }>('/api/v1/auth/me/', {
        skipAuthRedirect: true,
      });
      setUser(data.user);
    } catch {
      setUser(null);
    }
  }, []);
```

And add both to the provider's `value`:

```typescript
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateUser,
        refreshSession,
      }}
    >
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npm test -- auth-context.test.tsx`
Expected: PASS, both cases.

- [ ] **Step 5: Lint and commit**

Run: `cd frontend && npm run lint`

```bash
git add frontend/context/auth-context.tsx frontend/context/auth-context.test.tsx
git commit -m "feat(frontend): AuthContext gains title, updateUser, refreshSession"
```

---

### Task 7: `lib/schemas.ts` + `services/auth.ts` + `app/actions.ts` plumbing

**Files:**
- Modify: `frontend/lib/schemas.ts`
- Create: `frontend/services/auth.ts`
- Modify: `frontend/app/actions.ts`

**Interfaces:**
- Consumes: `UserSession` (Task 6, `@/context/auth-context`), `serverApiClient` (existing, `@/lib/serverApiClient`), `FormActionResult<T>` / `zodIssuesToFieldErrors` (existing, `@/app/actions`).
- Produces: `profileSettingsSchema`, `workspaceSettingsSchema` + their inferred `ProfileSettingsFormValues`/`WorkspaceSettingsFormValues` types (`@/lib/schemas`); `WorkspaceRecord` type + `updateUserProfile`, `getWorkspace`, `updateWorkspace` (`@/services/auth`); `updateProfileAction`, `getWorkspaceAction`, `updateWorkspaceAction` (`@/app/actions`). Tasks 8/9 consume all of these.

This task is pure plumbing with no independent UI yet — it's verified by the existing `lib/schemas.test.ts` pattern for the schemas, and end-to-end by Tasks 8/9's component tests for the services/actions. No new test file for this task alone (matching the codebase's existing convention: `services/rules.ts`, `services/playbooks.ts`, `services/admin.ts` have no dedicated unit tests either — they're exercised through the components/actions that call them).

- [ ] **Step 1: Add the two Zod schemas**

In `frontend/lib/schemas.ts`, add after `registerSchema` and before `healthRuleSchema`:

```typescript
/**
 * Mirrors backend/core/serializers.py::UserUpdateSerializer field-for-field
 * (see CLAUDE.md ##3 Front-to-Back Symmetry).
 */
export const profileSettingsSchema = z.object({
  full_name: z.string().min(2, 'Full name is required.').max(255),
  email: z.string().email('Enter a valid work email.'),
  title: z.string().max(100, 'Title must be 100 characters or fewer.'),
});

/**
 * Mirrors backend/core/serializers.py::OrganizationSerializer's writable
 * fields (see CLAUDE.md ##3 Front-to-Back Symmetry). `slug` is read-only
 * there, so it's omitted here.
 */
export const workspaceSettingsSchema = z.object({
  name: z.string().min(2, 'Workspace name is required.').max(255),
});
```

And at the bottom, add to the type exports:

```typescript
export type ProfileSettingsFormValues = z.infer<typeof profileSettingsSchema>;
export type WorkspaceSettingsFormValues = z.infer<typeof workspaceSettingsSchema>;
```

- [ ] **Step 2: Create `frontend/services/auth.ts`**

```typescript
import { serverApiClient as apiClient } from '@/lib/serverApiClient';
import type { UserSession } from '@/context/auth-context';
import type { ProfileSettingsFormValues, WorkspaceSettingsFormValues } from '@/lib/schemas';

export type WorkspaceRecord = {
  id: string;
  name: string;
  slug: string;
};

/** PATCH backend/core/views.py::UserMeView -- returns the full updated session. */
export async function updateUserProfile(values: ProfileSettingsFormValues): Promise<UserSession> {
  const data = await apiClient.patch<{ user: UserSession }>('/api/v1/auth/user/', values);
  return data.user;
}

/** GET backend/core/views.py::OrganizationMeView. */
export async function getWorkspace(): Promise<WorkspaceRecord> {
  return apiClient.get<WorkspaceRecord>('/api/v1/organizations/me/');
}

/** PATCH backend/core/views.py::OrganizationMeView. */
export async function updateWorkspace(
  values: WorkspaceSettingsFormValues
): Promise<WorkspaceRecord> {
  return apiClient.patch<WorkspaceRecord>('/api/v1/organizations/me/', values);
}
```

- [ ] **Step 3: Add the Server Actions**

In `frontend/app/actions.ts`, add to the import block:

```typescript
import { getWorkspace, updateUserProfile, updateWorkspace, type WorkspaceRecord } from '@/services/auth';
import type { UserSession } from '@/context/auth-context';
import {
  healthRuleSchema,
  customerSchema,
  playbookSchema,
  taskSchema,
  contactSchema,
  profileSettingsSchema,
  workspaceSettingsSchema,
} from '@/lib/schemas';
```

Then add, at the end of the file:

```typescript
/** Server Action backing the Settings -> Profile form. */
export async function updateProfileAction(
  values: unknown
): Promise<FormActionResult<UserSession>> {
  const parsed = profileSettingsSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, fieldErrors: zodIssuesToFieldErrors(parsed.error.issues) };
  }

  try {
    const user = await updateUserProfile(parsed.data);
    revalidatePath('/dashboard/settings');
    return { success: true, data: user };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, fieldErrors: error.fieldErrors };
    }
    throw error;
  }
}

/** Server Action fetching the current workspace for the Settings -> Workspace form. */
export async function getWorkspaceAction(): Promise<WorkspaceRecord> {
  return getWorkspace();
}

/** Server Action backing the Settings -> Workspace form. */
export async function updateWorkspaceAction(
  values: unknown
): Promise<FormActionResult<WorkspaceRecord>> {
  const parsed = workspaceSettingsSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, fieldErrors: zodIssuesToFieldErrors(parsed.error.issues) };
  }

  try {
    const organization = await updateWorkspace(parsed.data);
    revalidatePath('/dashboard/settings');
    return { success: true, data: organization };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, fieldErrors: error.fieldErrors };
    }
    throw error;
  }
}
```

- [ ] **Step 4: Verify the project still typechecks and existing tests pass**

Run: `cd frontend && npm test`
Expected: PASS, full suite (this task adds no new tests of its own, but must not break `lib/schemas.test.ts` or anything else).
Run: `cd frontend && npx tsc --noEmit`
Expected: no type errors.

- [ ] **Step 5: Lint and commit**

Run: `cd frontend && npm run lint`

```bash
git add frontend/lib/schemas.ts frontend/services/auth.ts frontend/app/actions.ts
git commit -m "feat(frontend): schemas/service/actions plumbing for Settings forms"
```

---

### Task 8: Rewrite `ProfileSettings` as a real form

**Files:**
- Modify: `frontend/components/features/settings/profile-settings.tsx`
- Create: `frontend/components/features/settings/__tests__/profile-settings.test.tsx`

**Interfaces:**
- Consumes: `useAuth()` (`user`, `updateUser` — Task 6), `updateProfileAction` (Task 7), `profileSettingsSchema`/`ProfileSettingsFormValues` (Task 7).

- [ ] **Step 1: Write the failing tests**

Create `frontend/components/features/settings/__tests__/profile-settings.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ProfileSettings } from '../profile-settings';

vi.mock('@/app/actions', () => ({
  updateProfileAction: vi.fn(),
}));

const mockUpdateUser = vi.fn();
const baseUser = {
  id: '1',
  fullName: 'Ari Johnson',
  companyName: "Ari's Workspace",
  role: 'Admin',
  title: 'Founder',
  email: 'ari@ari-workspace.test',
  username: 'ari.johnson',
  isSuperuser: false,
};

vi.mock('@/context/auth-context', () => ({
  useAuth: () => ({ user: baseUser, updateUser: mockUpdateUser }),
}));

describe('ProfileSettings component', () => {
  beforeEach(() => {
    mockUpdateUser.mockClear();
  });

  it('renders fields seeded from the current user', () => {
    render(<ProfileSettings />);

    expect(screen.getByDisplayValue('Ari Johnson')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Founder')).toBeInTheDocument();
    expect(screen.getByDisplayValue('ari@ari-workspace.test')).toBeInTheDocument();
  });

  it('shows a validation error and never calls the action when the email is invalid', async () => {
    const { updateProfileAction } = await import('@/app/actions');
    render(<ProfileSettings />);

    fireEvent.change(screen.getByDisplayValue('ari@ari-workspace.test'), {
      target: { value: 'not-an-email' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save profile changes/i }));

    await waitFor(() => {
      expect(screen.getByText(/enter a valid work email/i)).toBeInTheDocument();
    });
    expect(updateProfileAction).not.toHaveBeenCalled();
  });

  it('calls updateUser with the returned session on a successful save', async () => {
    const { updateProfileAction } = await import('@/app/actions');
    const updatedSession = { ...baseUser, fullName: 'Jordan Rivers', title: 'VP CS' };
    vi.mocked(updateProfileAction).mockResolvedValue({ success: true, data: updatedSession });

    render(<ProfileSettings />);
    fireEvent.click(screen.getByRole('button', { name: /save profile changes/i }));

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith(updatedSession);
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- profile-settings.test.tsx`
Expected: FAIL — current component has no form fields bound to a resolver, Save button is `disabled`, no call to `updateProfileAction` exists.

- [ ] **Step 3: Rewrite the component**

Replace the full contents of `frontend/components/features/settings/profile-settings.tsx`:

```tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { updateProfileAction } from '@/app/actions';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import { useAuth } from '@/context/auth-context';
import { profileSettingsSchema, type ProfileSettingsFormValues } from '@/lib/schemas';

export function ProfileSettings() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();

  const form = useForm<ProfileSettingsFormValues>({
    resolver: zodResolver(profileSettingsSchema) as never,
    defaultValues: {
      full_name: user?.fullName ?? '',
      email: user?.email ?? '',
      title: user?.title ?? '',
    },
  });

  async function onSubmit(values: ProfileSettingsFormValues) {
    const result = await updateProfileAction(values);

    if (!result.success) {
      let hadFieldMatch = false;
      for (const [field, messages] of Object.entries(result.fieldErrors)) {
        if (field in values) {
          form.setError(field as keyof ProfileSettingsFormValues, { message: messages[0] });
          hadFieldMatch = true;
        }
      }
      const topLevel = result.fieldErrors.non_field_errors?.[0];
      toast({
        title: 'Could not save profile',
        description: topLevel ?? (hadFieldMatch ? 'Check the highlighted fields.' : undefined),
        tone: 'error',
      });
      return;
    }

    updateUser(result.data);
    toast({ title: 'Profile updated', tone: 'success' });
  }

  return (
    <GlassCard className="space-y-6 relative overflow-hidden group">
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500/20 via-transparent to-transparent" />
      <div>
        <h2 className="font-semibold text-white text-base">Profile settings</h2>
        <p className="text-xs text-zinc-400 mt-0.5">Update your personal identification information and team role.</p>
      </div>

      <div className="flex items-center gap-4 pt-2">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-violet-600 text-lg font-bold text-white shadow-[0_4px_16px_rgba(16,185,129,0.2)]">
          {user?.fullName?.split(' ').map((w: string) => w[0]).join('').slice(0, 2) || 'CS'}
        </div>
        <div>
          <p className="font-semibold text-white text-base leading-tight">{user?.fullName || 'CS User'}</p>
          <p className="text-xs text-zinc-500 mt-1">
            {user?.companyName || 'Foresight Labs'} · {user?.role || 'User'}
          </p>
        </div>
      </div>

      <form className="grid gap-4 sm:grid-cols-2 pt-2" onSubmit={form.handleSubmit(onSubmit)}>
        <Field label="Full name" error={form.formState.errors.full_name?.message}>
          <Input className="h-10 text-sm" placeholder="Your name" {...form.register('full_name')} />
        </Field>
        <Field label="Role / Title" error={form.formState.errors.title?.message}>
          <Input className="h-10 text-sm" placeholder="e.g. CSM, VP CS" {...form.register('title')} />
        </Field>
        <Field
          label="Work email"
          error={form.formState.errors.email?.message}
          className="sm:col-span-2"
        >
          <Input
            className="h-10 text-sm"
            type="email"
            placeholder="you@company.com"
            {...form.register('email')}
          />
        </Field>

        <Button
          type="submit"
          variant="brand"
          className="h-10 text-xs sm:col-span-2 w-fit"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? 'Saving…' : 'Save profile changes'}
        </Button>
      </form>
    </GlassCard>
  );
}

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('space-y-1.5 block', className)}>
      <span className="text-xs font-semibold text-zinc-400">{label}</span>
      {children}
      {error ? (
        <p role="alert" className="text-[10px] font-semibold text-rose-400">
          {error}
        </p>
      ) : null}
    </label>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npm test -- profile-settings.test.tsx`
Expected: PASS, all three cases.

- [ ] **Step 5: Lint and commit**

Run: `cd frontend && npm run lint`

```bash
git add frontend/components/features/settings/profile-settings.tsx frontend/components/features/settings/__tests__/profile-settings.test.tsx
git commit -m "feat(frontend): wire ProfileSettings to PATCH /api/v1/auth/user/"
```

---

### Task 9: Rewrite `WorkspaceSettings`, fix `sidebar.tsx`'s title/role fallback

**Files:**
- Modify: `frontend/components/features/settings/workspace-settings.tsx`
- Modify: `frontend/components/layout/sidebar.tsx:183`
- Create: `frontend/components/features/settings/__tests__/workspace-settings.test.tsx`

**Interfaces:**
- Consumes: `useAuth().refreshSession` (Task 6), `getWorkspaceAction`/`updateWorkspaceAction` (Task 7), `workspaceSettingsSchema`/`WorkspaceSettingsFormValues` (Task 7).

- [ ] **Step 1: Write the failing tests**

Create `frontend/components/features/settings/__tests__/workspace-settings.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { WorkspaceSettings } from '../workspace-settings';

vi.mock('@/app/actions', () => ({
  getWorkspaceAction: vi.fn(),
  updateWorkspaceAction: vi.fn(),
}));

const mockRefreshSession = vi.fn();

vi.mock('@/context/auth-context', () => ({
  useAuth: () => ({ refreshSession: mockRefreshSession }),
}));

describe('WorkspaceSettings component', () => {
  beforeEach(async () => {
    mockRefreshSession.mockClear();
    const { getWorkspaceAction, updateWorkspaceAction } = await import('@/app/actions');
    vi.mocked(getWorkspaceAction).mockReset();
    vi.mocked(updateWorkspaceAction).mockReset();
    vi.mocked(getWorkspaceAction).mockResolvedValue({
      id: 'org-1',
      name: "Ari's Workspace",
      slug: 'aris-workspace',
    });
  });

  it('loads and displays the current workspace name', async () => {
    render(<WorkspaceSettings />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Ari's Workspace")).toBeInTheDocument();
    });
    expect(screen.getByText(/aris-workspace/i)).toBeInTheDocument();
  });

  it('blocks submit with a validation error when the name is cleared', async () => {
    const { updateWorkspaceAction } = await import('@/app/actions');
    render(<WorkspaceSettings />);
    await waitFor(() => screen.getByDisplayValue("Ari's Workspace"));

    fireEvent.change(screen.getByDisplayValue("Ari's Workspace"), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /save workspace changes/i }));

    await waitFor(() => {
      expect(screen.getByText(/workspace name is required/i)).toBeInTheDocument();
    });
    expect(updateWorkspaceAction).not.toHaveBeenCalled();
  });

  it('refreshes the session after a successful save', async () => {
    const { updateWorkspaceAction } = await import('@/app/actions');
    vi.mocked(updateWorkspaceAction).mockResolvedValue({
      success: true,
      data: { id: 'org-1', name: 'Renamed Workspace', slug: 'aris-workspace' },
    });

    render(<WorkspaceSettings />);
    await waitFor(() => screen.getByDisplayValue("Ari's Workspace"));
    fireEvent.click(screen.getByRole('button', { name: /save workspace changes/i }));

    await waitFor(() => {
      expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- workspace-settings.test.tsx`
Expected: FAIL — current component renders a static fake integrations list with no form/inputs.

- [ ] **Step 3: Rewrite the component**

Replace the full contents of `frontend/components/features/settings/workspace-settings.tsx`:

```tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import * as React from 'react';
import { useForm } from 'react-hook-form';

import { getWorkspaceAction, updateWorkspaceAction } from '@/app/actions';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/context/auth-context';
import { workspaceSettingsSchema, type WorkspaceSettingsFormValues } from '@/lib/schemas';

export function WorkspaceSettings() {
  const { refreshSession } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [slug, setSlug] = React.useState('');

  const form = useForm<WorkspaceSettingsFormValues>({
    resolver: zodResolver(workspaceSettingsSchema) as never,
    defaultValues: { name: '' },
  });

  React.useEffect(() => {
    let cancelled = false;
    getWorkspaceAction()
      .then((organization) => {
        if (cancelled) return;
        form.reset({ name: organization.name });
        setSlug(organization.slug);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // Runs once on mount only -- `form` is a stable react-hook-form instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(values: WorkspaceSettingsFormValues) {
    const result = await updateWorkspaceAction(values);

    if (!result.success) {
      for (const [field, messages] of Object.entries(result.fieldErrors)) {
        if (field in values) {
          form.setError(field as keyof WorkspaceSettingsFormValues, { message: messages[0] });
        }
      }
      const topLevel = result.fieldErrors.non_field_errors?.[0];
      toast({ title: 'Could not save workspace', description: topLevel, tone: 'error' });
      return;
    }

    await refreshSession();
    toast({ title: 'Workspace updated', tone: 'success' });
  }

  return (
    <GlassCard className="space-y-6 relative overflow-hidden group">
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-violet-500/20 via-transparent to-transparent" />
      <div>
        <h2 className="font-semibold text-white text-base">Workspace</h2>
        <p className="text-xs text-zinc-400 mt-0.5">Update the identity of your organization.</p>
      </div>

      <form className="space-y-4 pt-2" onSubmit={form.handleSubmit(onSubmit)}>
        <label className="space-y-1.5 block">
          <span className="text-xs font-semibold text-zinc-400">Workspace name</span>
          <Input
            className="h-10 text-sm"
            placeholder="Your company"
            disabled={loading}
            {...form.register('name')}
          />
          {form.formState.errors.name ? (
            <p role="alert" className="text-[10px] font-semibold text-rose-400">
              {form.formState.errors.name.message}
            </p>
          ) : null}
        </label>
        {slug ? <p className="text-[10px] text-zinc-500">Workspace URL slug: {slug}</p> : null}

        <Button
          type="submit"
          variant="brand"
          className="h-10 text-xs"
          disabled={loading || form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? 'Saving…' : 'Save workspace changes'}
        </Button>
      </form>
    </GlassCard>
  );
}
```

- [ ] **Step 4: Fix the sidebar's title/role fallback**

In `frontend/components/layout/sidebar.tsx`, change line 183 from:

```tsx
              {user?.role || 'CSM'} · {user?.companyName || 'Enterprise'}
```

to:

```tsx
              {user?.title || user?.role || 'CSM'} · {user?.companyName || 'Enterprise'}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd frontend && npm test -- workspace-settings.test.tsx`
Expected: PASS, all three cases.

Run: `cd frontend && npm test`
Expected: PASS, full suite.

- [ ] **Step 6: Lint and commit**

Run: `cd frontend && npm run lint`

```bash
git add frontend/components/features/settings/workspace-settings.tsx frontend/components/layout/sidebar.tsx frontend/components/features/settings/__tests__/workspace-settings.test.tsx
git commit -m "feat(frontend): wire WorkspaceSettings to GET/PATCH organizations/me/; fix sidebar title fallback"
```

---

### Task 10: Full verification pass + ADL entry

**Files:**
- Modify: `prompts.md` (append entry)

**Interfaces:**
- Consumes: everything from Tasks 1-9.
- Produces: nothing new — this is the closing verification + documentation task for the pillar.

- [ ] **Step 1: Run the entire backend suite**

Run: `cd backend && black --check . && flake8 . && python -m pytest`
Expected: all green, zero lint errors, zero test failures (including every pre-existing app's suite, not just `core`).

- [ ] **Step 2: Run the entire frontend suite**

Run: `cd frontend && npm run lint && npx tsc --noEmit && npm test`
Expected: all green.

- [ ] **Step 3: Manual smoke check of the actual bug**

Run: `cd backend && python start.py` (in one terminal) and `cd frontend && npm run dev` (in another). Log in at `http://localhost:3000/login`. In the browser devtools, manually expire the session by deleting the `access_token` cookie (leave `refresh_token` in place) and open a dashboard link in a new tab — it should load normally instead of bouncing to `/login` (confirms the fix end-to-end, not just via mocked unit tests). Then delete both cookies and confirm a genuinely dead session still correctly redirects to `/login`.

- [ ] **Step 4: Append the ADL entry to `prompts.md`**

Add, after the last existing entry (`## Prompt 20`), following that file's existing style (see e.g. `## Prompt 15`-`## Prompt 20` for tone/format):

```markdown

## Prompt 21
[QA Pillar 1] Fixed the reported cross-tab logout bug by implementing the
session-renewal flow the app never had: `POST /api/v1/auth/refresh/`
(backend) plus a transparent single-retry-on-401 in `apiClient`
(frontend), which also fixes the underlying `ROTATE_REFRESH_TOKENS`/
`BLACKLIST_AFTER_ROTATION` cross-tab race. Wired the previously-inert
Profile and Workspace Settings forms to new `PATCH /api/v1/auth/user/`
and `GET`/`PATCH /api/v1/organizations/me/` endpoints. Along the way,
fixed a pre-existing bug where the registration form's free-text job
title was silently discarded and collided with an unrelated `role` key
in the session payload -- `CustomUser.title` now persists it properly.
Full design: `docs/superpowers/specs/2026-07-26-session-fix-and-settings-wiring-design.md`.
```

- [ ] **Step 5: Commit**

```bash
git add prompts.md
git commit -m "docs: log Pillar 1 (session fix + settings wiring) in prompts.md ADL"
```
