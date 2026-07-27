from django.utils import timezone
from rest_framework import serializers

from contacts.serializers import ContactSerializer
from customers.models import Customer, EventLog
from notes.serializers import CustomerNoteSerializer


class EventLogSerializer(serializers.ModelSerializer):
    category = serializers.ReadOnlyField()

    class Meta:
        model = EventLog
        fields = ["id", "event_type", "category", "description", "occurred_at", "metadata"]


class CustomerSerializer(serializers.ModelSerializer):
    health = serializers.ReadOnlyField()
    churn_probability = serializers.ReadOnlyField()
    owner_name = serializers.SerializerMethodField()
    customer_owner_email = serializers.SerializerMethodField()
    support_tickets_count = serializers.SerializerMethodField()
    last_active_days = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = [
            "id",
            "name",
            "company_name",
            "owner_name",
            "customer_owner_email",
            "segment",
            "plan",
            "health",
            "health_score",
            "churn_probability",
            "mrr",
            "annual_contract_value",
            "renewal_date",
            "nps",
            "expansion_potential",
            "support_tickets_count",
            "last_active_days",
            "created_at",
            "updated_at",
        ]
        # health_score is read-only: per CLAUDE.md's Churn Scoring Engine rules,
        # it must only change via the HealthScoreEngine (POST .../calculate/),
        # never a direct client-supplied value.
        read_only_fields = ["id", "health_score", "created_at", "updated_at"]

    def get_owner_name(self, obj) -> str:
        if not obj.owner:
            return "Unassigned"
        return obj.owner.get_full_name() or obj.owner.username

    def get_customer_owner_email(self, obj) -> str | None:
        if obj.owner and obj.owner.email.strip():
            return obj.owner.email
        return None

    def get_support_tickets_count(self, obj) -> int:
        if hasattr(obj, "support_tickets_count_annotated"):
            return obj.support_tickets_count_annotated
        return obj.events.filter(event_type=EventLog.EventType.SUPPORT_TICKET).count()

    def get_last_active_days(self, obj) -> int:
        if hasattr(obj, "last_event_at_annotated"):
            latest = obj.last_event_at_annotated
        else:
            latest = (
                obj.events.order_by("-occurred_at").values_list("occurred_at", flat=True).first()
            )
        reference = latest or obj.updated_at
        return max(0, (timezone.now() - reference).days)


class CustomerDetailSerializer(CustomerSerializer):
    recent_events = serializers.SerializerMethodField()
    recent_notes = serializers.SerializerMethodField()
    contacts = serializers.SerializerMethodField()
    technology_signals = serializers.SerializerMethodField()

    class Meta(CustomerSerializer.Meta):
        fields = CustomerSerializer.Meta.fields + [
            "recent_events",
            "recent_notes",
            "contacts",
            "technology_signals",
        ]

    def get_recent_events(self, obj) -> list:
        events = obj.events.order_by("-occurred_at")[:15]
        return EventLogSerializer(events, many=True).data

    def get_recent_notes(self, obj) -> list:
        notes = obj.notes.order_by("-created_at")[:20]
        return CustomerNoteSerializer(notes, many=True).data

    def get_contacts(self, obj) -> list:
        contacts = obj.contacts.order_by("name")
        return ContactSerializer(contacts, many=True).data

    def get_technology_signals(self, obj) -> dict:
        window_start = timezone.now() - timezone.timedelta(days=7)
        logins_per_week = obj.events.filter(
            event_type=EventLog.EventType.LOGIN, occurred_at__gte=window_start
        ).count()
        distinct_members = (
            obj.events.filter(event_type=EventLog.EventType.FEATURE_USAGE)
            .exclude(metadata__user_id__isnull=True)
            .values_list("metadata__user_id", flat=True)
            .distinct()
        )

        return {
            "feature_adoption": min(100, obj.health_score),
            "logins_per_week": logins_per_week,
            "team_members_active": max(1, distinct_members.count()),
            "api_usage": min(100, obj.expansion_potential + 8),
        }
