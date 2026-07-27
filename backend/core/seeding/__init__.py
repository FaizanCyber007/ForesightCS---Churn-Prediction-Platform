"""
Modular services backing `manage.py seed_production_db`.

Each module owns one slice of the seed (cleanup, orgs, rules, customers,
events, scoring, reporting) so the management command itself stays a thin
orchestrator (CLAUDE.md ##4 DRY/modularity) instead of one monolithic file.
"""
