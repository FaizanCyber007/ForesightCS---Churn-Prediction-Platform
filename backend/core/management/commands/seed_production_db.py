"""
Production-scale seed script (CLAUDE.md ## Enterprise Engineering
Standards / Autonomy Directives).

Clears the database and regenerates a full multi-tenant dataset --
Organizations, a SuperAdmin, HealthRules, Customers, and EventLog
telemetry -- then runs the HealthScoreEngine so every persisted
health_score/tier reflects real, calculated data instead of factory
placeholders.

This command is orchestration only; all generation logic lives in
`core.seeding.*` (CLAUDE.md ##4 DRY/modularity) so nothing here is a
monolithic dump of seeding logic.
"""

import time

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from core.seeding import cleanup, customers, events, organizations, report, rules, scoring


class Command(BaseCommand):
    help = (
        "Clear and regenerate a full production-scale dataset (organizations, "
        "super admin, health rules, customers, event logs), then run the "
        "HealthScoreEngine against it."
    )

    def add_arguments(self, parser):
        parser.add_argument("--organizations", type=int, default=3)
        parser.add_argument("--customers", type=int, default=500)
        parser.add_argument("--events", type=int, default=10_000)
        parser.add_argument(
            "--noinput",
            "--no-input",
            action="store_false",
            dest="interactive",
            default=True,
            help="Skip the confirmation prompt before wiping existing data.",
        )

    def handle(self, *args, **options):
        self._validate_counts(options)

        if options["interactive"] and not self._confirm():
            self.stdout.write(self.style.WARNING("Aborted -- no changes made."))
            return

        started = time.monotonic()

        with transaction.atomic():
            self.stdout.write(self.style.HTTP_INFO("Clearing existing data..."))
            cleanup.clear_all()

            self.stdout.write(self.style.HTTP_INFO("Seeding organizations + super admin..."))
            orgs = organizations.seed_organizations(options["organizations"])
            superadmin, _superadmin_password = organizations.seed_superadmin()

            self.stdout.write(self.style.HTTP_INFO("Seeding health rules..."))
            health_rules = rules.seed_health_rules(orgs)

            self.stdout.write(self.style.HTTP_INFO("Seeding customers..."))
            all_customers = customers.seed_customers(orgs, options["customers"])

            self.stdout.write(self.style.HTTP_INFO("Seeding event logs..."))
            event_count = events.seed_event_logs(all_customers, options["events"])

            self.stdout.write(self.style.HTTP_INFO("Running HealthScoreEngine..."))
            tier_counts = scoring.run_scoring_engine(orgs)

        elapsed = time.monotonic() - started

        report.render_summary(
            self,
            organizations=orgs,
            superadmin=superadmin,
            health_rules_count=len(health_rules),
            customers_count=len(all_customers),
            events_count=event_count,
            tier_counts=tier_counts,
            elapsed=elapsed,
        )

    def _confirm(self) -> bool:
        self.stdout.write(
            self.style.WARNING(
                "This will permanently delete ALL Organizations, Users, HealthRules, "
                "Customers, and EventLogs in this database, then regenerate them."
            )
        )
        answer = input("Type 'yes' to continue: ")
        return answer.strip().lower() == "yes"

    def _validate_counts(self, options):
        for option_name in ("organizations", "customers", "events"):
            if options[option_name] <= 0:
                raise CommandError(f"--{option_name} must be a positive integer.")
