"""Custom manager so users are created with email as the identity."""
from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import UserManager as DjangoUserManager


class UserManager(DjangoUserManager):
    """
    Mirrors Django's UserManager but tolerates email-first creation.

    We still pass a username (AbstractUser keeps it), defaulting it to the
    email when not supplied, so superuser creation and tests stay simple.
    """

    def _create_user(self, username, email, password, **extra_fields):
        if not email:
            raise ValueError("An email address is required.")
        email = self.normalize_email(email)
        username = username or email
        user = self.model(username=username, email=email, **extra_fields)
        user.password = make_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, username=None, email=None, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(username, email, password, **extra_fields)

    def create_superuser(self, username=None, email=None, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", "ADMIN")
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")
        return self._create_user(username, email, password, **extra_fields)
