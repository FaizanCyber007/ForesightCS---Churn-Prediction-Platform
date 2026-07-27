# 🔮 ForesightCS: Predictive Churn & Customer Success Platform

ForesightCS is a multi-tenant B2B SaaS platform that predicts customer churn and manages account
health for SMB software companies, using a heuristic (rule-based) scoring engine. It gives
Customer Success teams a command center with actionable insights, detailed telemetry, and a rule
builder for predictive churn analysis.

## a. What It Does & The Problem It Solves

**What it does:** ForesightCS tracks per-customer usage telemetry (`EventLog`s), runs it through a
configurable, weighted rule engine to produce a health score, and surfaces the result in a
Customer Success command center — dashboard, customer 360 view, inbox/tasks, and playbooks — so a
CSM always has a live, explainable read on account health.

**The problem it solves (and for whom):**

- **Target audience:** SMB SaaS founders and Customer Success Managers.
- **The problem:** B2B startups routinely lose Monthly Recurring Revenue because nobody notices an
  account is unhappy until the cancellation request arrives. Enterprise CS platforms that solve
  this cost tens of thousands of dollars a year and take months to integrate. ForesightCS gives a
  small team an affordable, transparent, rule-based alternative: define the signals that predict
  churn for your product, let the engine score every account against them, and catch at-risk
  customers before they leave.

---

## b. Live Deployment & Repository

🌍 **Live Application:** [https://foresight-cs-churn-prediction-platf.vercel.app/](https://foresight-cs-churn-prediction-platf.vercel.app/)
💻 **GitHub Repository:** [https://github.com/FaizanCyber007/ForesightCS---Churn-Prediction-Platform](https://github.com/FaizanCyber007/ForesightCS---Churn-Prediction-Platform)

Frontend is deployed on Vercel, backend on Render, with a managed PostgreSQL instance. The app
auto-seeds realistic demo data (organization, customers, health rules, tasks, playbooks, notes) so
the dashboard is populated out of the box.

---

## c. Feature List

- **Dashboard / Command Center** — customer health overview, metric cards, interactive charts, and
  a data table of healthy / at-risk / critical customers, all backed by real Postgres data.
- **Churn Scoring Engine** — every customer starts at a base score of 100; the engine walks the
  organization's `HealthRule`s and subtracts each rule's weight when a customer's telemetry
  violates it. Score bands: **71–100 Healthy**, **41–70 At Risk**, **0–40 Critical**. Implemented
  in `backend/customers/services.py` (`HealthScoreEngine`), kept out of views/serializers so the
  API layer stays a thin orchestrator.
- **Customer 360 View** — telemetry timeline, notes, billing status, and a "Recalculate Health
  Score" action that re-runs the rule engine (the only way a customer's score changes).
- **Dynamic Rule Builder** — configure the weighted rules the engine evaluates against customer
  telemetry (e.g. "deduct 30 points if logins drop by 50%").
- **Inbox / Tasks & Playbooks** — CS workflow tracking, fully persisted through the API.
- **Strict Multi-Tenancy** — every customer, rule, user, and event belongs to an `Organization`.
  All queries are automatically scoped to the authenticated user's organization via custom Django
  managers; cross-tenant data leakage is treated as a fatal bug.
- **Soft Delete Everywhere** — no record is ever hard-deleted; every model carries `deleted_at`,
  and API queries transparently exclude soft-deleted rows.
- **Front-to-Back Validation Symmetry** — DRF serializer validation mirrors the frontend's Zod
  schemas, so the same rules apply whether a request comes from the UI or the API directly.
- **Billing Integration** — Lemon Squeezy webhook endpoint for subscription/billing events.
- **Super-admin Hub** — cross-tenant organization management (suspend/reactivate, global metrics)
  for platform operators.

---

## d. Tools, Services & Stack

| Layer | Stack / Tool |
|---|---|
| **Backend** | Django 5, Django REST Framework, PostgreSQL, `psycopg3`, `django-environ`, `drf-spectacular`, `django-filter` |
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion, `@react-three/fiber`, React Hook Form, Zod |
| **Async/Jobs** | Celery worker (solo pool) |
| **Billing** | Lemon Squeezy webhooks |
| **Testing/Lint** | `pytest` + `factory_boy` (backend), `vitest` + React Testing Library (frontend), `black` + `flake8`, `eslint` |
| **Hosting** | Vercel (frontend), Render (backend web + worker), managed PostgreSQL |

---

## e. How to Run the Project Locally

### 1. Prerequisites — install once

| Tool | Version | Why |
|---|---|---|
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | latest | Runs the local PostgreSQL container. Must be **open and running** before you start the backend. |
| Python | 3.12+ | Backend runtime |
| Node.js | 20 LTS+ | Frontend runtime |
| Git | any recent | Version control |

You don't need to install PostgreSQL yourself — `backend/docker-compose.yml` provisions it in a
container. If you'd rather point at an existing local Postgres install, see
[Troubleshooting](#troubleshooting).

### 2. Backend setup

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

**Create your `.env`:**

```bash
copy .env.example .env      # Windows
cp .env.example .env        # macOS/Linux
```

(`start.py`, below, will also create this for you automatically if you skip this step.)

**Fill in the required keys** in `backend/.env`. Everything else already has a working local-dev
default — you don't need to touch `DB_*` unless you changed the Docker Compose ports.

| Key | Required? | What to do |
|---|---|---|
| `DJANGO_SECRET_KEY` | **Yes** | Generate one and paste it in: `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"` |
| `LEMON_SQUEEZY_WEBHOOK_SECRET` | Only if testing billing webhooks | Get this from your Lemon Squeezy dashboard → **Settings → Webhooks** → your endpoint's signing secret. Without it, `POST /api/v1/billing/webhooks/lemon-squeezy/` rejects every request with `401`. Everything else works fine with this left blank. |
| `DJANGO_SUPERADMIN_USERNAME` / `DJANGO_SUPERADMIN_PASSWORD` | Recommended | Dev-only super-admin account, auto-created by the seed command. **Must match** `ADMIN_API_USERNAME` / `ADMIN_API_PASSWORD` in `frontend/.env.local` (step 3), or the frontend's admin pages can't authenticate. |
| `CORS_ALLOWED_ORIGINS` | No | Defaults to `http://localhost:3000` (the frontend dev server). Only change if you run the frontend on a different port. |

**Start everything with one command:**

```bash
python start.py
```

This single entrypoint:
1. Starts the Postgres container via Docker Compose (Docker Desktop must already be open).
2. Waits for the database to accept connections.
3. Applies all migrations.
4. Seeds demo data (organization, customers, health rules, tasks, playbooks, notes) — idempotent,
   safe to re-run any time.
5. Runs the Django dev server at `http://localhost:8000`.

Leave this running in its own terminal; `Ctrl+C` stops it.

### 3. Frontend setup

In a **second terminal**:

```bash
cd frontend
npm install
```

**Create your `.env.local`:**

```bash
copy .env.example .env.local      # Windows
cp .env.example .env.local        # macOS/Linux
```

| Key | Required? | What to do |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | No | Defaults to `http://localhost:8000`, matching the backend above. |
| `ADMIN_API_USERNAME` / `ADMIN_API_PASSWORD` | **Yes**, for the admin dashboard | Must exactly match `DJANGO_SUPERADMIN_USERNAME` / `DJANGO_SUPERADMIN_PASSWORD` from `backend/.env`. |

**Run it:**

```bash
npm run dev
```

Visit `http://localhost:3000`. Login is a client-side mock in this phase (no real auth yet) — any
name/email gets you into the dashboard.

### 4. Verify everything works

- `http://localhost:3000/dashboard` loads with real customers, tasks, and playbooks (not empty).
- `http://localhost:8000/api/v1/customers/` returns JSON.
- The OpenAPI schema (drf-spectacular) is reachable per `backend/foresight_backend/urls.py`.

### 5. Running tests & linting

```bash
# Backend
cd backend
pytest
black . && flake8 .

# Frontend
cd frontend
npm run lint
npm run test
npm run build
```

## Troubleshooting

- **`start.py` hangs on "Waiting for Postgres to accept connections..."** — Docker Desktop isn't
  running yet. Open it, wait until it says "Running", then re-run `python start.py`.
- **No Docker at all** — `start.py` detects this and falls back to assuming Postgres is already
  reachable locally. Install Postgres yourself, create a database/user matching `backend/.env`'s
  `DB_NAME`/`DB_USER`/`DB_PASSWORD`, and it connects the same way.
- **Frontend admin pages return 401** — `ADMIN_API_USERNAME`/`ADMIN_API_PASSWORD` (frontend) and
  `DJANGO_SUPERADMIN_USERNAME`/`DJANGO_SUPERADMIN_PASSWORD` (backend) don't match, or the backend
  values were blank when `seed_demo_data` ran (it skips creating the account in that case — fill
  them in and re-run `python start.py`).
- **Billing webhook returns 401** — `LEMON_SQUEEZY_WEBHOOK_SECRET` isn't set. Not required unless
  you're specifically testing that flow.
- **Port already in use (3000 or 8000)** — stop whatever else is bound to it, or override with
  `RUNSERVER_HOST=0.0.0.0:8001 python start.py` (backend) / `npm run dev -- -p 3001` (frontend),
  updating `NEXT_PUBLIC_API_URL` to match if you change the backend port.

---

## f. Project Structure

```
backend/
  core/         Organization/CustomUser models, tenancy resolution, soft-delete BaseModel
  customers/    Customer, EventLog, HealthScoreEngine (churn scoring)
  rules/        HealthRule (weights/thresholds the scoring engine evaluates)
  tasks/        Inbox tasks
  playbooks/    CS playbooks
  notes/        Account notes (Customer 360)
  billing/      Lemon Squeezy webhook integration
  superadmin/   Cross-tenant admin endpoints
  start.py      Single entrypoint: db + migrate + seed + runserver

frontend/
  app/          Next.js App Router pages and layouts
  components/   ui/ (base), layout/ (structural), features/ (feature-specific)
  lib/          Utilities and Zod schemas (mirror backend serializers)
  services/     apiClient-based data-fetching modules, one per domain
```

## About the Project

This project was built iteratively using AI assistance, following the architecture and standards
in `CLAUDE.md`. You can view the history of prompts used to develop it in `prompts.md`.
