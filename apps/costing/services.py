"""Cost-model creation/edit guards. Assessors only; one model per deal."""
from django.core.exceptions import PermissionDenied, ValidationError

from apps.deals.models import DealState
from .models import CostModel


class CostModelError(ValidationError):
    pass


def create_cost_model(deal, actor):
    if not actor.can_assess_deals:
        raise PermissionDenied("Only an Analyst or Manager may build the cost model.")
    if deal.state == DealState.DRAFT:
        raise CostModelError("A cost model can be built once the deal is in the pipeline.")
    if CostModel.objects.filter(deal=deal).exists():
        raise CostModelError("This deal already has a cost model.")
    return CostModel.objects.create(deal=deal, created_by=actor)


def update_assumptions(cost_model, actor, validated_data):
    if not actor.can_assess_deals:
        raise PermissionDenied("Only an Analyst or Manager may edit the cost model.")
    for field, value in validated_data.items():
        setattr(cost_model, field, value)
    cost_model.save()
    return cost_model
