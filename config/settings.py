"""
Django settings for the VAP Commercial Operations Platform.
Stage 1 backend foundation.
"""
import json
import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv("SECRET_KEY", "insecure-dev-key-change-me")
DEBUG = os.getenv("DEBUG", "True").lower() == "true"
ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    "corsheaders",
    # Local apps
    "apps.accounts",
    "apps.audit",
    "apps.screening",
    "apps.deals",
    "apps.notifications",
    "apps.proposals",
    "apps.projects",
    "apps.costing",
    "apps.agents",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    # Serves static assets (and the built SPA) in production; harmless in dev.
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    # Captures the current user for audit logging (must come after auth).
    "apps.audit.middleware.CurrentUserMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("DB_NAME", "vap_commercial"),
        "USER": os.getenv("DB_USER", "vap_user"),
        "PASSWORD": os.getenv("DB_PASSWORD", ""),
        "HOST": os.getenv("DB_HOST", "localhost"),
        "PORT": os.getenv("DB_PORT", "5432"),
    }
}
# In production a managed Postgres is provided as a single DATABASE_URL; when set,
# it overrides the discrete DB_* settings above. Local dev needs no DATABASE_URL.
if os.getenv("DATABASE_URL"):
    import dj_database_url
    DATABASES["default"] = dj_database_url.config(conn_max_age=600, ssl_require=True)

# Custom user model — must be set before the first migration.
AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Lagos"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedStaticFilesStorage"},
}
# The built React app (frontend/dist) is served at the site root in production.
# WhiteNoise serves its files; a SPA fallback (config/urls.py) returns index.html
# for client-side routes. In dev this dir may not exist yet — guarded below.
_FRONTEND_DIST = BASE_DIR / "frontend" / "dist"
if _FRONTEND_DIST.exists():
    WHITENOISE_ROOT = _FRONTEND_DIST
    WHITENOISE_INDEX_FILE = True

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Hosts/origins allowed in production (comma-separated env vars).
CSRF_TRUSTED_ORIGINS = [
    o for o in os.getenv("CSRF_TRUSTED_ORIGINS", "").split(",") if o
]
# In dev, trust the Vite dev server so the Django admin works through its /admin
# proxy (localhost:5173 → :8000). Dev-only, so production stays locked down.
if DEBUG:
    CSRF_TRUSTED_ORIGINS += ["http://localhost:5173", "http://127.0.0.1:5173"]
# Render provides the public hostname automatically — trust it without manual config.
_render_host = os.getenv("RENDER_EXTERNAL_HOSTNAME")
if _render_host:
    ALLOWED_HOSTS.append(_render_host)
    CSRF_TRUSTED_ORIGINS.append(f"https://{_render_host}")
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 25,
    # Map service-layer Django ValidationError (TransitionError) -> HTTP 400.
    "EXCEPTION_HANDLER": "apps.common.exceptions.exception_handler",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
}

# Stage 1 knockout: how a CONDITIONAL gate verdict (when no gate FAILed) affects
# the outcome. The "verdict cap rule" is an open item pending DEL sign-off
# (see CLAUDE.md), so it is configurable rather than hardcoded:
#   ADVANCE_CAPPED — advance to Stage 2 but flag the deal CONDITIONAL (default)
#   BLOCK          — cannot advance until conditionals are resolved to PASS/FAIL
#   PASS           — treat CONDITIONAL the same as PASS
# A FAIL on any gate always declines the deal regardless of this setting.
STAGE1_CONDITIONAL_POLICY = os.getenv("STAGE1_CONDITIONAL_POLICY", "ADVANCE_CAPPED")

# Stage 2 GO / CONDITIONAL / NO-GO bands applied to the weighted total (0–100).
# DEL-confirmed framework: weighted total >=80 -> GO, 65–79 -> CONDITIONAL,
# <65 -> NO-GO. Still read from config (overridable via env JSON) rather than
# inlined in the scoring engine. Set STAGE2_SCORE_BANDS="" to disable verdicts.
_stage2_bands = os.getenv("STAGE2_SCORE_BANDS", '{"GO": 80, "CONDITIONAL": 65}')
STAGE2_SCORE_BANDS = json.loads(_stage2_bands) if _stage2_bands else None

# Finder programme: how long a registered Sales Agent's lead is protected from
# a competing claim, in days from registration. Pending DEL sign-off on the
# finder terms — config, not code.
FINDER_PROTECTION_DAYS = int(os.getenv("FINDER_PROTECTION_DAYS", "90"))

# Nurture / Deferred pipeline classifications must be re-reviewed on a cadence;
# this is the default interval the UI uses to suggest the next review date.
PIPELINE_REVIEW_DAYS = int(os.getenv("PIPELINE_REVIEW_DAYS", "90"))

CORS_ALLOWED_ORIGINS = os.getenv(
    "CORS_ALLOWED_ORIGINS", "http://localhost:5173"
).split(",")

# Email. Dev prints to the runserver console; set EMAIL_BACKEND (and the usual
# EMAIL_HOST/PORT/HOST_USER/HOST_PASSWORD/USE_TLS) for real SMTP in production.
EMAIL_BACKEND = os.getenv("EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "noreply@vap.local")
EMAIL_HOST = os.getenv("EMAIL_HOST", "localhost")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "25"))
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "False").lower() == "true"
