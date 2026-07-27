# ForesightCS - Enterprise Architecture & Engineering Guidelines

**ForesightCS** is a production-ready, highly scalable B2B SaaS platform that predicts customer churn for SMB software companies using a Heuristic (Rule-Based) Scoring Engine.

- **Frontend**: High-performance, premium SaaS UI (dark mode, glassmorphism, 3D spatial elements).
- **Backend**: Enterprise-grade, multi-tenant REST API built for high concurrency.

This file is an index. Full guidelines live in `docs/`:

- [docs/architecture.md](docs/architecture.md) -- Core architectural rules (multi-tenancy, soft delete, front-to-back symmetry, DRY). Read this first; it's binding on both sides of the stack.
- [docs/business-logic.md](docs/business-logic.md) -- The Churn Scoring Engine.
- [docs/engineering-standards.md](docs/engineering-standards.md) -- CI/CD readiness: linting, test coverage, phased security, the `prompts.md` ADL.
- [docs/autonomy.md](docs/autonomy.md) -- Claude's autonomy directives (senior staff level).
- [docs/roles/backend.md](docs/roles/backend.md) -- Backend (`/backend`) tech stack, applicable rules, terminal commands.
- [docs/roles/frontend.md](docs/roles/frontend.md) -- Frontend (`/frontend`) tech stack, applicable rules, terminal commands.
