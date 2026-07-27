"""
Django settings for foresight_backend project.
"""

import re
from datetime import timedelta
from pathlib import Path

import dj_database_url
import environ
from celery.schedules import crontab

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, ["localhost", "127.0.0.1"]),
    CORS_ALLOWED_ORIGINS=(list, ["http://localhost:3000"]),
    CSRF_TRUSTED_ORIGINS=(list, ["http://localhost:3000"]),
    DB_CONN_MAX_AGE=(int, 60),
    REDIS_URL=(str, "redis://127.0.0.1:6379/0"),
)
environ.Env.read_env(BASE_DIR / ".env")


def _clean_origins(raw: list) -> list:
    """Sanitize a list of CORS/CSRF origins read from environment variables.

    Render's (and Vercel's) env var dashboards make it easy to accidentally
    include the full 'KEY=value' pair as the value, e.g. setting
    CORS_ALLOWED_ORIGINS to 'FRONTEND_URL=https://app.vercel.app' instead of
    just 'https://app.vercel.app'. This function handles that, plus trailing
    slashes (E014) and any other surrounding whitespace/noise.
    """
    result = []
    for entry in raw:
        entry = str(entry).strip()
        # Strip accidental 'KEY=...' prefix produced by copy-pasting env var
        # declarations (e.g. "FRONTEND_URL=https://...") into a value field.
        if "=" in entry and not entry.startswith(("http://", "https://")):
            entry = entry.split("=", 1)[1].strip()
        # Strip trailing slashes -- corsheaders.E014 rejects them.
        entry = entry.rstrip("/")
        # Only keep entries that look like a valid origin.
        if entry.startswith(("http://", "https://")):
            result.append(entry)
    return result


def _clean_hosts(raw: list) -> list:
    """Sanitize ALLOWED_HOSTS the same way -- strip KEY= prefixes and junk."""
    result = []
    for entry in raw:
        entry = str(entry).strip()
        if "=" in entry:
            entry = entry.split("=", 1)[1].strip()
        entry = entry.rstrip("/")
        if entry:
            result.append(entry)
    return result

SECRET_KEY = env(
    "DJANGO_SECRET_KEY",
    default=env("SECRET_KEY", default="django-insecure-change-me-in-production-foresight-cs"),
)
DEBUG = env("DEBUG")
ALLOWED_HOSTS = _clean_hosts(env("ALLOWED_HOSTS"))
# Render's *.onrender.com domain is always a valid host for this service.
if not any(h.endswith(".onrender.com") or h == ".onrender.com" for h in ALLOWED_HOSTS):
    ALLOWED_HOSTS.append(".onrender.com")

# Signing key for access/refresh JWTs (rest_framework_simplejwt). Kept
# separate from SECRET_KEY so rotating one never invalidates the other's
# tokens/sessions.
JWT_SECRET = env("JWT_SECRET", default=SECRET_KEY)


# Application definition

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    "rest_framework.authtoken",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "drf_spectacular",
    "django_filters",
    # Local
    "core",
    "customers",
    "rules",
    "superadmin",
    "billing",
    "notes",
    "tasks",
    "playbooks",
    "contacts",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    # Serves collected static files directly from Gunicorn on Render, where
    # there's no separate CDN/nginx tier -- must sit right behind
    # SecurityMiddleware per whitenoise's own install instructions.
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "foresight_backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "foresight_backend.wsgi.application"


# Database
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases
# ABSOLUTELY NO hardcoded credentials -- everything is read from .env via django-environ.
#
# Three-tier fallback so the same settings module works unmodified across
# environments: a single DATABASE_URL (Render/Neon in production) takes
# priority; local dev falls back to the discrete DB_* vars pointing at the
# docker-compose Postgres container (see start.py); if neither is
# configured (e.g. a fresh checkout with no .env and no Docker), fall back
# to sqlite so the server can still boot.
DATABASE_URL = env("DATABASE_URL", default="")
if DATABASE_URL:
    DATABASES = {
        "default": dj_database_url.parse(DATABASE_URL, conn_max_age=env("DB_CONN_MAX_AGE"))
    }
elif env("DB_NAME", default=""):
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": env("DB_NAME"),
            "USER": env("DB_USER"),
            "PASSWORD": env("DB_PASSWORD"),
            "HOST": env("DB_HOST"),
            "PORT": env("DB_PORT"),
            "CONN_MAX_AGE": env("DB_CONN_MAX_AGE"),
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }


# Custom multi-tenant user model
AUTH_USER_MODEL = "core.CustomUser"
# Django's auth.E003 only recognizes field-level `unique=True`; CustomUser
# instead enforces username uniqueness with a database partial constraint for
# non-deleted (authenticatable) accounts, so soft-deleted users can be reused.
SILENCED_SYSTEM_CHECKS = ["auth.E003"]


# Password hashing -- Argon2 is Django's own recommended hasher (winner of
# the 2015 Password Hashing Competition), listed first so it's used for
# every new/changed password; PBKDF2 stays right behind it so existing
# hashes keep verifying and get silently upgraded to Argon2 on next login
# (Django's per-hash algorithm tagging handles this transparently).
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher",
    "django.contrib.auth.hashers.ScryptPasswordHasher",
]

# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.2/howto/static-files/

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    # Adds cache-busting hashed filenames + gzip/brotli compression to
    # everything `collectstatic` writes to STATIC_ROOT above.
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# Django REST Framework
# RBAC/tenant-scoping is enforced project-wide (CLAUDE.md ##1/##3): the
# AllowAny fallback is gone. Any view that must be reachable without a
# session (webhooks, login/logout) opts out explicitly with its own
# permission_classes -- see billing.views.LemonSqueezyWebhookView and
# core.views.LoginView/LogoutView.
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        # Reads the `access` HttpOnly cookie set by core.views.LoginView --
        # tried first since it's the enterprise-grade path going forward;
        # Session/Token remain for the existing Basic-Auth super-admin flow
        # (see superadmin.views, customers.views) until that's migrated too.
        "core.authentication.CookieJWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
        "rest_framework.authentication.TokenAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PAGINATION_CLASS": "core.pagination.StandardPagination",
    "DEFAULT_FILTER_BACKENDS": ["django_filters.rest_framework.DjangoFilterBackend"],
    "PAGE_SIZE": 25,
    # Baseline abuse protection project-wide, plus a much stricter "login"
    # scope (core.views.LoginView opts into it via throttle_scope) --
    # brute-forcing/credential-stuffing the login endpoint is the highest-
    # value target on this API, so it gets its own tight limit independent
    # of the generous anon/user defaults everything else uses.
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/minute",
        "user": "300/minute",
        "login": "10/minute",
        "register": "5/minute",
    },
}

SPECTACULAR_SETTINGS = {
    "TITLE": "ForesightCS API",
    "DESCRIPTION": "Churn prediction platform for SMB software companies.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

# CORS -- frontend (Next.js) origin(s) only, read from env.
# _clean_origins() strips trailing slashes (corsheaders.E014), accidental
# 'KEY=value' prefixes (corsheaders.E013 -- produced when the full env var
# declaration is pasted into Render's value field), and any non-http/https junk.
CORS_ALLOWED_ORIGINS = _clean_origins(env("CORS_ALLOWED_ORIGINS"))
# Needed for CSRF-protected, cookie-based requests (Django admin,
# SessionAuthentication) from the frontend origin.
CSRF_TRUSTED_ORIGINS = _clean_origins(env("CSRF_TRUSTED_ORIGINS"))
# Deployed frontend origin (Vercel). Set this ONE env var in Render/Vercel
# dashboards; it is automatically added to CORS and CSRF lists below.
# Value should be just the origin: https://your-app.vercel.app (no trailing /)
_raw_frontend = env("FRONTEND_URL", default="").strip()
# Guard against the same KEY=value copy-paste mistake for FRONTEND_URL itself.
if "=" in _raw_frontend and not _raw_frontend.startswith(("http://", "https://")):
    _raw_frontend = _raw_frontend.split("=", 1)[1].strip()
FRONTEND_URL = _raw_frontend.rstrip("/")
if FRONTEND_URL and FRONTEND_URL.startswith(("http://", "https://")):
    if FRONTEND_URL not in CORS_ALLOWED_ORIGINS:
        CORS_ALLOWED_ORIGINS.append(FRONTEND_URL)
    if FRONTEND_URL not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append(FRONTEND_URL)
# Required for the browser to attach HttpOnly JWT cookies on cross-origin
# requests -- without this the browser silently drops Set-Cookie headers.
CORS_ALLOW_CREDENTIALS = True

# Vercel preview deployments get a unique URL per commit/branch
# (e.g. myapp-git-main-myteam.vercel.app) that differs from the production
# URL. CORS_ALLOWED_ORIGINS only does exact matching, so preview URLs are
# rejected even though the production URL is correctly configured.
#
# Fix: set VERCEL_TEAM_SUFFIX in Render to the account/team slug that appears
# at the end of ALL your preview URLs. For example, for:
#   https://foresight-cs-churn-p-git-abc123-faizan-javeds-projects-04834141.vercel.app
# the suffix is: faizan-javeds-projects-04834141
#
# This regex then allows EVERY preview URL for that Vercel account.
_vercel_suffix = env("VERCEL_TEAM_SUFFIX", default="").strip().lstrip("-")
CORS_ALLOWED_ORIGIN_REGEXES = []
if _vercel_suffix:
    # Matches: https://<anything>-<suffix>.vercel.app
    CORS_ALLOWED_ORIGIN_REGEXES.append(
        rf"^https://[\w-]+-{re.escape(_vercel_suffix)}\.vercel\.app$"
    )
    # Also match the production URL which may not have the suffix in it
    # (e.g. https://foresight-cs-churn-prediction-platf.vercel.app)
    if FRONTEND_URL and FRONTEND_URL not in CORS_ALLOWED_ORIGINS:
        CORS_ALLOWED_ORIGIN_REGEXES.append(rf"^{re.escape(FRONTEND_URL)}$")
    # Extend CSRF_TRUSTED_ORIGINS for the same preview URL pattern so Django's
    # CSRF middleware also accepts requests from preview deployments.
    if not any("vercel.app" in o for o in CSRF_TRUSTED_ORIGINS):
        CSRF_TRUSTED_ORIGINS.append("https://*.vercel.app")

# Production hardening (django's own `manage.py check --deploy` checklist:
# security.W004/W008/W012/W016) -- gated on DEBUG so local dev over plain
# HTTP isn't broken (SECURE_SSL_REDIRECT=True would make the dev server
# unusable without TLS). SECURE_HSTS_PRELOAD is deliberately left off:
# submitting a domain to browsers' hardcoded preload list is hard to
# reverse and should be an explicit, later decision once the production
# domain is stable, not something enabled silently here.
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_REFERRER_POLICY = "same-origin"
    # Trust the X-Forwarded-Proto header from a terminating reverse
    # proxy/load balancer so Django knows the original request was HTTPS
    # even though it receives plain HTTP from the proxy itself. Only
    # meaningful -- and only safe -- behind a proxy that always sets this
    # header itself; harmless when there is no proxy in front.
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# rest_framework_simplejwt -- tokens are never returned in a JSON body (see
# core.views.LoginView); they're only ever read from the HttpOnly cookies
# core.authentication.CookieJWTAuthentication looks for, so SameSite=Lax on
# those cookies is this app's CSRF defense for JWT-authenticated requests
# (DRF's CSRF enforcement only applies to SessionAuthentication).
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": JWT_SECRET,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# Lemon Squeezy billing webhooks (billing app) -- verifies the `X-Signature`
# header on every incoming webhook. Must be set before that endpoint will
# accept any request; see backend/.env.example.
LEMON_SQUEEZY_WEBHOOK_SECRET = env("LEMON_SQUEEZY_WEBHOOK_SECRET", default="")

# Local dev/demo super-admin account, created by `manage.py seed_demo_data`.
# Lets the Next.js server authenticate to superadmin's Basic-Auth-gated API
# (frontend/services/admin.ts) without a full session/JWT login flow, which
# doesn't exist yet anywhere in this Phase 1 app. Leave unset to skip seeding.
SUPERADMIN_USERNAME = env("DJANGO_SUPERADMIN_USERNAME", default="")
SUPERADMIN_PASSWORD = env("DJANGO_SUPERADMIN_PASSWORD", default="")

# Celery -- background execution for work that must not run in-request, e.g.
# the nightly Churn Scoring Engine sweep (customers/tasks.py). Broker and
# result backend are the same local Redis instance (docker-compose.yml's
# `redis` service; REDIS_URL defaults to it, same pattern as DB_* above).
REDIS_URL = env("REDIS_URL", default="redis://127.0.0.1:6379/0")
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE
# Nightly at 02:00 UTC: recalculate health_score for every active
# Organization's customers, fanned out as one task per org (see
# customers.tasks.recalculate_all_organizations_health_scores) instead of one
# giant task, so a single tenant's failure/slowness can't block the rest.
CELERY_BEAT_SCHEDULE = {
    "nightly-health-score-recalculation": {
        "task": "customers.tasks.recalculate_all_organizations_health_scores",
        "schedule": crontab(hour=2, minute=0),
    },
}
