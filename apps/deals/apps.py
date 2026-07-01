from django.apps import AppConfig


class DealsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.deals"
    label = "deals"

    def ready(self):
        # Register signal handlers (audit hooks) on startup.
        from . import signals  # noqa: F401
