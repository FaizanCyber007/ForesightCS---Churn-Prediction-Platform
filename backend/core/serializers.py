from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Q
from django.utils.text import slugify
from rest_framework import serializers

from core.models import Organization

User = get_user_model()


class LoginSerializer(serializers.Serializer):
    """
    Verifies a login `identifier` (username or email) + `password` pair.

    Kept out of the view (CLAUDE.md ##3 Front-to-Back Symmetry): DRF
    serializers are the idiomatic place for input validation, and moving
    the credential check into `validate()` lets `LoginView` stay pure
    orchestration.
    """

    identifier = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user_obj = User.objects.filter(
            Q(username__iexact=attrs["identifier"]) | Q(email__iexact=attrs["identifier"])
        ).first()

        user = None
        if user_obj is not None:
            user = authenticate(username=user_obj.username, password=attrs["password"])

        if user is None:
            raise serializers.ValidationError("Invalid credentials.")

        attrs["user"] = user
        return attrs


class RegisterSerializer(serializers.Serializer):
    """
    Founds a brand-new Organization (tenant) and its first CustomUser
    (is_org_admin=True -- they're the one setting the workspace up) in one
    request. There's no invite-based "join an existing org" flow yet;
    every registration creates its own tenant, matching the frontend's
    RegisterForm (one workspace per signup).

    `title` (job title, e.g. "Founder") is persisted onto the new user --
    see CustomUser.title.
    """

    full_name = serializers.CharField(max_length=255)
    company_name = serializers.CharField(max_length=255)
    title = serializers.CharField(max_length=100, required=False, allow_blank=True)
    email = serializers.EmailField()
    username = serializers.CharField(min_length=3, max_length=150)
    password = serializers.CharField(write_only=True)

    def validate_company_name(self, value):
        if Organization.objects.filter(name__iexact=value).exists():
            raise serializers.ValidationError("An organization with this name already exists.")
        return value

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("A user with that username already exists.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with that email already exists.")
        return value

    def validate_password(self, value):
        # Enforces the same AUTH_PASSWORD_VALIDATORS Django itself uses
        # (settings.py) -- login never sets a password so this is the one
        # place a weak/common password could otherwise slip in.
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages)) from exc
        return value

    def create(self, validated_data):
        full_name = validated_data["full_name"].strip()
        first_name, _, last_name = full_name.partition(" ")

        with transaction.atomic():
            organization = Organization.objects.create(
                name=validated_data["company_name"],
                slug=self._unique_slug(validated_data["company_name"]),
            )
            user = User(
                username=validated_data["username"],
                email=validated_data["email"],
                first_name=first_name,
                last_name=last_name,
                organization=organization,
                is_org_admin=True,
                title=validated_data.get("title", ""),
            )
            user.set_password(validated_data["password"])
            user.save()
        return user

    @staticmethod
    def _unique_slug(name: str) -> str:
        base_slug = slugify(name) or "organization"
        slug = base_slug
        suffix = 1
        while Organization.objects.filter(slug=slug).exists():
            suffix += 1
            slug = f"{base_slug}-{suffix}"
        return slug


class UserUpdateSerializer(serializers.ModelSerializer):
    """
    Backs `PATCH /api/v1/auth/user/`. `full_name` is a write-only
    passthrough (not a real model field), split into first_name/last_name
    the same way `RegisterSerializer.create` does, so both entry points
    stay consistent. Company name is deliberately not editable here --
    it's an Organization property, edited via `OrganizationSerializer`
    instead, never duplicated across two forms.
    """

    full_name = serializers.CharField(max_length=255, required=False)

    class Meta:
        model = User
        fields = ["full_name", "email", "title"]
        extra_kwargs = {"email": {"required": False, "allow_blank": False}}

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError("A user with that email already exists.")
        return value

    def update(self, instance, validated_data):
        full_name = validated_data.pop("full_name", None)
        if full_name is not None:
            first_name, _, last_name = full_name.strip().partition(" ")
            instance.first_name = first_name
            instance.last_name = last_name
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        return instance


class OrganizationSerializer(serializers.ModelSerializer):
    """Backs `GET`/`PATCH /api/v1/organizations/me/`. `slug` stays derived/immutable
    so existing references (e.g. billing webhooks matching on it) never break."""

    class Meta:
        model = Organization
        fields = ["id", "name", "slug"]
        read_only_fields = ["id", "slug"]

    def validate_name(self, value):
        # Organization.name has no field-level unique=True -- uniqueness is
        # enforced only by a conditional UniqueConstraint (models.py, scoped
        # to non-soft-deleted rows), which DRF's automatic UniqueValidator
        # generation doesn't pick up. Without this check, a colliding PATCH
        # would hit that constraint at the DB level and surface as an
        # uncaught IntegrityError (500) instead of a clean 400. Mirrors
        # RegisterSerializer.validate_company_name's case-insensitive check,
        # excluding this serializer's own instance so re-saving an
        # unchanged name never false-positives against itself.
        if Organization.objects.filter(name__iexact=value).exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError("An organization with this name already exists.")
        return value


def build_user_session(user) -> dict:
    """
    The UserSession payload shape shared by `LoginView`, `MeView`, and
    `RefreshView`.

    Kept in one place (CLAUDE.md ##4 DRY) so those endpoints can never
    drift out of sync on what a session actually contains. `role` is the
    computed Admin/User permission level (from `is_org_admin`); `title`
    is the separate free-text job title the user set at registration or
    in Settings -- the two used to collide under the same `role` key,
    which is why they're distinct fields here.
    """
    return {
        "id": str(user.id),
        "fullName": f"{user.first_name} {user.last_name}".strip() or user.username,
        "companyName": user.organization.name if user.organization else "Foresight Labs",
        "role": "Admin" if user.is_org_admin else "User",
        "title": user.title,
        "email": user.email,
        "username": user.username,
        "isSuperuser": user.is_superuser,
    }
