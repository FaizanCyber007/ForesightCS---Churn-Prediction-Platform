# The Churn Scoring Engine (Business Logic)

- **Base Score**: Every `Customer` starts at 100.
- **Calculation Engine**: The system iterates through the Organization's `HealthRule`s. If a customer violates a rule (based on their `EventLog` telemetry), the rule's `weight` is subtracted from their score.
- **Tiers**:
  - 71-100: `Healthy`
  - 41-70: `At Risk`
  - 0-40: `Critical`

Implemented in `backend/customers/services.py` (`HealthScoreEngine`). Kept out of views/serializers per [architecture.md](architecture.md) ##4 -- DRF layers stay thin and only orchestrate calls into this module.
