"""
Thread-local storage of the current request user.

The audit layer records *who* made each change. Model-level code (signals,
save methods) doesn't have direct access to the request, so this middleware
stashes the authenticated user in thread-local storage for the duration of
the request, and the audit helpers read it back.

This is the application-level CDC approach from the spec (Section 7.2):
business accountability ("who" and "why") lives in the app, not the database.
"""
import threading

_thread_locals = threading.local()


def get_current_user():
    """Return the user for the active request, or None (e.g. shell, migrations)."""
    return getattr(_thread_locals, "user", None)


def set_current_user(user):
    _thread_locals.user = user


class CurrentUserMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        user = getattr(request, "user", None)
        set_current_user(user if (user and user.is_authenticated) else None)
        try:
            response = self.get_response(request)
        finally:
            # Always clear, so a recycled thread never leaks a stale user.
            set_current_user(None)
        return response
