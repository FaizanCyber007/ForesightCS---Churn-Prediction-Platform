"""Runs the real HealthScoreEngine (customers.services) per Organization
after seeding, so persisted health_score/tier data reflects actual EventLog
telemetry (CLAUDE.md ## Churn Scoring Engine) instead of factory placeholders."""

from customers.services import HealthScoreEngine


def run_scoring_engine(organizations: list) -> dict:
    results = {}
    for organization in organizations:
        customers = HealthScoreEngine(organization).run()
        results[organization.id] = {
            "organization": organization,
            "total": len(customers),
            "healthy": sum(1 for c in customers if c.health_score >= 71),
            "at_risk": sum(1 for c in customers if 41 <= c.health_score <= 70),
            "critical": sum(1 for c in customers if c.health_score <= 40),
        }
    return results
