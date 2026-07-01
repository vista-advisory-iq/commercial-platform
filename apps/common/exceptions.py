"""
DRF exception handling.

The service layer raises Django's ``ValidationError`` (e.g. ``TransitionError``)
to reject invalid lifecycle actions. DRF's default handler doesn't translate
that — it would surface as a 500. This handler maps it to a 400 with a readable
``detail`` so the API returns proper client errors uniformly.
"""
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler


def exception_handler(exc, context):
    if isinstance(exc, DjangoValidationError):
        detail = exc.messages[0] if getattr(exc, "messages", None) else "Invalid request."
        return Response({"detail": detail}, status=400)
    return drf_exception_handler(exc, context)
