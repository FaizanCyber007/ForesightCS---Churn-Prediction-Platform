import random
from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from core.models import CustomUser, Organization
from customers.models import Customer, EventLog
from customers.services import HealthScoreEngine
from notes.models import CustomerNote
from playbooks.models import Playbook
from rules.models import HealthRule
from tasks.models import Task

DEMO_ORG_NAME = "ForesightCS Demo"
DEMO_ORG_SLUG = "foresight-demo"

SMB = Customer.Segment.SMB
MID_MARKET = Customer.Segment.MID_MARKET
EXPANSION = Customer.Segment.EXPANSION

STARTER = Customer.Plan.STARTER
GROWTH = Customer.Plan.GROWTH
SCALE = Customer.Plan.SCALE
ENTERPRISE = Customer.Plan.ENTERPRISE

# (company_name, contact_name, health_score, segment, plan, mrr, nps, expansion_potential)
DEMO_CUSTOMERS = [
    ("Atlas Retail", "Priya Patel", 32, SMB, STARTER, 2400, -20, 15),
    ("Northstar Health", "Marcus Webb", 45, MID_MARKET, GROWTH, 8200, 5, 30),
    ("Summit Ops", "Elena Ruiz", 88, EXPANSION, SCALE, 15600, 55, 82),
    ("Orbit Finance", "David Chen", 58, MID_MARKET, GROWTH, 9400, 10, 40),
    ("Acme Cloud", "Sarah Jenkins", 92, EXPANSION, ENTERPRISE, 24000, 68, 90),
    ("Bluepine Studio", "Tom Alvarez", 22, SMB, STARTER, 1800, -35, 8),
    ("Meridian SaaS", "Nina Osei", 38, MID_MARKET, GROWTH, 7100, -10, 20),
    ("BrightCore Inc.", "Jamal Rivers", 29, SMB, STARTER, 2100, -15, 12),
    ("Vortex Systems", "Grace Kim", 76, EXPANSION, SCALE, 13200, 45, 70),
    ("Nexus Point", "Liam Foster", 65, MID_MARKET, GROWTH, 6800, 22, 48),
    ("SignalDesk", "Amara Diallo", 95, EXPANSION, ENTERPRISE, 31000, 72, 95),
    ("Cascade Analytics", "Oscar Lindqvist", 52, MID_MARKET, GROWTH, 5400, 8, 35),
    ("Ironclad Logistics", "Beatriz Souza", 18, SMB, STARTER, 1500, -48, 5),
    ("Harborlight Media", "Kenji Watanabe", 71, MID_MARKET, SCALE, 11000, 38, 60),
    ("Pinecrest Retail", "Fatima Zahra", 40, SMB, GROWTH, 3900, -5, 25),
    ("Vantage Robotics", "Connor Hughes", 84, EXPANSION, ENTERPRISE, 27500, 60, 88),
    ("Driftwood Labs", "Ingrid Nilsen", 60, MID_MARKET, GROWTH, 6200, 15, 42),
    ("Cobalt Freight", "Noah Bergstrom", 47, SMB, GROWTH, 4300, -8, 28),
]

EVENT_TEMPLATES = [
    (EventLog.EventType.LOGIN, "User session recorded."),
    (EventLog.EventType.FEATURE_USAGE, "Feature interaction logged."),
    (EventLog.EventType.SUPPORT_TICKET, "Support ticket opened."),
    (EventLog.EventType.BILLING_ISSUE, "Invoice payment flagged."),
    (EventLog.EventType.NPS_RESPONSE, "NPS survey response received."),
    (EventLog.EventType.CONTRACT_SIGNAL, "Contract/renewal signal detected."),
]

FEATURES = ["reports", "automations", "integrations", "dashboards", "api"]

# (name, slug, subscription_status) -- extra tenants for the super-admin table.
OTHER_DEMO_ORGS = [
    ("Northwind Analytics", "northwind-analytics", Organization.SubscriptionStatus.PAST_DUE),
    ("Redline Robotics", "redline-robotics", Organization.SubscriptionStatus.SUSPENDED),
]

# (name, metric_type, threshold, weight)
DEMO_HEALTH_RULES = [
    ("Login drop watchlist", HealthRule.MetricType.LOGIN, 2, 15),
    ("Feature adoption stall", HealthRule.MetricType.FEATURE_USAGE, 1, 10),
    ("Support ticket spike", HealthRule.MetricType.SUPPORT_TICKET, 3, 20),
    ("Billing delinquency", HealthRule.MetricType.BILLING_ISSUE, 1, 30),
    ("NPS decline signal", HealthRule.MetricType.NPS_RESPONSE, 20, 15),
]

# (title, description, priority, status, task_type, related company_name, days from today)
DEMO_TASKS = [
    (
        "Schedule QBR with Meridian SaaS",
        "Executive sponsor change detected. QBR overdue by 14 days.",
        Task.Priority.HIGH,
        Task.Status.OPEN,
        Task.TaskType.SYSTEM_ALERT,
        "Meridian SaaS",
        2,
    ),
    (
        "Review renewal contract for BrightCore",
        "Renewal coming up in 60 days, low engagement detected.",
        Task.Priority.CRITICAL,
        Task.Status.OPEN,
        Task.TaskType.AUTOMATED_PLAYBOOK,
        "BrightCore Inc.",
        3,
    ),
    (
        "Follow up on feature request",
        "Summit Ops asked about custom reporting API access.",
        Task.Priority.MEDIUM,
        Task.Status.IN_PROGRESS,
        Task.TaskType.MANUAL,
        "Summit Ops",
        6,
    ),
    (
        "Onboarding check-in for Nexus Point",
        "Verify setup completion after first 30 days.",
        Task.Priority.LOW,
        Task.Status.OPEN,
        Task.TaskType.SYSTEM_ALERT,
        "Nexus Point",
        8,
    ),
    (
        "Billing delinquency warning",
        "Ironclad Logistics missed last 2 invoices.",
        Task.Priority.CRITICAL,
        Task.Status.OPEN,
        Task.TaskType.AUTOMATED_PLAYBOOK,
        "Ironclad Logistics",
        1,
    ),
]

# (name, description, trigger, status, customers_in_play, steps)
DEMO_PLAYBOOKS = [
    (
        "Critical Churn Intervention",
        "Executive-level outreach for customers flagged Critical by the ML model.",
        "Churn probability > 65%",
        Playbook.Status.ACTIVE,
        3,
        [
            "Flag for executive review",
            "Schedule emergency QBR",
            "Send personalised retention offer",
            "Log outcome",
        ],
    ),
    (
        "Engagement Drop Recovery",
        "Re-engage customers with a sharp drop in product usage.",
        "Login drop > 30% WoW",
        Playbook.Status.ACTIVE,
        2,
        ["Flag customer", "Send re-engagement email", "CS outreach call", "Log outcome"],
    ),
    (
        "90-Day Renewal Prep",
        "Prepare the CS team ahead of upcoming renewals.",
        "Renewal date in 90 days",
        Playbook.Status.ACTIVE,
        4,
        ["Review usage report", "Schedule renewal call", "Draft renewal proposal", "Log outcome"],
    ),
    (
        "Expansion Opportunity",
        "Identify and act on customers showing strong expansion signals.",
        "Expansion potential > 85%",
        Playbook.Status.ACTIVE,
        2,
        ["Flag customer", "Prepare expansion proposal", "Schedule upsell call", "Log outcome"],
    ),
]

# (related company_name, note body)
DEMO_NOTES = [
    ("Summit Ops", "Champion confirmed renewal intent during the last QBR."),
    ("Ironclad Logistics", "Escalated the open billing issue to the finance team."),
]


class Command(BaseCommand):
    help = "Seed a demo Organization with Customer + EventLog telemetry for local development."

    def handle(self, *args, **options):
        random.seed(42)

        organization, _ = Organization.objects.get_or_create(
            slug=DEMO_ORG_SLUG,
            defaults={
                "name": DEMO_ORG_NAME,
                "is_active": True,
                "lemon_squeezy_customer_id": "cus_demo_00001",
            },
        )

        owner, created = CustomUser.objects.get_or_create(
            username="cs.owner",
            defaults={
                "email": "cs.owner@foresightcs.com",
                "organization": organization,
                "is_org_admin": True,
                "first_name": "Jordan",
                "last_name": "Rivera",
            },
        )
        if owner.organization_id != organization.id:
            raise CommandError("Existing cs.owner belongs to a different organization.")
        if created:
            owner.set_unusable_password()
            owner.save(update_fields=["password"])

        today = timezone.now().date()

        for index, (
            company,
            contact,
            health_score,
            segment,
            plan,
            mrr,
            nps,
            expansion,
        ) in enumerate(DEMO_CUSTOMERS):
            customer, _ = Customer.objects.update_or_create(
                organization=organization,
                company_name=company,
                defaults={
                    "name": contact,
                    "owner": owner,
                    "segment": segment,
                    "plan": plan,
                    "health_score": health_score,
                    "mrr": mrr,
                    "annual_contract_value": mrr * 12,
                    "renewal_date": today + timedelta(days=30 + index * 12),
                    "nps": nps,
                    "expansion_potential": expansion,
                },
            )

            customer.events.all().delete()
            event_count = random.randint(5, 12)
            for _ in range(event_count):
                event_type, description = random.choice(EVENT_TEMPLATES)
                metadata = (
                    {"feature": random.choice(FEATURES)}
                    if event_type == EventLog.EventType.FEATURE_USAGE
                    else {}
                )
                EventLog.objects.create(
                    organization=organization,
                    customer=customer,
                    event_type=event_type,
                    description=description,
                    occurred_at=timezone.now() - timedelta(days=random.randint(0, 60)),
                    metadata=metadata,
                )

        for name, metric_type, threshold, weight in DEMO_HEALTH_RULES:
            HealthRule.objects.update_or_create(
                organization=organization,
                name=name,
                defaults={
                    "metric_type": metric_type,
                    "threshold": threshold,
                    "weight": weight,
                    "is_active": True,
                },
            )

        # Recalculate health_score for every customer against the persisted
        # rules + telemetry, replacing the curated values from DEMO_CUSTOMERS
        # so live API results reflect the generated data (CLAUDE.md
        # ## Churn Scoring Engine).
        HealthScoreEngine(organization).run()

        customers_by_name = {
            c.company_name: c for c in Customer.objects.filter(organization=organization)
        }

        for (
            title,
            description,
            priority,
            status,
            task_type,
            company_name,
            days_out,
        ) in DEMO_TASKS:
            Task.objects.update_or_create(
                organization=organization,
                title=title,
                defaults={
                    "description": description,
                    "priority": priority,
                    "status": status,
                    "task_type": task_type,
                    "customer": customers_by_name.get(company_name),
                    "due_date": today + timedelta(days=days_out),
                },
            )

        for name, description, trigger, status, customers_in_play, steps in DEMO_PLAYBOOKS:
            Playbook.objects.update_or_create(
                organization=organization,
                name=name,
                defaults={
                    "description": description,
                    "trigger": trigger,
                    "status": status,
                    "customers_in_play": customers_in_play,
                    "last_triggered": timezone.now() - timedelta(days=random.randint(1, 10)),
                    "steps": steps,
                },
            )

        for company_name, body in DEMO_NOTES:
            customer = customers_by_name.get(company_name)
            if customer:
                CustomerNote.objects.get_or_create(
                    customer=customer, body=body, defaults={"organization": organization}
                )

        # A couple of extra bare tenants so the super-admin Organizations
        # table (frontend/app/admin) has more than one row to demonstrate.
        for name, slug, status in OTHER_DEMO_ORGS:
            Organization.objects.get_or_create(
                slug=slug, defaults={"name": name, "subscription_status": status}
            )

        if settings.SUPERADMIN_USERNAME and settings.SUPERADMIN_PASSWORD:
            superadmin, _ = CustomUser.objects.get_or_create(
                username=settings.SUPERADMIN_USERNAME,
                defaults={"is_superuser": True, "is_staff": True, "organization": None},
            )
            superadmin.is_superuser = True
            superadmin.is_staff = True
            superadmin.organization = None
            superadmin.set_password(settings.SUPERADMIN_PASSWORD)
            superadmin.save()
        else:
            self.stdout.write(
                self.style.WARNING(
                    "DJANGO_SUPERADMIN_USERNAME/PASSWORD not set -- skipped seeding the "
                    "super-admin account used by frontend/app/admin."
                )
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded organization '{organization.name}' with {len(DEMO_CUSTOMERS)} customers, "
                f"{len(DEMO_HEALTH_RULES)} health rules, {len(DEMO_TASKS)} tasks, "
                f"{len(DEMO_PLAYBOOKS)} playbooks, and {len(DEMO_NOTES)} notes."
            )
        )
