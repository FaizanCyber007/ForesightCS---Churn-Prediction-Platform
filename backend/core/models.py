import uuid

from django.contrib.auth.models import AbstractUser, UserManager
from django.core.serializers.json import DjangoJSONEncoder
from django.db import models
from django.utils import timezone


class SoftDeleteQuerySet(models.QuerySet):
    def delete(self):
        """
        Soft-delete every matched instance through `BaseModel.delete` so
        each row's related BaseModel rows are cascaded and `updated_at` is
        bumped uniformly. Calling `update(deleted_at=...)` directly would
        bypass the cascade logic in `BaseModel.delete` and leave related
        rows inconsistent (CLAUDE.md ##2).
        """
        for instance in self:
            instance.delete()
        return len(self), {}

    def hard_delete(self):
        return super().delete()


class SoftDeleteManager(models.Manager.from_queryset(SoftDeleteQuerySet)):
    """Default manager for every BaseModel subclass: excludes soft-deleted rows."""

    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)


class BaseModel(models.Model):
    """
    Abstract base for every tenant-scoped model in the platform.

    Records are never physically removed via SQL DELETE -- calling
    .delete() stamps `deleted_at` instead. Use .hard_delete() only for
    permanent removal, and `all_objects` to include soft-deleted rows.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    # Declared first so Django's implicit default manager stays soft-delete-aware.
    objects = SoftDeleteManager()
    all_objects = models.Manager()

    class Meta:
        abstract = True
        ordering = ["-created_at"]

    def delete(self, using=None, keep_parents=False):
        for related_object in self._meta.related_objects:
            related_model = related_object.related_model
            if not issubclass(related_model, BaseModel):
                continue

            on_delete = getattr(related_object.field.remote_field, "on_delete", None)
            if on_delete is models.SET_NULL:
                continue

            related_manager = getattr(self, related_object.get_accessor_name())
            for related_instance in related_manager.all():
                related_instance.delete(using=using, keep_parents=keep_parents)

        self.deleted_at = timezone.now()
        self.save(using=using, update_fields=["deleted_at", "updated_at"])

    def hard_delete(self, using=None, keep_parents=False):
        super().delete(using=using, keep_parents=keep_parents)


class Organization(BaseModel):
    """A tenant. Every Customer, HealthRule, CustomUser, and EventLog belongs to one."""

    class SubscriptionStatus(models.TextChoices):
        ACTIVE = "active", "Active"
        PAST_DUE = "past_due", "Past due"
        SUSPENDED = "suspended", "Suspended"
        CANCELLED = "cancelled", "Cancelled"

    # Uniqueness is enforced via the partial UniqueConstraint below
    # (deleted_at IS NULL) so soft-deleted Organizations/Users don't block
    # reuse of the same name/slug/username/LS customer id. Field-level
    # unique=True would also apply to soft-deleted rows.
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255)
    is_active = models.BooleanField(default=True)
    subscription_status = models.CharField(
        max_length=20,
        choices=SubscriptionStatus.choices,
        default=SubscriptionStatus.ACTIVE,
        help_text="Billing state, driven by Lemon Squeezy webhooks or manual super-admin action.",
    )
    lemon_squeezy_customer_id = models.CharField(
        max_length=64,
        null=True,
        blank=True,
        default=None,
        help_text="Lemon Squeezy `customer_id`, used to map incoming billing webhooks.",
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Organization"
        verbose_name_plural = "Organizations"
        constraints = [
            models.UniqueConstraint(
                fields=["name"],
                condition=models.Q(deleted_at__isnull=True),
                name="unique_active_organization_name",
            ),
            models.UniqueConstraint(
                fields=["slug"],
                condition=models.Q(deleted_at__isnull=True),
                name="unique_active_organization_slug",
            ),
            models.UniqueConstraint(
                fields=["lemon_squeezy_customer_id"],
                condition=models.Q(deleted_at__isnull=True),
                name="unique_active_organization_lemon_squeezy_customer_id",
            ),
        ]
        indexes = [
            models.Index(fields=["name"], name="idx_organization_name"),
            models.Index(fields=["slug"], name="idx_organization_slug"),
            models.Index(fields=["lemon_squeezy_customer_id"], name="idx_org_ls_customer_id"),
        ]

    def __str__(self):
        return self.name


class CustomUserManager(UserManager.from_queryset(SoftDeleteQuerySet)):
    """UserManager (create_user/create_superuser) with soft-delete filtering."""

    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)

    def create_user(self, username, email=None, password=None, **extra_fields):
        if extra_fields.get("is_superuser"):
            extra_fields["organization"] = None
        elif extra_fields.get("organization") is None:
            raise ValueError("organization is required for non-superuser accounts.")
        return super().create_user(username, email=email, password=password, **extra_fields)

    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields["is_superuser"] = True
        extra_fields["is_staff"] = True
        extra_fields["organization"] = None
        return super().create_superuser(username, email=email, password=password, **extra_fields)

    def _create_user(self, username, email, password, **extra_fields):
        if not extra_fields.get("is_superuser") and not extra_fields.get("organization"):
            raise ValueError("organization is required for non-superuser accounts.")
        return super()._create_user(username, email, password, **extra_fields)


class CustomUser(AbstractUser, BaseModel):
    """
    Platform user. Belongs to an Organization (tenant) unless it is a
    superuser performing cross-tenant administration (see CLAUDE.md ##1).
    """

    # `username` is inherited from AbstractUser with field-level unique=True.
    # We override it here so we can drop the field-level uniqueness and
    # enforce it only for active (non-soft-deleted) users, matching the
    # soft-delete standard (CLAUDE.md ##2) and letting deleted users free
    # up their username for re-registration.
    username = models.CharField(
        max_length=150,
        unique=False,  # enforced by the partial UniqueConstraint below
        help_text="Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only.",
        validators=[AbstractUser._meta.get_field("username").validators[0]],
        error_messages={
            "unique": "A user with that username already exists.",
        },
        verbose_name="username",
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.PROTECT,
        related_name="users",
        null=True,
        blank=True,
        help_text="Tenant this user belongs to. Null only for platform superusers.",
    )
    is_org_admin = models.BooleanField(
        default=False,
        help_text="Can manage users, rules, and settings within their own organization.",
    )
    title = models.CharField(
        max_length=100,
        blank=True,
        default="",
        help_text=(
            "Free-text job title (e.g. 'Founder', 'VP CS'), set at registration " "or in Settings."
        ),
    )

    # Declared first so Django's implicit default manager stays soft-delete-aware.
    objects = CustomUserManager()
    all_objects = models.Manager()

    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"
        constraints = [
            models.CheckConstraint(
                condition=models.Q(organization__isnull=False) | models.Q(is_superuser=True),
                name="user_requires_organization_unless_superuser",
            ),
            models.UniqueConstraint(
                fields=["username"],
                condition=models.Q(deleted_at__isnull=True),
                name="unique_active_customuser_username",
            ),
        ]
        indexes = [
            models.Index(fields=["username"], name="idx_customuser_username"),
        ]

    def __str__(self):
        return self.username


class AuditLog(models.Model):
    """
    Immutable record of a critical platform action, for SOC2-style audit
    trails (e.g. "User X updated Rule Y", "Lemon Squeezy suspended
    Organization Z"). Deliberately not a `BaseModel` subclass -- an audit
    trail must never be soft-deletable or mutable after creation, so it gets
    a plain auto PK and no `deleted_at`/`.delete()` semantics at all.

    `organization`/`actor` use SET_NULL so a later hard-delete of a tenant or
    user (e.g. GDPR erasure) can't cascade into silently destroying the
    audit trail that referenced them -- the log entry survives, just with
    those fields blanked.
    """

    class Action(models.TextChoices):
        RULE_CREATED = "rule_created", "Health rule created"
        RULE_UPDATED = "rule_updated", "Health rule updated"
        ORG_SUSPENDED = "org_suspended", "Organization suspended"
        ORG_REACTIVATED = "org_reactivated", "Organization reactivated"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    actor = models.ForeignKey(
        "core.CustomUser",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
        help_text="Null for system-triggered actions (e.g. a billing webhook).",
    )
    action = models.CharField(max_length=32, choices=Action.choices, db_index=True)
    description = models.CharField(max_length=500)
    metadata = models.JSONField(encoder=DjangoJSONEncoder, default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Audit Log"
        verbose_name_plural = "Audit Logs"

    def __str__(self):
        return f"{self.get_action_display()} @ {self.created_at:%Y-%m-%d %H:%M}"


class IdempotencyRecord(models.Model):
    """
    Atomic claim + persisted result for one Idempotency-Key request.

    `key` is a fully-scoped string (viewset + organization + caller + the
    client's Idempotency-Key header, see core.mixins.IdempotencyKeyMixin).
    Its DB-level uniqueness is what makes concurrent duplicate POSTs safe:
    only one concurrent request can insert its claim row, so only one ever
    reaches the wrapped `create()` -- unlike a cache-only get-then-set,
    which two workers can both pass before either has written the cache.
    """

    key = models.CharField(max_length=255, unique=True)
    response_status = models.PositiveSmallIntegerField(null=True, blank=True)
    response_data = models.JSONField(encoder=DjangoJSONEncoder, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.key
