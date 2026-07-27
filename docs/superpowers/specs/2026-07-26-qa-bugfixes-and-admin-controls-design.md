# QA Bug Fixes & Admin Controls — Design

Status: Approved for implementation (autonomous execution per docs/autonomy.md).

## 1. Cross-tab logout — verification only, no behavior change

The reported bug ("opening a link in a new tab logs the user out") is already fixed on this
branch by prior work:

- `backend/core/authentication.py` — cookie kwargs are `httponly=True, secure=True,
  samesite="Lax", path="/"`, matching the requested `AUTH_COOKIE_SAMESITE='Lax'` + secure
  posture. No `AUTH_COOKIE_*` settings need adding; these are the single source of truth.
- `backend/core/views.py::RefreshView` mints a fresh access/refresh pair from the
  `refresh_token` cookie and blacklists the old refresh token.
- `frontend/lib/apiClient.ts` dedupes concurrent `refreshSession()` calls and retries a 401
  once, which makes the `ROTATE_REFRESH_TOKENS`/`BLACKLIST_AFTER_ROTATION` race across tabs
  safe (a second tab's stale-cookie 401 triggers a refresh that picks up the first tab's
  already-rotated cookie).
- `frontend/middleware.ts` gates protected routes on `refresh_token` presence, not
  `access_token` (whose 15-minute max-age previously caused false redirects to `/login` when
  opening a link in a new tab after being idle).

**Action**: read `backend/core/test_auth.py` for existing coverage of the rotate-under-race
scenario. If a test isn't already present that opens two "tabs" (two authenticated clients
sharing cookies) and asserts the second succeeds after the first rotates, add one. No
production code changes are planned for this item.

## 2. Terminology standardization: Accounts → Organizations / Customers

Audit finding: virtually every existing "Account" in this codebase already means the
end-customer entity (`customers.Customer`), not the tenant company. Only one line
(`frontend/app/admin/page.tsx:62`, "Suspend an account manually") means Organization. So this
work is a rename-for-consistency pass, not a meaning change, done end-to-end per the user's
choice of "full rename including backend."

### Frontend
- Route: `frontend/app/dashboard/accounts/` → `frontend/app/dashboard/customers/`.
- `frontend/lib/accounts.ts` → `frontend/lib/customers.ts`; `buildAccountSummaryCards` →
  `buildCustomerSummaryCards`.
- Nav/copy/aria-label rename ("Accounts" → "Customers") in: `components/layout/sidebar.tsx`,
  `components/layout/dashboard-header.tsx`, `components/ui/command-palette.tsx`,
  `components/features/customer-table.tsx`, `services/api.ts` (`getTopRiskAccounts` →
  `getTopRiskCustomers`, `totalAccounts` → `totalCustomers`, `AccountNoteApiRecord` →
  `CustomerNoteApiRecord`, `accountOwnerEmail` → `customerOwnerEmail`), `lib/analytics.ts`,
  `lib/schemas.ts` (comments only), `app/dashboard/page.tsx`, `app/dashboard/not-found.tsx`,
  `app/not-found.tsx`, `app/dashboard/customer/[id]/page.tsx` + `error.tsx`,
  `components/features/customer-360-parts/{header-card,notes-card,playbook-card}.tsx`,
  `components/features/{ai-insights,inbox-task-list,signal-feed,add-note-form,
  add-customer-modal,task-form-modal,contact-form-modal,customer-contacts,
  dashboard-metrics,playbook-list,dashboard-mockup,metric-charts}.tsx`, marketing copy in
  `app/layout.tsx`, `app/(marketing)/page.tsx`, `app/(marketing)/pricing/pricing-content.tsx`,
  `components/features/landing-sections.tsx`, and `app/actions.ts`
  (`revalidatePath('/dashboard/accounts')` → `/dashboard/customers`).
- `frontend/app/admin/page.tsx:62`: "Suspend an account manually" → "Suspend an organization
  manually" (this one is the Organization sense, not Customer).
- Leave untouched: `app/dashboard/settings/page.tsx:44` ("Manage your personal account...")
  and `services/admin.ts:49` (the seeded Django superuser login account) — both are generic
  "your login account" phrasing, not the Organization/Customer domain concepts.

### Backend
- `notes` app: rename model `AccountNote` → `CustomerNote` via a proper Django migration
  (`makemigrations notes --name rename_accountnote_to_customernote`), update
  `models.py, serializers.py (AccountNoteSerializer → CustomerNoteSerializer), views.py,
  urls.py, admin.py, factories.py, tests/*`. Keep the FK/related_name pointing at `Customer`
  (`related_name="notes"` on Customer stays as-is, per `customers/serializers.py` usage —
  only the model/serializer names change).
- `customers/serializers.py`: `account_owner_email` field/method → `customer_owner_email`
  (`get_account_owner_email` → `get_customer_owner_email`); update
  `CustomerDetailSerializer.get_recent_notes` to use `CustomerNoteSerializer`.
- `playbooks/{models,serializers,factories,admin}.py`: `accounts_in_play` →
  `customers_in_play`.
- `customers/seed_demo_data.py`: reword "accounts flagged Critical" etc. to "customers...".
- Leave untouched (per audit's explicit exclusion list): `django.contrib.auth`, Django's own
  migration/help-text copy, `core/mixins.py`'s generic "Your account has no organization"
  error, and every "super-admin account" reference (that's the Django superuser login, not a
  domain object).

### Tests
Update all tests referencing `AccountNote`/`AccountNoteSerializer`/`account_owner_email`/
`accounts_in_play` (backend `notes/tests/*`, `customers/tests/*`, `tasks/tests/test_api.py`,
`playbooks/tests/*`) to the new names. Update any frontend Vitest specs asserting on old
route/label strings.

## 3. Reactivate button

### Backend
Add to `backend/superadmin/views.py::OrganizationAdminViewSet`, directly beside `suspend`:

```python
@action(detail=True, methods=["post"], url_path="reactivate")
def reactivate(self, request, pk=None):
    """Manual override that reverses `suspend` (billing.services.reactivate_organization)."""
    organization = reactivate_organization(self.get_object(), actor=request.user)
    serializer = self.get_serializer(organization)
    return Response(serializer.data)
```

Import `reactivate_organization` alongside the existing `suspend_organization` import.
`billing/services.py::reactivate_organization` already exists, already sets
`subscription_status = ACTIVE` and logs `AuditLog.Action.ORG_REACTIVATED` — no service-layer
change needed. Route resolves to `POST /api/v1/admin/organizations/{id}/reactivate/` via the
existing router registration in `superadmin/urls.py`.

### Frontend
- `services/admin.ts`: add `reactivateOrganization(id)`, mirroring `suspendOrganization`
  exactly (same Basic-Auth headers, same response mapping).
- `app/actions.ts`: add `reactivateOrganizationAction(id)`, mirroring
  `suspendOrganizationAction` (revalidates `/admin`).
- `components/features/organization-table.tsx`: add a "Reactivate" button next to Suspend.
  Shown enabled only when `isSuspended` (inverse of Suspend's disabled condition); reuses the
  same `confirmTarget`/`pendingId` state and `Modal` pattern, with its own confirm copy
  ("`{name}` will be marked Active immediately.") and a `ShieldCheck` icon (already imported
  elsewhere in the codebase, e.g. `admin/page.tsx`) instead of `ShieldBan`.

### Tests
`backend/superadmin/tests/test_api.py`: add a test mirroring the existing suspend test —
reactivate a suspended org via the endpoint, assert `subscription_status == 'active'` and an
`ORG_REACTIVATED` audit log row was written.

## 4. View Customers by Organization

### Backend
Add to `OrganizationAdminViewSet`, same file, same auth/permission posture (`IsSuperUser`,
deliberately bypassing `TenantScopedViewSetMixin` like the rest of this viewset):

```python
@action(detail=True, methods=["get"], url_path="customers")
def customers(self, request, pk=None):
    organization = self.get_object()
    queryset = Customer.objects.filter(organization=organization).select_related("owner")
    page = self.paginate_queryset(queryset)
    serializer = CustomerSerializer(page, many=True)
    return self.get_paginated_response(serializer.data)
```

Reuses the existing `customers.serializers.CustomerSerializer` (no new serializer) and DRF's
built-in pagination (same `PaginatedResponse` shape the frontend already parses elsewhere).
Route: `GET /api/v1/admin/organizations/{id}/customers/`.

### Frontend
- `services/admin.ts`: add `getOrganizationCustomers(id)`, calling the new endpoint and
  mapping the response with the same `CustomerApiRecord → CustomerRecord` mapper already
  defined in `services/api.ts` (import/reuse it rather than duplicating the mapping — DRY per
  architecture.md ##4).
- `app/admin/page.tsx` (or a new small client component, e.g.
  `components/features/organization-customers-panel.tsx`, to keep the server/client
  boundary clean): add an Organization `<select>` above/beside the `OrganizationTable`,
  populated from the same `organizations` list already fetched for the page. On selection,
  client-fetches `getOrganizationCustomers(id)` (a route handler or server action wrapping
  it, since `services/admin.ts` is `server-only`) and renders results in a read-only glass
  table below the dropdown — reusing the existing table visual language (columns: name,
  company, plan, health, MRR) but as a simpler read-only table, not the full interactive
  `customer-table.tsx` (Super Admins don't need inline edit/health-recalculate here).
- No new route; everything stays on `/admin`.

### Tests
`backend/superadmin/tests/test_api.py`: add a test asserting a superuser can list Customers
for a given org id, and that a non-superuser gets 403/404 on this action (permission is
`IsSuperUser`, same as the rest of the viewset — no separate check needed, but worth a
regression test since this is the one place tenant isolation is intentionally bypassed).

## Out of scope
- No changes to `AUTH_COOKIE_*` Django settings (none exist; cookie config lives in
  `core/authentication.py` and is already correct).
- No versioned/dual-write API migration for the renamed fields — this is an internal Phase 1
  app with no external API consumers, so a direct rename is acceptable.
- No new frontend route for org-scoped customers (inline dropdown only, per design decision).
