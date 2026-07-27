# Enterprise Engineering Standards (CI/CD Readiness)

1. **Strict Linting**: The codebase must be CI-ready at all times. Python code MUST pass `black --check .` and `flake8 .` with zero errors. TS code MUST pass `npm run lint`.
2. **Test Coverage**: All backend APIs must have Pytest unit/integration tests (using `factory_boy` for mock data generation). Frontend business logic and forms must have Vitest/React Testing Library coverage.
3. **Phased Security Implementation**: During initial Core CRUD & ORM development phases, JWT Auth middleware may be bypassed for speed. However, models must be built assuming strict Role-Based Access Control (RBAC) will be enforced prior to staging deployment.
4. **Implementation Logs**: Maintain the `prompts.md` file in the root directory as an Architectural Decision Log (ADL) to track significant AI-generated logic for future engineering onboarding and SOC2 auditing.
