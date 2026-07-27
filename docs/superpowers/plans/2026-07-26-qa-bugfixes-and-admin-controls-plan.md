# QA Bug Fixes & Admin Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close out the cross-tab-logout verification, rename "Account(s)" to "Organization"/"Customer" consistently across backend and frontend, and ship two Super Admin hub features (Reactivate, View Customers by Organization).

**Architecture:** No new architecture — this extends the existing Django/DRF `superadmin`/`notes`/`playbooks`/`tasks`/`customers` apps and the existing Next.js App Router `admin`/`dashboard` surfaces, following patterns already in the codebase (mirrors `suspend`/`suspendOrganization`, mirrors `TenantScopedViewSetMixin`-bypass used by the rest of `superadmin`).

**Tech Stack:** Django 5 / DRF / PostgreSQL / pytest-django / factory_boy (backend). Next.js 14 App Router / TypeScript / Tailwind / Vitest (frontend).

## Global Constraints

- Python must pass `black --check .` and `flake8 .` with zero errors (docs/engineering-standards.md ##1).
- TS must pass `npm run lint` (docs/engineering-standards.md ##1).
- Every backend API change needs Pytest coverage; every frontend business-logic change affecting behavior needs a test where one is practical (docs/engineering-standards.md ##2).
- Multi-tenancy: all customer-record queries scoped by `organization_id` except the deliberate, `IsSuperUser`-gated `superadmin` app surfaces (docs/architecture.md ##1).
- Never hard-delete; soft-delete via `BaseModel`/`deleted_at` stays untouched by this work (docs/architecture.md ##2).
- DRF/Zod front-to-back symmetry and RESTful status codes (docs/architecture.md ##3).
- DRY: reuse existing serializers/mappers instead of duplicating (docs/architecture.md ##4).
- Premium dark-mode glassmorphic UI consistency for any new UI (CLAUDE.md execution constraints, docs/autonomy.md).
- Rename scope is bounded to in-app product surfaces (dashboard, admin, their backing services/serializers/tests). Marketing site copy (`frontend/app/(marketing)/**`, `landing-sections.tsx`, `dashboard-mockup.tsx`) and generic "your [login] account" phrasing are explicitly **out of scope** — see spec's "Out of scope" section.

---

## File Structure

**Backend — modified:**
- `backend/core/test_auth.py` — no change planned (already covers the refresh-rotation race; verified in Task 1).
- `backend/notes/{models,serializers,views,urls,admin,factories}.py`, `backend/notes/tests/{test_models,test_api}.py`, `backend/notes/migrations/0002_rename_accountnote_to_customernote.py` (new) — `AccountNote` → `CustomerNote`.
- `backend/customers/serializers.py` — `account_owner_email` → `customer_owner_email`; import `CustomerNoteSerializer`.
- `backend/customers/management/commands/seed_demo_data.py` — playbook description copy, `AccountNote` import/usage, `accounts_in_play` var.
- `backend/core/seeding/cleanup.py` — `AccountNote` → `CustomerNote` import/usage.
- `backend/playbooks/{models,serializers,factories,admin}.py`, `backend/playbooks/migrations/0002_rename_accounts_in_play.py` (new) — `accounts_in_play` → `customers_in_play`.
- `backend/tasks/serializers.py`, `backend/tasks/tests/test_api.py` — `related_account` → `related_customer`.
- `backend/superadmin/views.py` — add `reactivate` and `customers` actions.
- `backend/superadmin/tests/test_api.py` — tests for both new actions.

**Frontend — modified/created:**
- `frontend/middleware.test.ts` (new) — regression test for the cross-tab fix.
- `frontend/app/dashboard/accounts/page.tsx` → moved to `frontend/app/dashboard/customers/page.tsx`.
- `frontend/lib/accounts.ts` → moved to `frontend/lib/customers.ts` (`buildAccountSummaryCards` → `buildCustomerSummaryCards`).
- `frontend/components/layout/sidebar.tsx`, `frontend/app/actions.ts` — nav href/label, `revalidatePath` targets.
- `frontend/services/api.ts` — export `mapCustomerRecord`/`CustomerApiRecord`; `accountOwnerEmail`→`customerOwnerEmail`; `AccountNoteApiRecord`→`CustomerNoteApiRecord`; `getTopRiskAccounts`→`getTopRiskCustomers`; `totalAccounts`→`totalCustomers`; `accountsAtRisk`→`customersAtRisk`; `relatedAccount`/`related_account`→`relatedCustomer`/`related_customer`.
- `frontend/lib/analytics.ts`, `frontend/components/features/dashboard-metrics.tsx`, `frontend/components/features/metric-charts.tsx` — stat label renames.
- `frontend/app/dashboard/page.tsx` — import/usage rename.
- `frontend/services/playbooks.ts`, `frontend/lib/schemas.ts`, `frontend/app/dashboard/playbooks/page.tsx`, `frontend/components/features/playbook-list.tsx` — `accountsInPlay`→`customersInPlay`.
- `frontend/components/features/inbox-task-list.tsx`, `frontend/components/features/task-form-modal.tsx` — `relatedAccount` rename + copy.
- `frontend/components/features/customer-table.tsx`, `customer-360-parts/{header-card,notes-card,playbook-card}.tsx`, `customer-contacts.tsx`, `add-note-form.tsx`, `add-customer-modal.tsx`, `contact-form-modal.tsx`, `ai-insights.tsx`, `signal-feed.tsx`, `components/ui/command-palette.tsx`, `components/layout/dashboard-header.tsx`, `app/dashboard/not-found.tsx`, `app/dashboard/customer/[id]/page.tsx`, `app/dashboard/customer/[id]/error.tsx`, `app/admin/page.tsx` — copy renames.
- `frontend/services/admin.ts` — add `reactivateOrganization`, `getOrganizationCustomers`.
- `frontend/app/actions.ts` — add `reactivateOrganizationAction`, `getOrganizationCustomersAction`.
- `frontend/components/features/organization-table.tsx` — add Reactivate button/modal.
- `frontend/components/features/organization-customers-panel.tsx` (new) — dropdown + read-only customers table.
- `frontend/app/admin/page.tsx` — render the new panel.

---

### Task 1: Cross-tab logout — add the one missing regression test

**Files:**
- Create: `frontend/middleware.test.ts`
- Read (no change): `frontend/middleware.ts`, `backend/core/test_auth.py`, `frontend/lib/apiClient.test.ts`

**Interfaces:**
- Consumes: `middleware` (default export is a named export `middleware`, from `frontend/middleware.ts`).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write the test**

```ts
// frontend/middleware.test.ts
import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';

import { middleware } from './middleware';

function requestWithCookies(path: string, cookieHeader?: string): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });
}

describe('middleware', () => {
  it('allows the request through when refresh_token is present', () => {
    const response = middleware(requestWithCookies('/dashboard', 'refresh_token=still-valid'));

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('redirects to /login when refresh_token is absent', () => {
    const response = middleware(requestWithCookies('/dashboard'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/login');
  });

  it('does not bounce a request whose access_token is missing/expired as long as refresh_token is present -- this is the new-tab-after-15-minutes bug this middleware fixes', () => {
    const response = middleware(
      requestWithCookies('/dashboard/customers', 'refresh_token=still-valid')
    );

    expect(response.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run it to verify it currently passes (this is a regression test for already-fixed behavior, not new behavior — it should pass immediately)**

Run: `cd frontend && npx vitest run middleware.test.ts`
Expected: PASS (3 tests). If it fails, the middleware fix has regressed — stop and investigate before continuing to any other task.

- [ ] **Step 3: Commit**

```bash
git add frontend/middleware.test.ts
git commit -m "test(frontend): add regression coverage for the refresh_token-gated middleware"
```

---

### Task 2: Backend rename — `notes.AccountNote` → `notes.CustomerNote`

**Files:**
- Modify: `backend/notes/models.py`, `backend/notes/serializers.py`, `backend/notes/views.py`, `backend/notes/urls.py`, `backend/notes/admin.py`, `backend/notes/factories.py`
- Modify: `backend/notes/tests/test_models.py`, `backend/notes/tests/test_api.py`
- Modify: `backend/customers/serializers.py`, `backend/customers/management/commands/seed_demo_data.py`, `backend/core/seeding/cleanup.py`
- Create: `backend/notes/migrations/0002_rename_accountnote_to_customernote.py`

**Interfaces:**
- Produces: model `notes.models.CustomerNote` (was `AccountNote`), serializer `notes.serializers.CustomerNoteSerializer` (was `AccountNoteSerializer`), viewset `notes.views.CustomerNoteViewSet` (was `AccountNoteViewSet`), factory `notes.factories.CustomerNoteFactory` (was `AccountNoteFactory`). Related names: `Organization.customer_notes` and `CustomUser.customer_notes` (were `account_notes`). `Customer.notes` (unchanged — was already `notes`, not `account_notes`).
- Consumed by: Task 3 (`customers/serializers.py` already imports the old name, updated here).

- [ ] **Step 1: Update the model**

`backend/notes/models.py` — rename the class and both `related_name`s:

```python
from django.core.exceptions import ValidationError
from django.db import models

from core.models import BaseModel, CustomUser, Organization
from customers.models import Customer


class CustomerNote(BaseModel):
    """A free-text CS note logged against a Customer, shown on Customer 360."""

    organization = models.ForeignKey(
        Organization, on_delete=models.PROTECT, related_name="customer_notes"
    )
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="notes")
    author = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        related_name="customer_notes",
        null=True,
        blank=True,
    )
    body = models.TextField()

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Customer note"
        verbose_name_plural = "Customer notes"

    def __str__(self):
        return f"Note on {self.customer.company_name} @ {self.created_at:%Y-%m-%d}"

    def save(self, *args, **kwargs):
        if self.customer_id:
            if self.organization_id is None:
                self.organization_id = self.customer.organization_id
            elif self.organization_id != self.customer.organization_id:
                raise ValidationError(
                    {"organization": "organization must match the related customer's organization."}
                )
        super().save(*args, **kwargs)
```

- [ ] **Step 2: Update the serializer**

`backend/notes/serializers.py`:

```python
from rest_framework import serializers

from core.tenancy import resolve_write_organization
from notes.models import CustomerNote


class CustomerNoteSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = CustomerNote
        fields = ["id", "customer", "body", "author_name", "created_at"]
        read_only_fields = ["id", "created_at"]

    def get_author_name(self, obj) -> str:
        if not obj.author:
            return "Unassigned"
        return obj.author.get_full_name() or obj.author.username

    def validate_customer(self, value):
        organization = resolve_write_organization(self.context["request"])
        if value.organization_id != organization.id:
            raise serializers.ValidationError("Customer does not belong to your organization.")
        return value
```

- [ ] **Step 3: Update the viewset, urls, admin, factory**

`backend/notes/views.py`:

```python
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from core.mixins import IdempotencyKeyMixin, TenantScopedViewSetMixin
from notes.models import CustomerNote
from notes.serializers import CustomerNoteSerializer


class CustomerNoteViewSet(TenantScopedViewSetMixin, IdempotencyKeyMixin, ModelViewSet):
    queryset = CustomerNote.objects.select_related("customer", "author")
    serializer_class = CustomerNoteSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["customer"]

    def extra_create_kwargs(self) -> dict:
        return {"author": self.request.user}
```

`backend/notes/urls.py`:

```python
from rest_framework.routers import DefaultRouter

from notes.views import CustomerNoteViewSet

router = DefaultRouter()
router.register("notes", CustomerNoteViewSet, basename="note")

urlpatterns = router.urls
```

`backend/notes/admin.py`:

```python
from django.contrib import admin

from notes.models import CustomerNote


@admin.register(CustomerNote)
class CustomerNoteAdmin(admin.ModelAdmin):
    list_display = ("customer", "organization", "author", "created_at")
    list_filter = ("organization",)
    search_fields = ("customer__company_name", "body")
```

`backend/notes/factories.py`:

```python
import factory

from customers.factories import CustomerFactory
from notes.models import CustomerNote


class CustomerNoteFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = CustomerNote

    organization = factory.SelfAttribute("customer.organization")
    customer = factory.SubFactory(CustomerFactory)
    author = None
    body = factory.Sequence(lambda n: f"Demo note {n}")
```

- [ ] **Step 4: Update dependents outside `notes/`**

`backend/customers/serializers.py` line 6: `from notes.serializers import AccountNoteSerializer` → `from notes.serializers import CustomerNoteSerializer`. Line 99: `return AccountNoteSerializer(notes, many=True).data` → `return CustomerNoteSerializer(notes, many=True).data`.

`backend/customers/management/commands/seed_demo_data.py` line 11: `from notes.models import AccountNote` → `from notes.models import CustomerNote`; line 312: `AccountNote.objects.get_or_create(` → `CustomerNote.objects.get_or_create(`.

`backend/core/seeding/cleanup.py` line 14: `from notes.models import AccountNote` → `from notes.models import CustomerNote`; line 23: `AccountNote.all_objects.all().delete()` → `CustomerNote.all_objects.all().delete()`.

- [ ] **Step 5: Update the tests**

`backend/notes/tests/test_models.py` — replace every `AccountNoteFactory` → `CustomerNoteFactory` and `AccountNote` → `CustomerNote` (both imports and usages, 2 import lines + 5 usages per the current file).

`backend/notes/tests/test_api.py` — replace every `AccountNoteFactory` → `CustomerNoteFactory` and `AccountNote` → `CustomerNote` (imports + usages), and on line 45 replace `org_a.account_notes.all()` → `org_a.customer_notes.all()`.

- [ ] **Step 6: Write the migration**

Create `backend/notes/migrations/0002_rename_accountnote_to_customernote.py`:

```python
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("notes", "0001_initial"),
    ]

    operations = [
        migrations.RenameModel(old_name="AccountNote", new_name="CustomerNote"),
        migrations.AlterModelOptions(
            name="customernote",
            options={
                "ordering": ["-created_at"],
                "verbose_name": "Customer note",
                "verbose_name_plural": "Customer notes",
            },
        ),
        migrations.AlterField(
            model_name="customernote",
            name="author",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="customer_notes",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name="customernote",
            name="organization",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="customer_notes",
                to="core.organization",
            ),
        ),
    ]
```

- [ ] **Step 7: Verify the migration is complete and the app is consistent**

Run: `cd backend && python manage.py makemigrations notes --check --dry-run`
Expected: `No changes detected in app 'notes'` — if it reports pending changes, the hand-written migration above doesn't fully match the model; inspect the diff it wants to generate and add the missing operation(s) to `0002_rename_accountnote_to_customernote.py`.

- [ ] **Step 8: Run the app's test suite**

Run: `cd backend && python manage.py migrate notes && pytest notes/ customers/ -q`
Expected: all PASS.

- [ ] **Step 9: Commit**

```bash
git add backend/notes backend/customers/serializers.py backend/customers/management/commands/seed_demo_data.py backend/core/seeding/cleanup.py
git commit -m "refactor(backend): rename notes.AccountNote to CustomerNote"
```

---

### Task 3: Backend rename — `CustomerSerializer.account_owner_email` → `customer_owner_email`

**Files:**
- Modify: `backend/customers/serializers.py`

**Interfaces:**
- Produces: `CustomerSerializer` field `customer_owner_email` (API JSON key), method `get_customer_owner_email`.
- Consumed by: Task 9 (frontend `services/api.ts` reads this JSON key).

- [ ] **Step 1: Rename the field and method**

In `backend/customers/serializers.py`, in `CustomerSerializer`:

```python
    account_owner_email = serializers.SerializerMethodField()
```
→
```python
    customer_owner_email = serializers.SerializerMethodField()
```

and in `Meta.fields`, replace the string `"account_owner_email"` with `"customer_owner_email"`, and:

```python
    def get_account_owner_email(self, obj) -> str | None:
        if obj.owner and obj.owner.email.strip():
            return obj.owner.email
        return None
```
→
```python
    def get_customer_owner_email(self, obj) -> str | None:
        if obj.owner and obj.owner.email.strip():
            return obj.owner.email
        return None
```

- [ ] **Step 2: Run the customers test suite (no test currently asserts this field's key directly, so this should pass unchanged)**

Run: `cd backend && pytest customers/ -q`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/customers/serializers.py
git commit -m "refactor(backend): rename CustomerSerializer.account_owner_email to customer_owner_email"
```

---

### Task 4: Backend rename — `playbooks.accounts_in_play` → `customers_in_play`

**Files:**
- Modify: `backend/playbooks/models.py`, `backend/playbooks/serializers.py`, `backend/playbooks/factories.py`, `backend/playbooks/admin.py`, `backend/customers/management/commands/seed_demo_data.py`
- Create: `backend/playbooks/migrations/0002_rename_accounts_in_play.py`

**Interfaces:**
- Produces: `Playbook.customers_in_play` field (was `accounts_in_play`), same JSON key on `PlaybookSerializer`.
- Consumed by: Task 10 (frontend `services/playbooks.ts`).

- [ ] **Step 1: Rename the model field**

`backend/playbooks/models.py` — docstring line 10 and field:

```python
    `accounts_in_play`/`last_triggered` are stored fields, not live-computed
```
→
```python
    `customers_in_play`/`last_triggered` are stored fields, not live-computed
```

```python
    accounts_in_play = models.PositiveIntegerField(default=0)
```
→
```python
    customers_in_play = models.PositiveIntegerField(default=0)
```

- [ ] **Step 2: Rename in serializer, factory, admin**

`backend/playbooks/serializers.py`: replace both occurrences of `"accounts_in_play"` with `"customers_in_play"` (in `fields` list and `read_only_fields` list).

`backend/playbooks/factories.py`: `accounts_in_play = 0` → `customers_in_play = 0`.

`backend/playbooks/admin.py`: `"accounts_in_play"` → `"customers_in_play"` in `list_display`.

- [ ] **Step 3: Update the seed script**

`backend/customers/management/commands/seed_demo_data.py`:
- Line 125 comment: `# (name, description, trigger, status, accounts_in_play, steps)` → `# (name, description, trigger, status, customers_in_play, steps)`.
- Line 129: `"Executive-level outreach for accounts flagged Critical by the ML model."` → `"Executive-level outreach for customers flagged Critical by the ML model."`
- Line 142: `"Re-engage accounts with a sharp drop in product usage."` → `"Re-engage customers with a sharp drop in product usage."`
- Line 146: `["Flag account", "Send re-engagement email", "CS outreach call", "Log outcome"]` → `["Flag customer", "Send re-engagement email", "CS outreach call", "Log outcome"]`
- Line 158: `"Identify and act on accounts showing strong expansion signals."` → `"Identify and act on customers showing strong expansion signals."`
- Line 162: `["Flag account", "Prepare expansion proposal", "Schedule upsell call", "Log outcome"]` → `["Flag customer", "Prepare expansion proposal", "Schedule upsell call", "Log outcome"]`
- Line 295: `for name, description, trigger, status, accounts_in_play, steps in DEMO_PLAYBOOKS:` → `for name, description, trigger, status, customers_in_play, steps in DEMO_PLAYBOOKS:`
- Line 303: `"accounts_in_play": accounts_in_play,` → `"customers_in_play": customers_in_play,`

- [ ] **Step 4: Write the migration**

Create `backend/playbooks/migrations/0002_rename_accounts_in_play.py`:

```python
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("playbooks", "0001_initial"),
    ]

    operations = [
        migrations.RenameField(
            model_name="playbook",
            old_name="accounts_in_play",
            new_name="customers_in_play",
        ),
    ]
```

- [ ] **Step 5: Verify and test**

Run: `cd backend && python manage.py makemigrations playbooks --check --dry-run`
Expected: `No changes detected in app 'playbooks'`.

Run: `cd backend && python manage.py migrate playbooks && pytest playbooks/ -q`
Expected: PASS (existing tests don't assert the field name directly, per current `playbooks/tests/`, so this should pass unchanged).

- [ ] **Step 6: Commit**

```bash
git add backend/playbooks backend/customers/management/commands/seed_demo_data.py
git commit -m "refactor(backend): rename Playbook.accounts_in_play to customers_in_play"
```

---

### Task 5: Backend rename — `TaskSerializer.related_account` → `related_customer`

**Files:**
- Modify: `backend/tasks/serializers.py`, `backend/tasks/tests/test_api.py`

**Interfaces:**
- Produces: `TaskSerializer` field `related_customer` (API JSON key), method `get_related_customer`.
- Consumed by: Task 11 (frontend `services/api.ts` Task type, `inbox-task-list.tsx`, `task-form-modal.tsx`).

- [ ] **Step 1: Rename in the serializer**

`backend/tasks/serializers.py`:

```python
    related_account = serializers.SerializerMethodField()
```
→
```python
    related_customer = serializers.SerializerMethodField()
```

In `Meta.fields`, replace `"related_account"` with `"related_customer"`.

```python
    def get_related_account(self, obj) -> str | None:
        return obj.customer.company_name if obj.customer else None
```
→
```python
    def get_related_customer(self, obj) -> str | None:
        return obj.customer.company_name if obj.customer else None
```

- [ ] **Step 2: Update the test**

`backend/tasks/tests/test_api.py`:

```python
def test_related_account_reflects_customer_company_name(api_client):
```
→
```python
def test_related_customer_reflects_customer_company_name(api_client):
```

and:

```python
    assert response.data["related_account"] == "Acme Co"
```
→
```python
    assert response.data["related_customer"] == "Acme Co"
```

- [ ] **Step 3: Run the tests**

Run: `cd backend && pytest tasks/ -q`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/tasks/serializers.py backend/tasks/tests/test_api.py
git commit -m "refactor(backend): rename TaskSerializer.related_account to related_customer"
```

---

### Task 6: Backend — Reactivate action on the Super Admin Organization viewset

**Files:**
- Modify: `backend/superadmin/views.py`
- Modify: `backend/superadmin/tests/test_api.py`

**Interfaces:**
- Consumes: `billing.services.reactivate_organization(organization, actor=None) -> Organization` (already exists, unchanged).
- Produces: `POST /api/v1/admin/organizations/{id}/reactivate/`, DRF route name `admin-organization-reactivate` (DefaultRouter convention matching the existing `admin-organization-suspend`).

- [ ] **Step 1: Write the failing test**

Add to `backend/superadmin/tests/test_api.py`, directly after `test_suspend_action_requires_superuser`:

```python
def test_reactivate_action_sets_subscription_status(api_client, superuser):
    org = OrganizationFactory(subscription_status=Organization.SubscriptionStatus.SUSPENDED)
    api_client.force_authenticate(user=superuser)

    response = api_client.post(reverse("admin-organization-reactivate", args=[org.id]))

    assert response.status_code == 200
    assert response.data["subscription_status"] == Organization.SubscriptionStatus.ACTIVE
    org.refresh_from_db()
    assert org.subscription_status == Organization.SubscriptionStatus.ACTIVE
    entry = AuditLog.objects.get(action=AuditLog.Action.ORG_REACTIVATED)
    assert entry.organization_id == org.id
    assert entry.actor_id == superuser.id


def test_reactivate_action_requires_superuser(api_client):
    org = OrganizationFactory(subscription_status=Organization.SubscriptionStatus.SUSPENDED)
    user = CustomUserFactory(organization=org)
    api_client.force_authenticate(user=user)

    response = api_client.post(reverse("admin-organization-reactivate", args=[org.id]))

    assert response.status_code == 403
    org.refresh_from_db()
    assert org.subscription_status == Organization.SubscriptionStatus.SUSPENDED
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd backend && pytest superadmin/tests/test_api.py -k reactivate -q`
Expected: FAIL — `NoReverseMatch: Reverse for 'admin-organization-reactivate' not found`.

- [ ] **Step 3: Implement the action**

In `backend/superadmin/views.py`, change the import line:

```python
from billing.services import suspend_organization
```
→
```python
from billing.services import reactivate_organization, suspend_organization
```

Add, directly after the existing `suspend` action:

```python
    @action(detail=True, methods=["post"], url_path="reactivate")
    def reactivate(self, request, pk=None):
        """Manual override that reverses `suspend` (billing.services.reactivate_organization)."""
        organization = reactivate_organization(self.get_object(), actor=request.user)
        serializer = self.get_serializer(organization)
        return Response(serializer.data)
```

- [ ] **Step 4: Run it to verify it passes**

Run: `cd backend && pytest superadmin/tests/test_api.py -k reactivate -q`
Expected: PASS (2 tests).

- [ ] **Step 5: Run the full superadmin suite**

Run: `cd backend && pytest superadmin/ -q`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/superadmin/views.py backend/superadmin/tests/test_api.py
git commit -m "feat(backend): add POST admin/organizations/{id}/reactivate/"
```

---

### Task 7: Backend — View Customers by Organization endpoint

**Files:**
- Modify: `backend/superadmin/views.py`
- Modify: `backend/superadmin/tests/test_api.py`

**Interfaces:**
- Consumes: `customers.serializers.CustomerSerializer` (unchanged), `customers.models.Customer` (unchanged).
- Produces: `GET /api/v1/admin/organizations/{id}/customers/`, DRF route name `admin-organization-customers`, paginated `CustomerSerializer` response (same shape as `GET /api/v1/customers/`).

- [ ] **Step 1: Write the failing tests**

Add to `backend/superadmin/tests/test_api.py`, after the reactivate tests from Task 6:

```python
def test_customers_action_lists_only_that_organizations_customers(api_client, superuser):
    org_a = OrganizationFactory()
    org_b = OrganizationFactory()
    CustomerFactory.create_batch(2, organization=org_a, owner=None)
    CustomerFactory.create_batch(3, organization=org_b, owner=None)
    api_client.force_authenticate(user=superuser)

    response = api_client.get(reverse("admin-organization-customers", args=[org_a.id]))

    assert response.status_code == 200
    assert response.data["count"] == 2


def test_customers_action_requires_superuser(api_client):
    org = OrganizationFactory()
    user = CustomUserFactory(organization=org)
    api_client.force_authenticate(user=user)

    response = api_client.get(reverse("admin-organization-customers", args=[org.id]))

    assert response.status_code == 403
```

- [ ] **Step 2: Run to verify failure**

Run: `cd backend && pytest superadmin/tests/test_api.py -k customers_action -q`
Expected: FAIL — `NoReverseMatch: Reverse for 'admin-organization-customers' not found`.

- [ ] **Step 3: Implement the action**

In `backend/superadmin/views.py`, add to the imports:

```python
from customers.models import Customer
from customers.serializers import CustomerSerializer
```

Add, directly after the `reactivate` action added in Task 6:

```python
    @action(detail=True, methods=["get"], url_path="customers")
    def customers(self, request, pk=None):
        """
        Cross-tenant drill-down: every Customer belonging to one Organization,
        for the Super Admin hub's "View Customers by Organization" filter.
        Deliberately bypasses TenantScopedViewSetMixin like the rest of this
        viewset -- gated by IsSuperUser only, per docs/architecture.md ##1's
        Super Admin Bypass.
        """
        organization = self.get_object()
        queryset = Customer.objects.filter(organization=organization).select_related("owner")
        page = self.paginate_queryset(queryset)
        serializer = CustomerSerializer(page, many=True)
        return self.get_paginated_response(serializer.data)
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd backend && pytest superadmin/tests/test_api.py -k customers_action -q`
Expected: PASS (2 tests).

- [ ] **Step 5: Run the full superadmin suite**

Run: `cd backend && pytest superadmin/ -q`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/superadmin/views.py backend/superadmin/tests/test_api.py
git commit -m "feat(backend): add GET admin/organizations/{id}/customers/ for cross-tenant drill-down"
```

---

### Task 8: Backend lint pass for Tasks 2–7

**Files:** all backend files touched in Tasks 2–7.

- [ ] **Step 1: Run black**

Run: `cd backend && black .`
Expected: reformats only if needed; exits 0.

- [ ] **Step 2: Run flake8**

Run: `cd backend && flake8 .`
Expected: zero errors. Fix any and re-run until clean.

- [ ] **Step 3: Run the full backend test suite**

Run: `cd backend && pytest -q`
Expected: all PASS.

- [ ] **Step 4: Commit if black/flake8 made changes**

```bash
git add -A backend
git commit -m "style(backend): black/flake8 pass after Account->Customer rename"
```
(Skip this step if there was nothing to commit.)

---

### Task 9: Frontend rename — route, `lib/accounts.ts`, nav, and `services/api.ts` customer fields

**Files:**
- Move: `frontend/app/dashboard/accounts/page.tsx` → `frontend/app/dashboard/customers/page.tsx`
- Move: `frontend/lib/accounts.ts` → `frontend/lib/customers.ts`
- Modify: `frontend/components/layout/sidebar.tsx`, `frontend/app/actions.ts`
- Modify: `frontend/services/api.ts`, `frontend/lib/analytics.ts`, `frontend/components/features/dashboard-metrics.tsx`, `frontend/components/features/metric-charts.tsx`, `frontend/app/dashboard/page.tsx`

**Interfaces:**
- Produces: exported `mapCustomerRecord(record: CustomerApiRecord): CustomerRecord` and exported type `CustomerApiRecord` from `frontend/services/api.ts` (both currently private — Task 14 needs them). `getTopRiskCustomers(limit?: number)`, `getHealthSnapshot()` returning `{ totalCustomers, ... }`.
- Consumes: nothing new.

- [ ] **Step 1: Move and update the route**

```bash
git mv frontend/app/dashboard/accounts/page.tsx frontend/app/dashboard/customers/page.tsx
git mv frontend/lib/accounts.ts frontend/lib/customers.ts
```

In `frontend/lib/customers.ts`:

```ts
/** Derives the accounts-page summary cards (total/healthy/at-risk/critical) from a customer list. */
export function buildAccountSummaryCards(customers: CustomerRecord[]): StatCard[] {
```
→
```ts
/** Derives the customers-page summary cards (total/healthy/at-risk/critical) from a customer list. */
export function buildCustomerSummaryCards(customers: CustomerRecord[]): StatCard[] {
```

and:

```ts
    { id: 'total', label: 'Total accounts', value: customers.length, icon: Users, ...STAT_CARD_TONE_STYLES.neutral },
```
→
```ts
    { id: 'total', label: 'Total customers', value: customers.length, icon: Users, ...STAT_CARD_TONE_STYLES.neutral },
```

In `frontend/app/dashboard/customers/page.tsx`:

```tsx
import { buildAccountSummaryCards } from '@/lib/accounts';
```
→
```tsx
import { buildCustomerSummaryCards } from '@/lib/customers';
```

```tsx
export default async function AccountsPage() {
```
→
```tsx
export default async function CustomersPage() {
```

```tsx
  const summaryCards = buildAccountSummaryCards(customers);
```
→
```tsx
  const summaryCards = buildCustomerSummaryCards(customers);
```

```tsx
            <h1 className="text-4xl font-bold tracking-tight text-white mt-1">Customer Accounts</h1>
```
→
```tsx
            <h1 className="text-4xl font-bold tracking-tight text-white mt-1">Customers</h1>
```

```tsx
              Browse and filter your complete accounts directory, check current churn status metrics, and drill down into individual profiles.
```
→
```tsx
              Browse and filter your complete customer directory, check current churn status metrics, and drill down into individual profiles.
```

- [ ] **Step 2: Update the sidebar nav**

`frontend/components/layout/sidebar.tsx` lines 36-37:

```ts
    href: '/dashboard/accounts',
    label: 'Accounts',
```
→
```ts
    href: '/dashboard/customers',
    label: 'Customers',
```

- [ ] **Step 3: Update `app/actions.ts` revalidate paths**

`frontend/app/actions.ts`:
- Line 45: `revalidatePath('/dashboard/accounts');` → `revalidatePath('/dashboard/customers');`
- Line 52 comment: `* callers scoped to one account (Customer 360's Playbook checklist) can` → `* callers scoped to one customer (Customer 360's Playbook checklist) can`
- Line 146 comment: `* Server Action backing the "Add Customer" modal (dashboard/accounts).` → `* Server Action backing the "Add Customer" modal (dashboard/customers).`
- Line 164: `revalidatePath('/dashboard/accounts');` → `revalidatePath('/dashboard/customers');`

- [ ] **Step 4: Export the mapper and its type, rename fields, in `services/api.ts`**

Line 58 (`CustomerDetail` type): `accountOwnerEmail: string;` → `customerOwnerEmail: string;`

Line 88: `type CustomerApiRecord = {` → `export type CustomerApiRecord = {`

Line 93: `account_owner_email: string;` → `customer_owner_email: string;`

Lines 117-122: `type AccountNoteApiRecord = {` → `type CustomerNoteApiRecord = {` (this type stays module-private; only its name changes).

Line 146: `recent_notes: AccountNoteApiRecord[];` → `recent_notes: CustomerNoteApiRecord[];`

Line 165: `function mapCustomerRecord(record: CustomerApiRecord): CustomerRecord {` → `export function mapCustomerRecord(record: CustomerApiRecord): CustomerRecord {`

Line 205: `accountOwnerEmail: record.account_owner_email,` → `customerOwnerEmail: record.customer_owner_email,`

Line 292: `export async function getTopRiskAccounts(limit = 3) {` → `export async function getTopRiskCustomers(limit = 3) {`

Line 301: `totalAccounts: list.length,` → `totalCustomers: list.length,`

Line 313: `const accountsAtRisk = list.filter((c) => c.health === 'Critical' || c.health === 'At-Risk').length;` → `const customersAtRisk = list.filter((c) => c.health === 'Critical' || c.health === 'At-Risk').length;`

Line 315 comment: `// Retained ARR is sum of ACV of all currently Healthy or At-Risk accounts` → `// Retained ARR is sum of ACV of all currently Healthy or At-Risk customers`

Lines 336-340 (every remaining use of `accountsAtRisk` in this block becomes `customersAtRisk`, and the label string changes):

```ts
      label: 'Accounts at risk',
      value: accountsAtRisk,
      delta: accountsAtRisk - 16, // comparison to baseline
      trend: accountsAtRisk < 16 ? 'down' : 'up',
      description: accountsAtRisk < 16 ? 'fewer than baseline' : 'exceeding baseline limit',
```
→
```ts
      label: 'Customers at risk',
      value: customersAtRisk,
      delta: customersAtRisk - 16, // comparison to baseline
      trend: customersAtRisk < 16 ? 'down' : 'up',
      description: customersAtRisk < 16 ? 'fewer than baseline' : 'exceeding baseline limit',
```

Line 347: `description: 'Calculated from non-critical accounts',` → `description: 'Calculated from non-critical customers',`

Line 411 (`Task` type): `relatedAccount?: string;` → `relatedCustomer?: string;`

Line 424 (`TaskApiRecord`-equivalent type): `related_account: string | null;` → `related_customer: string | null;`

Line 436: `relatedAccount: record.related_account ?? undefined,` → `relatedCustomer: record.related_customer ?? undefined,`

- [ ] **Step 5: Update `lib/analytics.ts` stat labels**

`frontend/lib/analytics.ts` lines 12-15:

```ts
    { id: 'total', label: 'Total accounts tracked', value: snapshot.totalAccounts, icon: Users, ...STAT_CARD_TONE_STYLES.neutral },
    { id: 'healthy', label: 'Healthy accounts', value: snapshot.healthy, icon: TrendingUp, ...STAT_CARD_TONE_STYLES.success },
    { id: 'at-risk', label: 'At-Risk accounts', value: snapshot.atRisk, icon: Activity, ...STAT_CARD_TONE_STYLES.warning },
    { id: 'critical', label: 'Critical accounts', value: snapshot.critical, icon: BarChart3, ...STAT_CARD_TONE_STYLES.danger },
```
→
```ts
    { id: 'total', label: 'Total customers tracked', value: snapshot.totalCustomers, icon: Users, ...STAT_CARD_TONE_STYLES.neutral },
    { id: 'healthy', label: 'Healthy customers', value: snapshot.healthy, icon: TrendingUp, ...STAT_CARD_TONE_STYLES.success },
    { id: 'at-risk', label: 'At-Risk customers', value: snapshot.atRisk, icon: Activity, ...STAT_CARD_TONE_STYLES.warning },
    { id: 'critical', label: 'Critical customers', value: snapshot.critical, icon: BarChart3, ...STAT_CARD_TONE_STYLES.danger },
```

- [ ] **Step 6: Update `dashboard-metrics.tsx` label key**

`frontend/components/features/dashboard-metrics.tsx` line 10:

```ts
  'Accounts at risk': { icon: ShieldAlert, color: 'text-rose-400', bg: 'from-rose-500/10 to-transparent' },
```
→
```ts
  'Customers at risk': { icon: ShieldAlert, color: 'text-rose-400', bg: 'from-rose-500/10 to-transparent' },
```

(This key must match the `label` string `services/api.ts`'s `getDashboardSummary()` now produces, updated in Step 4.)

- [ ] **Step 7: Update `metric-charts.tsx` unit label**

`frontend/components/features/metric-charts.tsx` line 132:

```tsx
            <p className="text-[8px] text-zinc-500 mt-0.5">accounts</p>
```
→
```tsx
            <p className="text-[8px] text-zinc-500 mt-0.5">customers</p>
```

- [ ] **Step 8: Update `app/dashboard/page.tsx`**

Line 11: `import { getDashboardSummary, getTopRiskAccounts } from '@/services/api';` → `import { getDashboardSummary, getTopRiskCustomers } from '@/services/api';`

Line 18: `getTopRiskAccounts(3),` → `getTopRiskCustomers(3),`

Lines 68-90 — rename the loop variable `account` → `customer` throughout this block (it shadows nothing else in scope):

```tsx
              {risks.map((account) => {
                const isCritical = account.churnProbability >= 60;
```
→
```tsx
              {risks.map((customer) => {
                const isCritical = customer.churnProbability >= 60;
```

and every other `account.` in that same `.map` callback body (lines ~71, 80, 83, 88, 90) → `customer.`, e.g. `<div key={account.id} ...>` → `<div key={customer.id} ...>`, `{account.company}` → `{customer.company}`, `{account.churnProbability}% risk` → `{customer.churnProbability}% risk`, `Owner: {account.owner}` → `Owner: {customer.owner}`, `` href={`/dashboard/customer/${account.id}`} `` → `` href={`/dashboard/customer/${customer.id}`} ``.

Line 104: `<AIInsights accounts={risks} />` stays as-is for now — `AIInsights`'s prop name changes in Task 12, which will also update this call site.

- [ ] **Step 9: Manually smoke-test in the browser**

Run: `cd frontend && npm run dev`, then visit `/dashboard`, `/dashboard/customers`, and confirm the sidebar shows "Customers", the route loads, and no console errors reference `undefined` fields (a sign a rename was missed).

- [ ] **Step 10: Run frontend tests and lint**

Run: `cd frontend && npm run lint && npx vitest run`
Expected: lint clean; any test referencing the old names fails loudly — fix before proceeding (none are expected to reference these specific names per the current test file list, but confirm).

- [ ] **Step 11: Commit**

```bash
git add frontend/app/dashboard/customers frontend/app/dashboard/accounts frontend/lib/customers.ts frontend/lib/accounts.ts frontend/components/layout/sidebar.tsx frontend/app/actions.ts frontend/services/api.ts frontend/lib/analytics.ts frontend/components/features/dashboard-metrics.tsx frontend/components/features/metric-charts.tsx frontend/app/dashboard/page.tsx
git commit -m "refactor(frontend): rename Accounts route/nav and customer-facing API fields to Customer"
```

---

### Task 10: Frontend rename — `accountsInPlay` → `customersInPlay` (Playbooks)

**Files:**
- Modify: `frontend/services/playbooks.ts`, `frontend/lib/schemas.ts`, `frontend/app/dashboard/playbooks/page.tsx`, `frontend/components/features/playbook-list.tsx`

**Interfaces:**
- Consumes: backend JSON key `customers_in_play` from Task 4.
- Produces: `Playbook.customersInPlay` (TS field), consumed by `app/dashboard/playbooks/page.tsx` and `playbook-list.tsx`.

- [ ] **Step 1: Update the service mapping**

`frontend/services/playbooks.ts`:
- Line 11: `accountsInPlay: number;` → `customersInPlay: number;`
- Line 23: `accounts_in_play: number;` → `customers_in_play: number;`
- Line 36: `accountsInPlay: record.accounts_in_play,` → `customersInPlay: record.customers_in_play,`

- [ ] **Step 2: Update schema comments**

`frontend/lib/schemas.ts`:
- Line 99: `* fields (see CLAUDE.md ##3 Front-to-Back Symmetry). `accounts_in_play` and` → `* fields (see CLAUDE.md ##3 Front-to-Back Symmetry). `customers_in_play` and`
- Line 114: `* (see CLAUDE.md ##3 Front-to-Back Symmetry). `related_account` is a` → `* (see CLAUDE.md ##3 Front-to-Back Symmetry). `related_customer` is a`

- [ ] **Step 3: Update the playbooks page**

`frontend/app/dashboard/playbooks/page.tsx`:
- Line 21: `const accountsInPlay = playbooks.reduce((sum, p) => sum + p.accountsInPlay, 0);` → `const customersInPlay = playbooks.reduce((sum, p) => sum + p.customersInPlay, 0);`
- Line 64: `<p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Accounts in play</p>` → `<p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Customers in play</p>`
- Line 65: `<p className="font-mono-numeric text-2xl font-bold text-white mt-0.5">{accountsInPlay}</p>` → `<p className="font-mono-numeric text-2xl font-bold text-white mt-0.5">{customersInPlay}</p>`

- [ ] **Step 4: Update `playbook-list.tsx`**

`frontend/components/features/playbook-list.tsx`:
- Line 66: `{playbook.accountsInPlay > 0 && (` → `{playbook.customersInPlay > 0 && (`
- Line 68: `{playbook.accountsInPlay} active account{playbook.accountsInPlay !== 1 ? 's' : ''}` → `{playbook.customersInPlay} active customer{playbook.customersInPlay !== 1 ? 's' : ''}`

- [ ] **Step 5: Run lint and tests**

Run: `cd frontend && npm run lint && npx vitest run`
Expected: PASS/clean.

- [ ] **Step 6: Commit**

```bash
git add frontend/services/playbooks.ts frontend/lib/schemas.ts frontend/app/dashboard/playbooks/page.tsx frontend/components/features/playbook-list.tsx
git commit -m "refactor(frontend): rename accountsInPlay to customersInPlay"
```

---

### Task 11: Frontend rename — `relatedAccount` → `relatedCustomer` (Tasks/Inbox)

**Files:**
- Modify: `frontend/components/features/inbox-task-list.tsx`, `frontend/components/features/task-form-modal.tsx`

**Interfaces:**
- Consumes: `Task.relatedCustomer` (renamed in Task 9, Step 4) and backend JSON key `related_customer` (Task 5).

- [ ] **Step 1: Update `inbox-task-list.tsx`**

Line 150: `{task.relatedAccount && (` → `{task.relatedCustomer && (`
Line 152: `<ArrowRight className="h-3 w-3" /> {task.relatedAccount}` → `<ArrowRight className="h-3 w-3" /> {task.relatedCustomer}`

- [ ] **Step 2: Update `task-form-modal.tsx`**

Line 172: `label="Related account (optional)"` → `label="Related customer (optional)"`
Line 179: `{ value: '', label: 'No related account' },` → `{ value: '', label: 'No related customer' },`

- [ ] **Step 3: Run lint and tests**

Run: `cd frontend && npm run lint && npx vitest run`
Expected: PASS/clean.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/features/inbox-task-list.tsx frontend/components/features/task-form-modal.tsx
git commit -m "refactor(frontend): rename relatedAccount to relatedCustomer"
```

---

### Task 12: Frontend copy rename — remaining in-app "Account(s)" strings

**Files:**
- Modify: `frontend/components/features/customer-table.tsx`, `frontend/components/features/customer-360-parts/{header-card,notes-card,playbook-card}.tsx`, `frontend/components/features/customer-contacts.tsx`, `frontend/components/features/add-note-form.tsx`, `frontend/components/features/add-customer-modal.tsx`, `frontend/components/features/contact-form-modal.tsx`, `frontend/components/features/ai-insights.tsx`, `frontend/components/features/signal-feed.tsx`, `frontend/components/ui/command-palette.tsx`, `frontend/components/layout/dashboard-header.tsx`, `frontend/app/dashboard/not-found.tsx`, `frontend/app/dashboard/customer/[id]/page.tsx`, `frontend/app/dashboard/customer/[id]/error.tsx`, `frontend/app/admin/page.tsx`, `frontend/app/dashboard/page.tsx`

**Interfaces:**
- Produces: `AIInsights` prop rename from `accounts` to `customers` (only consumer is `app/dashboard/page.tsx`, updated in the same task).

- [ ] **Step 1: `customer-table.tsx`**

- Line 83: `{ key: 'company', label: 'Account' },` → `{ key: 'company', label: 'Customer' },`
- Line 94: `<p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Accounts portfolio</p>` → `<p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Customers portfolio</p>`
- Line 95: `<h3 className="mt-1.5 text-lg font-semibold text-white">Account intelligence ledger</h3>` → `<h3 className="mt-1.5 text-lg font-semibold text-white">Customer intelligence ledger</h3>`
- Line 103: `placeholder="Search accounts..."` → `placeholder="Search customers..."`
- Line 108: `aria-label="Search accounts"` → `aria-label="Search customers"`
- Line 147: `aria-label="Customer account table"` → `aria-label="Customer table"`
- Line 259: `<p className="font-medium text-white">No accounts matched filters</p>` → `<p className="font-medium text-white">No customers matched filters</p>`
- Line 279: `<span className="text-zinc-200 font-semibold">{customers.length}</span> accounts in scope` → `<span className="text-zinc-200 font-semibold">{customers.length}</span> customers in scope`

- [ ] **Step 2: `customer-360-parts/header-card.tsx`**

Lines 91, 95: `customer.accountOwnerEmail` → `customer.customerOwnerEmail` (both occurrences — the `href={\`mailto:${...}\`}` and the display text).

- [ ] **Step 3: `customer-360-parts/notes-card.tsx`**

Line 11: `Account notes` → `Customer notes`

- [ ] **Step 4: `customer-360-parts/playbook-card.tsx`**

Line 59: `No tasks for this account yet.` → `No tasks for this customer yet.`

- [ ] **Step 5: `customer-contacts.tsx`**

Line 45: `Account stakeholders` → `Customer stakeholders`
Line 50: `<p className="text-sm text-zinc-500">No contacts on file for this account yet.</p>` → `<p className="text-sm text-zinc-500">No contacts on file for this customer yet.</p>`

- [ ] **Step 6: `add-note-form.tsx`**

Line 42: `placeholder="Type a new update, meeting summary, or account note..."` → `placeholder="Type a new update, meeting summary, or customer note..."`

- [ ] **Step 7: `add-customer-modal.tsx`**

Line 99: `description="Manually enter a new account into your churn-tracking portfolio."` → `description="Manually enter a new customer into your churn-tracking portfolio."`

- [ ] **Step 8: `contact-form-modal.tsx`**

Line 112: `description="A stakeholder at this account, shown on the Customer 360 view."` → `description="A stakeholder at this customer, shown on the Customer 360 view."`

- [ ] **Step 9: `ai-insights.tsx`**

Line 45: `: 'Package the expansion motion now -- usage is strong and the account is ready for commercial growth.';` → `: 'Package the expansion motion now -- usage is strong and the customer is ready for commercial growth.';`
Line 64: `export function AIInsights({ accounts }: { accounts: CustomerRecord[] }) {` → `export function AIInsights({ customers }: { customers: CustomerRecord[] }) {`
Line 65: `const insights = accounts.map(buildInsight);` → `const insights = customers.map(buildInsight);`
Line 142: `Open account <ExternalLink className="h-3 w-3" />` → `Open customer <ExternalLink className="h-3 w-3" />`
Line 191: `Model confidence is strong across the top risk accounts this week.` → `Model confidence is strong across the top risk customers this week.`

Then, in `frontend/app/dashboard/page.tsx` line 104 (left as-is at the end of Task 9): `<AIInsights accounts={risks} />` → `<AIInsights customers={risks} />`.

- [ ] **Step 10: `signal-feed.tsx`**

Line 195: `Model is monitoring {signals.length > 0 ? 6 : 0} accounts across{' '}` → `Model is monitoring {signals.length > 0 ? 6 : 0} customers across{' '}`

- [ ] **Step 11: `command-palette.tsx`**

Line 27 (comment): `* A keyboard-first command palette for fast navigation and account lookup.` → `* A keyboard-first command palette for fast navigation and customer lookup.`
Line 170: `placeholder="Search accounts or jump to…"` → `placeholder="Search customers or jump to…"`

- [ ] **Step 12: `dashboard-header.tsx`**

Line 14: `{ id: 'nav-accounts', label: 'Accounts', hint: 'Full customer portfolio', group: 'Navigation', href: '/dashboard/accounts' },` → `{ id: 'nav-customers', label: 'Customers', hint: 'Full customer portfolio', group: 'Navigation', href: '/dashboard/customers' },`

(Line 91's `aria-label="Open account settings"` is left unchanged — it means the logged-in user's own Settings page, the generic "your account" sense excluded by the spec.)

- [ ] **Step 13: `app/dashboard/not-found.tsx`**

Line 23: `<p className="text-sm text-zinc-300">Return to the command center to see your active accounts and risk alerts.</p>` → `<p className="text-sm text-zinc-300">Return to the command center to see your active customers and risk alerts.</p>`
Line 32: `<Link href="/dashboard/accounts">` → `<Link href="/dashboard/customers">`
Line 33: `<ArrowLeft className="h-4 w-4 mr-2" /> All Accounts` → `<ArrowLeft className="h-4 w-4 mr-2" /> All Customers`

- [ ] **Step 14: `app/dashboard/customer/[id]/page.tsx`**

Line 29: `` title: `${customer.company} — Account 360`, `` → `` title: `${customer.company} — Customer 360`, ``

- [ ] **Step 15: `app/dashboard/customer/[id]/error.tsx`**

Line 26: `title="The account view could not be loaded."` → `title="The customer view could not be loaded."`

- [ ] **Step 16: `app/admin/page.tsx`**

Line 62 (this is the one line that means Organization, not Customer): `account manually, or let payment-failure webhooks handle it automatically.` → `organization manually, or let payment-failure webhooks handle it automatically.`

- [ ] **Step 17: Manually smoke-test in the browser**

Run: `cd frontend && npm run dev`, visit `/dashboard`, `/dashboard/customers`, `/dashboard/customer/<any-id>`, `/dashboard/playbooks`, `/dashboard/tasks`, `/admin`. Confirm no leftover "Account"/"Accounts" strings in the visited pages (use the browser's find-in-page) and no console errors.

- [ ] **Step 18: Grep for stray in-scope "account" strings**

Run (from repo root):
```bash
grep -rniE "account" frontend/app/dashboard frontend/app/admin frontend/components/features frontend/components/layout frontend/components/ui frontend/lib frontend/services --include="*.tsx" --include="*.ts" | grep -viE "your (personal )?account|account seeded|account settings"
```
Expected: no output (every remaining hit should be one of the two explicitly-excluded generic phrasings). If something unexpected shows up, decide per the spec's rule (Customer-sense → rename; Organization-sense → rename to Organization; generic "your login account" → leave) and fix inline.

- [ ] **Step 19: Run lint and tests**

Run: `cd frontend && npm run lint && npx vitest run`
Expected: clean/PASS.

- [ ] **Step 20: Commit**

```bash
git add frontend/components/features frontend/components/ui/command-palette.tsx frontend/components/layout/dashboard-header.tsx frontend/app/dashboard/not-found.tsx frontend/app/dashboard/customer frontend/app/admin/page.tsx frontend/app/dashboard/page.tsx
git commit -m "refactor(frontend): rename remaining Account(s) copy to Customer(s)"
```

---

### Task 13: Frontend — Reactivate button in the Super Admin hub

**Files:**
- Modify: `frontend/services/admin.ts`, `frontend/app/actions.ts`, `frontend/components/features/organization-table.tsx`

**Interfaces:**
- Consumes: `POST /api/v1/admin/organizations/{id}/reactivate/` (Task 6).
- Produces: `reactivateOrganization(id: string): Promise<OrganizationRecord>` (services/admin.ts), `reactivateOrganizationAction(id: string): Promise<OrganizationRecord>` (app/actions.ts).

- [ ] **Step 1: Add the service function**

In `frontend/services/admin.ts`, directly after `suspendOrganization`:

```ts
export async function reactivateOrganization(id: string): Promise<OrganizationRecord> {
  const updated = await apiClient.post<OrganizationApiRecord>(
    `/api/v1/admin/organizations/${id}/reactivate/`,
    undefined,
    { headers: adminAuthHeaders() }
  );
  return mapOrganization(updated);
}
```

- [ ] **Step 2: Add the server action**

In `frontend/app/actions.ts`, update the import:

```ts
import { suspendOrganization, type OrganizationRecord } from '@/services/admin';
```
→
```ts
import { reactivateOrganization, suspendOrganization, type OrganizationRecord } from '@/services/admin';
```

Add, directly after `suspendOrganizationAction`:

```ts
/** Manual super-admin override that reverses `suspendOrganizationAction`. */
export async function reactivateOrganizationAction(id: string): Promise<OrganizationRecord> {
  const updated = await reactivateOrganization(id);
  revalidatePath('/admin');
  return updated;
}
```

- [ ] **Step 3: Add the button/modal to `organization-table.tsx`**

Update the import line:

```tsx
import { Building2, Search, ShieldBan, Users2 } from 'lucide-react';
```
→
```tsx
import { Building2, Search, ShieldBan, ShieldCheck, Users2 } from 'lucide-react';
```

```tsx
import { suspendOrganizationAction } from '@/app/actions';
```
→
```tsx
import { reactivateOrganizationAction, suspendOrganizationAction } from '@/app/actions';
```

Add a new piece of state next to `confirmTarget`:

```tsx
  const [confirmTarget, setConfirmTarget] = useState<OrganizationRecord | null>(null);
```
→
```tsx
  const [confirmTarget, setConfirmTarget] = useState<OrganizationRecord | null>(null);
  const [reactivateTarget, setReactivateTarget] = useState<OrganizationRecord | null>(null);
```

Add a `handleReactivate` function directly after `handleSuspend`:

```tsx
  async function handleReactivate(organization: OrganizationRecord) {
    setPendingId(organization.id);
    try {
      const updated = await reactivateOrganizationAction(organization.id);
      setOrganizations((current) => current.map((org) => (org.id === updated.id ? updated : org)));
      toast({
        title: 'Organization reactivated',
        description: `${organization.name} has been marked Active.`,
        tone: 'info',
      });
      router.refresh();
    } catch {
      toast({ title: 'Could not reactivate organization', tone: 'error' });
    } finally {
      setPendingId(null);
      setReactivateTarget(null);
    }
  }
```

Replace the Action cell body:

```tsx
                  <td className="px-5 py-4 text-right">
                    <Button
                      type="button"
                      variant="danger"
                      size="xs"
                      disabled={isSuspended || pendingId === org.id}
                      onClick={() => setConfirmTarget(org)}
                      className={cn(isSuspended && 'opacity-40')}
                    >
                      <ShieldBan className="h-3.5 w-3.5" />
                      {isSuspended ? 'Suspended' : 'Suspend'}
                    </Button>
                  </td>
```
→
```tsx
                  <td className="px-5 py-4 text-right">
                    {isSuspended ? (
                      <Button
                        type="button"
                        variant="subtle"
                        size="xs"
                        disabled={pendingId === org.id}
                        onClick={() => setReactivateTarget(org)}
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Reactivate
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="danger"
                        size="xs"
                        disabled={pendingId === org.id}
                        onClick={() => setConfirmTarget(org)}
                      >
                        <ShieldBan className="h-3.5 w-3.5" />
                        Suspend
                      </Button>
                    )}
                  </td>
```

Add a second `Modal`, directly after the existing Suspend `Modal`'s closing tag:

```tsx
      <Modal
        open={reactivateTarget !== null}
        onOpenChange={(open) => !open && setReactivateTarget(null)}
        title="Reactivate organization?"
        description={
          reactivateTarget
            ? `${reactivateTarget.name} will be marked Active immediately.`
            : undefined
        }
      >
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" size="sm" onClick={() => setReactivateTarget(null)}>
            Cancel
          </Button>
          <Button
            variant="subtle"
            size="sm"
            disabled={pendingId === reactivateTarget?.id}
            onClick={() => reactivateTarget && handleReactivate(reactivateTarget)}
          >
            Reactivate organization
          </Button>
        </div>
      </Modal>
```

- [ ] **Step 4: Manually verify in the browser**

Run backend (`cd backend && python start.py`) and frontend (`cd frontend && npm run dev`) if not already running. Visit `/admin`, suspend a test organization, confirm the row now shows a "Reactivate" button, click it, confirm the modal, and verify the row flips back to "Suspend" and the summary cards update (`router.refresh()`).

- [ ] **Step 5: Run lint and tests**

Run: `cd frontend && npm run lint && npx vitest run`
Expected: clean/PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/services/admin.ts frontend/app/actions.ts frontend/components/features/organization-table.tsx
git commit -m "feat(frontend): add Reactivate button to the Super Admin Organizations table"
```

---

### Task 14: Frontend — View Customers by Organization panel

**Files:**
- Modify: `frontend/services/admin.ts`, `frontend/app/actions.ts`
- Create: `frontend/components/features/organization-customers-panel.tsx`
- Modify: `frontend/app/admin/page.tsx`

**Interfaces:**
- Consumes: `GET /api/v1/admin/organizations/{id}/customers/` (Task 7), `mapCustomerRecord`/`CustomerApiRecord` exported from `services/api.ts` (Task 9), `CustomerRecord` type (`services/api.ts`).
- Produces: `getOrganizationCustomers(organizationId: string): Promise<CustomerRecord[]>` (services/admin.ts), `getOrganizationCustomersAction(organizationId: string): Promise<CustomerRecord[]>` (app/actions.ts), component `OrganizationCustomersPanel`.

- [ ] **Step 1: Add the service function**

In `frontend/services/admin.ts`, update the import line:

```ts
import { apiClient, type PaginatedResponse } from '@/lib/apiClient';
```
→
```ts
import { apiClient, type PaginatedResponse } from '@/lib/apiClient';
import { mapCustomerRecord, type CustomerApiRecord, type CustomerRecord } from '@/services/api';
```

Add, directly after `reactivateOrganization` (added in Task 13):

```ts
/** Cross-tenant drill-down: every Customer for one Organization -- backend/superadmin, superuser-only. */
export async function getOrganizationCustomers(organizationId: string): Promise<CustomerRecord[]> {
  const page = await apiClient.get<PaginatedResponse<CustomerApiRecord>>(
    `/api/v1/admin/organizations/${organizationId}/customers/?page_size=200`,
    { headers: adminAuthHeaders() }
  );
  return page.results.map(mapCustomerRecord);
}
```

- [ ] **Step 2: Add the server action**

In `frontend/app/actions.ts`, update the import:

```ts
import { reactivateOrganization, suspendOrganization, type OrganizationRecord } from '@/services/admin';
```
→
```ts
import { getOrganizationCustomers, reactivateOrganization, suspendOrganization, type OrganizationRecord } from '@/services/admin';
```

Add, directly after `reactivateOrganizationAction`:

```ts
/** Server Action backing the Super Admin hub's "View customers by organization" dropdown. */
export async function getOrganizationCustomersAction(organizationId: string): Promise<CustomerRecord[]> {
  return getOrganizationCustomers(organizationId);
}
```

(`CustomerRecord` is already imported into `app/actions.ts` via the existing `type CustomerRecord` import from `@/services/api` on line 15 — no new import needed there.)

- [ ] **Step 3: Create the panel component**

Create `frontend/components/features/organization-customers-panel.tsx`:

```tsx
'use client';

import { useState, useTransition } from 'react';
import { Users2 } from 'lucide-react';

import { getOrganizationCustomersAction } from '@/app/actions';
import { GlassCard } from '@/components/ui/glass-card';
import type { CustomerRecord } from '@/services/api';
import type { OrganizationRecord } from '@/services/admin';

export function OrganizationCustomersPanel({ organizations }: { organizations: OrganizationRecord[] }) {
  const [selectedId, setSelectedId] = useState('');
  const [customers, setCustomers] = useState<CustomerRecord[] | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSelect(id: string) {
    setSelectedId(id);
    if (!id) {
      setCustomers(null);
      return;
    }
    startTransition(async () => {
      const result = await getOrganizationCustomersAction(id);
      setCustomers(result);
    });
  }

  return (
    <GlassCard className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Drill down</p>
          <h3 className="mt-1.5 text-lg font-semibold text-white">View customers by organization</h3>
        </div>
        <select
          className="h-10 w-full rounded-xl border border-white/8 bg-black/30 px-3.5 text-sm text-white transition-all focus:border-violet-400/30 focus:bg-black/50 focus:outline-none focus:ring-1 focus:ring-violet-400/30 sm:w-72"
          value={selectedId}
          onChange={(event) => handleSelect(event.target.value)}
          aria-label="Filter customers by organization"
        >
          <option value="">Select an organization…</option>
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
      </div>

      {isPending && <p className="text-sm text-zinc-500">Loading customers…</p>}

      {!isPending && customers !== null && (
        <div className="overflow-hidden rounded-2xl border border-white/8 bg-black/10">
          <table
            className="min-w-full divide-y divide-white/8 text-left text-sm"
            role="grid"
            aria-label="Organization customers table"
          >
            <thead className="bg-white/[0.02] text-xs uppercase tracking-wider text-zinc-500">
              <tr role="row">
                <th scope="col" className="px-5 py-3 font-semibold">Customer</th>
                <th scope="col" className="px-5 py-3 font-semibold">Plan</th>
                <th scope="col" className="px-5 py-3 font-semibold">Health</th>
                <th scope="col" className="px-5 py-3 font-semibold">MRR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {customers.map((customer) => (
                <tr key={customer.id} role="row">
                  <td className="px-5 py-3.5 font-medium text-white">{customer.company}</td>
                  <td className="px-5 py-3.5 text-zinc-300">{customer.plan}</td>
                  <td className="px-5 py-3.5 text-zinc-300">{customer.health}</td>
                  <td className="px-5 py-3.5 font-mono-numeric text-zinc-300">
                    {customer.monthlyRecurringRevenue.toLocaleString()}
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr role="row">
                  <td colSpan={4} className="px-5 py-10 text-center text-zinc-500">
                    <Users2 className="mx-auto mb-2 h-5 w-5" />
                    No customers found for this organization.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </GlassCard>
  );
}
```

- [ ] **Step 4: Wire it into the admin hub page**

In `frontend/app/admin/page.tsx`, update the import:

```tsx
import { OrganizationTable } from '@/components/features/organization-table';
```
→
```tsx
import { OrganizationCustomersPanel } from '@/components/features/organization-customers-panel';
import { OrganizationTable } from '@/components/features/organization-table';
```

and, at the end of the component's returned JSX:

```tsx
      <OrganizationTable organizations={organizations} />
    </PageWrapper>
```
→
```tsx
      <OrganizationTable organizations={organizations} />
      <OrganizationCustomersPanel organizations={organizations} />
    </PageWrapper>
```

- [ ] **Step 5: Manually verify in the browser**

Visit `/admin`, select an organization from the new dropdown, confirm its customers list renders below (or "No customers found" for an org with none), and confirm selecting the blank option clears the table.

- [ ] **Step 6: Run lint and tests**

Run: `cd frontend && npm run lint && npx vitest run`
Expected: clean/PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/services/admin.ts frontend/app/actions.ts frontend/components/features/organization-customers-panel.tsx frontend/app/admin/page.tsx
git commit -m "feat(frontend): add View Customers by Organization panel to the Super Admin hub"
```

---

### Task 15: Final verification and ADL entry

**Files:**
- Modify: `prompts.md` (repo root — Architectural Decision Log per docs/engineering-standards.md ##4).

- [ ] **Step 1: Full backend verification**

Run: `cd backend && black --check . && flake8 . && pytest -q`
Expected: all clean/PASS.

- [ ] **Step 2: Full frontend verification**

Run: `cd frontend && npm run lint && npx vitest run`
Expected: clean/PASS.

- [ ] **Step 3: Log the ADL entry**

Append a dated entry to `prompts.md` summarizing: (1) cross-tab logout verified already-fixed + added `middleware.test.ts` regression coverage, (2) Account→Organization/Customer terminology rename across backend (`notes.AccountNote`→`CustomerNote`, `account_owner_email`→`customer_owner_email`, `accounts_in_play`→`customers_in_play`, `related_account`→`related_customer`) and frontend (route, nav, API fields, UI copy), (3) added Reactivate action/button, (4) added View Customers by Organization endpoint/panel. Follow the existing entries' format/style in that file.

- [ ] **Step 4: Commit**

```bash
git add prompts.md
git commit -m "docs: log QA bugfixes and admin controls work in prompts.md ADL"
```

---

## Self-Review Notes

- **Spec coverage:** Item 1 (cross-tab logout) → Task 1. Item 2 (terminology) → Tasks 2–5, 8–12. Item 3a (Reactivate) → Tasks 6, 13. Item 3b (View Customers by Organization) → Tasks 7, 14. Final lint/ADL → Task 15.
- **Type consistency checked:** `mapCustomerRecord`/`CustomerApiRecord` exported in Task 9 Step 4, consumed unchanged in Task 14 Step 1. `customer_owner_email` (backend, Task 3) matches `customerOwnerEmail`/`customer_owner_email` (frontend, Task 9 Step 4). `customers_in_play` (backend, Task 4) matches `customersInPlay`/`customers_in_play` (frontend, Task 10). `related_customer` (backend, Task 5) matches `relatedCustomer`/`related_customer` (frontend, Task 9 Step 4, Task 11). Route names `admin-organization-reactivate`/`admin-organization-customers` (Tasks 6–7) match `reverse()` calls in their own tests and the URL paths used by `services/admin.ts` (Tasks 13–14).
- **Scope boundary is explicit and enforced by a grep check** (Task 12, Step 18) so the rename doesn't silently stop partway through the intended surface, while marketing copy stays untouched by design.
