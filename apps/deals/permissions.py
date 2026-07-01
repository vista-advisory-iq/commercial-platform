"""
DRF permission classes implementing the access-control matrix
(Data Model & Audit Specification, Section 5).

These are deliberately small and named for what they protect, so the rules
are readable at the point of use in views.py.
"""
from rest_framework.permissions import BasePermission, SAFE_METHODS

from .models import Deal


class IsBusinessDeveloper(BasePermission):
    message = "Only a Business Developer may perform this action."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_business_developer)


class CanAssessDeals(BasePermission):
    """Analysts and Managers."""
    message = "Only an Analyst or Manager may perform this action."

    def has_permission(self, request, view):
        return bool(request.user and request.user.can_assess_deals)


class CanDecideStage2(BasePermission):
    """Investment Committee members (and Admins)."""
    message = "Only an IC member may record the Stage 2 decision."

    def has_permission(self, request, view):
        return bool(request.user and request.user.can_decide_stage2)


class DealAccessPermission(BasePermission):
    """
    Object-level visibility and edit rules for a single deal:

      * Everyone may view any deal (BDs are a shared team; full pipeline).
      * Any BD may edit a deal while it is in a BD-editable state (DRAFT or
        REJECTED_TO_BD) — not only the one who created it.
      * Everyone authenticated may read the audit history of deals they can see.
    """

    def has_object_permission(self, request, view, obj: Deal):
        user = request.user

        # Read access — anyone authenticated may view any deal.
        if request.method in SAFE_METHODS:
            return True

        # Write access — any BD may edit a deal that's in a BD-editable state.
        if user.is_business_developer:
            return obj.is_editable_by_bd
        # Assessment writes are gated by the specific view's action permission,
        # not here; this class governs deal-content edits, which only the BD does.
        return False
