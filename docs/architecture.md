# Core Architectural Rules (CRITICAL)

These rules are non-negotiable across both `/frontend` and `/backend`. See [roles/backend.md](roles/backend.md) and [roles/frontend.md](roles/frontend.md) for how each side implements them.

## 1. Logical Multi-Tenancy (Strict Data Isolation)

- EVERY customer, rule, user, and event belongs to an `Organization` (Tenant).
- **Data Leakage is a fatal error.** All database queries must automatically filter by the authenticated user's `organization_id` using custom Django Managers.
- **Super Admin Bypass**: Only users with `is_superuser=True` can view all organizations, access system-wide metrics, and globally suspend accounts.

## 2. The "Soft Delete" Standard

- NEVER physically delete records from the database using SQL `DELETE`.
- Use a `BaseModel` (inheriting from `models.Model`) containing `id` (UUID), `created_at`, `updated_at`, and `deleted_at`.
- DRF API views must strictly override `.get_queryset()` to only return records where `deleted_at IS NULL`.

## 3. Front-to-Back Symmetry & Idempotency

- Backend validation (DRF Serializers) MUST strictly mirror Frontend validation (Zod schemas).
- DRF must adhere to RESTful status codes: `201` for Create, `204` for Delete, `400` for Validation Errors, `404` for Not Found.
- Critical `POST` endpoints must utilize `Idempotency-Key` headers to prevent duplicate DB entries during network latency.
- JSON error payloads (`400 Bad Request`) must be easily parsable by the Next.js `apiClient.ts` utility for inline field error mapping.

## 4. DRY Principles & Modularity

- Zero code duplication. Use abstract base classes in Python and centralized UI components (`/components/ui/`) in Next.js.
- Ensure the frontend uses a single, unified `apiClient.ts` utility class for all network requests.
