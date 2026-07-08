"""
User model for the Commercial Operations Platform.

Authentication and authorisation use a four-role model (see the Data Model &
Audit Specification, Section 2): Business Developer, Analyst, Manager, Admin.
The Investment Committee is not a separate login role — it is the Management
Investment Committee, represented in the app by the Manager role, who records
the Stage 2 GO / NO-GO decision.
"""
import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models

from .managers import UserManager


class Role(models.TextChoices):
    BD = "BD", "Business Developer"
    ANALYST = "ANALYST", "Analyst"
    MANAGER = "MANAGER", "Manager"
    ADMIN = "ADMIN", "Admin"


class User(AbstractUser):
    """
    Custom user keyed by UUID. Email is the login identity.

    We keep Django's username field (AbstractUser) to avoid fighting the
    framework, but authentication and display use email. One role per user
    for now; the model can extend to multiple roles later without a rewrite.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255, blank=True)
    role = models.CharField(
        max_length=20, choices=Role.choices, default=Role.BD
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]  # createsuperuser still prompts for username

    objects = UserManager()

    class Meta:
        db_table = "users"
        ordering = ["full_name", "email"]

    def __str__(self):
        return f"{self.full_name or self.email} ({self.get_role_display()})"

    # Convenience role checks used throughout the codebase.
    @property
    def is_business_developer(self):
        return self.role == Role.BD

    @property
    def is_analyst(self):
        return self.role == Role.ANALYST

    @property
    def is_manager(self):
        return self.role == Role.MANAGER

    @property
    def can_assess_deals(self):
        """Analysts and Managers may review/assess submitted deals."""
        return self.role in {Role.ANALYST, Role.MANAGER}

    @property
    def can_approve_edit_access(self):
        """Either an Analyst or a Manager may approve edit-access requests."""
        return self.role in {Role.ANALYST, Role.MANAGER}

    @property
    def can_decide_stage2(self):
        """
        The Management Investment Committee records the final Stage 2 GO/NO-GO
        decision. The Manager role acts for the committee (Admin retains it too).
        """
        return self.role in {Role.MANAGER, Role.ADMIN}

    @property
    def can_view_full_pipeline(self):
        """
        Everyone can view the whole pipeline. BDs are a shared team (any BD may
        view and edit any deal), and assessors/IC/admin see everything too. Edit
        and assessment rights still differ by role.
        """
        return True
