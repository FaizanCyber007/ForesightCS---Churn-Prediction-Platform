"""Colorized terminal summary for `seed_production_db`, rendered through the
management command's own `self.style`/`self.stdout` so color support
detection (TTY/Windows Terminal/CI) stays whatever Django already handles."""

from __future__ import annotations

BOX_WIDTH = 64


def render_summary(
    command,
    *,
    organizations: list,
    superadmin,
    health_rules_count: int,
    customers_count: int,
    events_count: int,
    tier_counts: dict,
    elapsed: float,
) -> None:
    style = command.style
    write = command.stdout.write
    rule = style.SUCCESS("=" * BOX_WIDTH)

    write("")
    write(rule)
    write(style.SUCCESS("FORESIGHTCS -- PRODUCTION SEED COMPLETE".center(BOX_WIDTH)))
    write(rule)

    write("")
    write(style.MIGRATE_HEADING("Dataset generated:"))
    write(f"  Organizations   : {style.SUCCESS(str(len(organizations)))}")
    write(f"  Super admins    : {style.SUCCESS('1')}")
    write(f"  Health rules    : {style.SUCCESS(str(health_rules_count))}")
    write(f"  Customers       : {style.SUCCESS(str(customers_count))}")
    write(f"  Event logs      : {style.SUCCESS(str(events_count))}")

    write("")
    write(style.MIGRATE_HEADING("Churn tiers by organization (post HealthScoreEngine run):"))
    for stats in tier_counts.values():
        org = stats["organization"]
        write(f"  {org.name}  ({stats['total']} customers)")
        write(
            "      "
            + style.SUCCESS(f"Healthy: {stats['healthy']}")
            + "   "
            + style.WARNING(f"At-Risk: {stats['at_risk']}")
            + "   "
            + style.ERROR(f"Critical: {stats['critical']}")
        )

    write("")
    write(style.MIGRATE_HEADING("Super admin credentials:"))
    write(f"  Username : {superadmin.username}")
    write("  Password : <configured via DJANGO_SUPERADMIN_PASSWORD>")

    write("")
    write(style.SUCCESS(f"Done in {elapsed:.1f}s."))
    write(rule)
    write("")
