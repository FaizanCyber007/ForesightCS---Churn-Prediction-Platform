# Pillar 1: Session Persistence Fix & Settings Wiring

Status: Approved (autonomous execution per CLAUDE.md docs/autonomy.md)
Date: 2026-07-26

## Problem

### 1a. Cross-tab / session-expiry logout

Reported symptom: opening a link in a new tab logs the user out.

Root cause: there is no refresh-token flow implemented anywhere in the
app. `backend/core/urls.py` exposes only `register/`, `login/`,
`logout/`, `me/` — no `refresh/`. Access tokens (`SIMPLE_JWT` in
`settings.py`) live 15 minutes; nothing ever renews them. A tab that has
been open/idle past that window (very plausible: open a first tab, work
for 20 minutes, ctrl-click a link into a new tab) makes its first
`GET /api/v1/auth/me/` with an already-expired access token, gets a 401,
and `AuthProvider` (`frontend/context/auth-context.tsx`) treats that as
"not logged in" — even though the 7-day refresh-token cookie is still
valid. This isn't fundamentally a cross-tab bug; it's "no silent
renewal, ever," and a fresh tab is simply the most common way to trigger
a request after the access token has expired.

Cookie attributes (`backend/core/authentication.py::_COOKIE_KWARGS`:
`HttpOnly`, `Secure`, `SameSite=Lax`, `path=/`, `Max-Age` matching each
token's lifetime) are already correct for a single-domain deployment and
do not need to change.

### 1b. Settings forms don't save

`frontend/components/features/settings/profile-settings.tsx` and
`workspace-settings.tsx` are inert: Save buttons are `disabled`, and
`WorkspaceSettings` isn't even a real form — it renders a static fake
"Signal Integrations" list ("Unavailable"). No backend endpoint exists
for either update.

## Design

### Silent refresh

**Backend** — add `POST /api/v1/auth/refresh/` (`core.views.RefreshView`,
`AllowAny`):
- Reads `refresh_token` cookie. Missing/invalid/expired -> `401`,
  clears both cookies (mirrors `LogoutView`'s cookie-clearing so a dead
  cookie doesn't linger).
- Otherwise resolves the user from the token, issues a fresh pair via
  the existing `set_auth_cookies` helper (already used by
  Login/RegisterView — no new cookie-setting logic), then explicitly
  blacklists the old refresh token (`RefreshToken.blacklist()`). Manual
  blacklisting is needed because this view mints a brand-new pair via
  `RefreshToken.for_user()` rather than using simplejwt's built-in
  rotate-on-refresh path.
- Returns `{"user": build_user_session(user)}` on success — same shape
  as `LoginView`/`MeView`, so the frontend can update session state from
  it if useful without an extra round trip.

**Frontend** — `frontend/lib/apiClient.ts`'s private `request()` gets a
single retry-on-401:
- On a 401 from any endpoint *except* `login/`, `register/`, `refresh/`
  itself (to prevent loops), and only on the first attempt for that
  call: call a new `refreshSession()` helper (`POST /auth/refresh/`,
  in-flight calls deduped via one module-level promise so concurrent
  401s in the same tab don't fire multiple refresh requests), then
  retry the original request exactly once — **regardless of whether
  `refreshSession()` itself reported success**.
- Retrying unconditionally (not just on refresh success) is what fixes
  the genuine cross-tab race under `ROTATE_REFRESH_TOKENS` +
  `BLACKLIST_AFTER_ROTATION`: cookies are shared across all tabs in one
  browser, so if tab A's refresh already rotated the cookie by the time
  tab B's own refresh attempt lands (and fails, because its refresh
  token was just blacklisted by tab A), tab B's plain retry of the
  *original* request still succeeds — it picks up tab A's already-fresh
  access-token cookie instead of forcing a logout.
- If the retried request still 401s, existing behavior is unchanged:
  `notifyUnauthorized()` fires (unless `skipAuthRedirect`) and the
  caller gets the `ApiError`. `AuthProvider`'s existing
  `UNAUTHORIZED_EVENT` listener and `/auth/me/` `.catch` handle the
  terminal case exactly as today.
- This applies to `/auth/me/` too (its `skipAuthRedirect: true` only
  suppresses the global redirect event on final failure — it does not
  and should not skip the refresh attempt, since a tab whose access
  token merely expired is the primary case this fix targets).

No changes to `middleware.ts` (its cookie-presence check is unaffected)
or to `SIMPLE_JWT` lifetimes.

### Settings wiring

**Backend, `core` app:**
- `CustomUser` gets a new `title` field (`CharField, max_length=100,
  blank=True, default=""`) + migration. Closes the gap
  `RegisterSerializer`'s docstring already calls out ("no field on
  CustomUser for it today") — the Profile form has a Role/Title input
  that needs somewhere real to persist.
- **Naming collision found and fixed while scoping this:**
  `build_user_session()`'s `role` key is already used for the computed
  Admin/User permission level, but the registration form and
  `ProfileSettings`'s "Role / Title" input both treat "role" as a
  free-text job title (e.g. "Founder", "CSM") — exactly the value
  `RegisterSerializer` accepts as `title` and documents as never
  persisted. Fix: `RegisterSerializer.create()` now actually saves
  `title` onto the new user (previously silently discarded);
  `build_user_session()` adds a separate `"title"` key alongside the
  existing `"role"` key (both kept — `role` stays Admin/User, `title` is
  the free-text job title); `UserSession` (TS) gains `title`.
  `ProfileSettings`'s "Role / Title" input now binds to `title`, not
  `role`. `sidebar.tsx`'s subtitle (`{user?.role || 'CSM'} ·
  {user?.companyName}`) changes to `{user?.title || user?.role ||
  'CSM'}` so it shows the job title when set, falling back to the
  permission level otherwise — a one-line adjacent fix, not a new
  feature, since it's the same `title`-never-persisted bug surfacing a
  second place.
- `PATCH /api/v1/auth/user/` (`UserMeView`, `IsAuthenticated`): accepts
  `full_name` (split into `first_name`/`last_name`, same convention as
  `RegisterSerializer.create`), `email`, `title`. Returns
  `build_user_session(user)`. Company name is deliberately not editable
  here — it's a workspace-level property, edited via the endpoint below
  instead, not duplicated across two forms.
- `GET/PATCH /api/v1/organizations/me/` (`OrganizationMeView`,
  `IsAuthenticated`): resolves `request.user.organization` (404 if
  none, e.g. a superuser). `PATCH` accepts `name` only — `slug` stays
  derived/immutable so existing references never break.

**Frontend:**
- `AuthContext` gains two additions: `updateUser(session)` replaces
  local `user` state directly from an already-fetched session object
  (no extra round trip); `refreshSession()` re-fetches `/auth/me/` and
  applies the result the same way, for callers that only got back a
  partial resource (e.g. an Organization, not a full user session) and
  need the rest of `user` recomputed server-side.
- New `frontend/services/auth.ts` (server-side, `serverApiClient`):
  `updateUserProfile(values)` (`PATCH auth/user/`), `getOrganization()` /
  `updateOrganization(values)` (`GET`/`PATCH organizations/me/`).
- New Server Actions in `app/actions.ts`: `updateProfileAction`,
  `updateWorkspaceAction` — same `FormActionResult<T>` /
  `zodIssuesToFieldErrors` pattern every other form action in that file
  already uses.
- `ProfileSettings`: becomes a `react-hook-form` + `zodResolver` form
  (matching `RuleBuilderForm`'s established pattern) seeded from `user`,
  Save enabled, calls `updateProfileAction` then `useAuth().updateUser`
  with the returned session. Company name becomes a read-only display
  line (not an editable input) since it now belongs to Workspace
  settings only.
- `WorkspaceSettings`: replace the fake integrations list with a real
  form — fetches the org via a Server Component wrapper (or client
  fetch on mount) for `name`, PATCHes via `updateWorkspaceAction` on
  save, then calls `useAuth().refreshSession()` (the workspace PATCH
  response is an Organization, not a full user session, so this
  re-fetches `/auth/me/` to pick up the new `companyName` everywhere
  else it's shown, e.g. the sidebar).
- Zod schemas added to `lib/schemas.ts`: `profileSettingsSchema` (`full_name`,
  `email`, `title`) and `workspaceSettingsSchema` (`name`) mirroring both
  serializers (CLAUDE.md front-to-back symmetry).

**Explicitly out of scope** (not named in the QA ask, and no backing
model exists yet): password change, 2FA, notification-preference
persistence in `SecuritySettings`/`NotificationSettings` — left as the
existing disabled stubs.

## Testing

- Backend: `RefreshView` (valid/missing/invalid/expired/blacklisted
  refresh token), `UserMeView` PATCH (valid update, validation errors,
  cross-tenant isolation N/A — single-user resource), `OrganizationMeView`
  GET/PATCH (org-scoped, 404 for orgless superuser).
- Frontend: `apiClient` retry-on-401 behavior (refresh succeeds ->
  retry succeeds; refresh fails but retry succeeds anyway -> covers the
  cross-tab race; both fail -> `UNAUTHORIZED_EVENT`/`ApiError` as
  today), Zod schema validation, form submit happy/error paths.
