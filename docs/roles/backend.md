# Backend Guidelines (`/backend`)

## Tech Stack

Django 5, Django REST Framework (DRF), PostgreSQL, `psycopg3`.

**Tooling**: `black` + `flake8` (Python linting/formatting), `pytest` & `pytest-django`, `django-environ`, `factory_boy`, `drf-spectacular` (OpenAPI/Swagger docs).

## Applies here

- [architecture.md](../architecture.md) ##1 Multi-Tenancy -- enforced via custom Django Managers filtering by `organization_id`.
- [architecture.md](../architecture.md) ##2 Soft Delete -- `BaseModel` + queryset overrides.
- [architecture.md](../architecture.md) ##3 Front-to-Back Symmetry -- DRF Serializers mirror the frontend's Zod schemas; RESTful status codes; `Idempotency-Key` support on critical `POST`s.
- [architecture.md](../architecture.md) ##4 DRY -- abstract base classes for shared model/view behavior.
- [business-logic.md](../business-logic.md) -- the Churn Scoring Engine.
- [engineering-standards.md](../engineering-standards.md) ##1, ##2, ##3 -- `black`/`flake8`, Pytest coverage, phased RBAC.

## Terminal Commands

- Start backend (single entrypoint -- starts Postgres + Redis, migrates, seeds demo data, runs the server): `cd backend && python start.py`
- Format python: `cd backend && black . && flake8 .`
- Run the Celery worker (executes the nightly Churn Scoring Engine sweep and any other queued tasks -- requires `python start.py` to have brought up Redis first): `cd backend && celery -A foresight_backend worker -l info`
- Run Celery beat (schedules the nightly sweep defined in `CELERY_BEAT_SCHEDULE`): `cd backend && celery -A foresight_backend beat -l info`
