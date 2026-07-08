from rest_framework.routers import DefaultRouter

from .views import ProjectViewSet, MilestoneViewSet, RiskViewSet, HandoverItemViewSet

router = DefaultRouter()
router.register(r"projects", ProjectViewSet, basename="project")
router.register(r"milestones", MilestoneViewSet, basename="milestone")
router.register(r"risks", RiskViewSet, basename="risk")
router.register(r"handover-items", HandoverItemViewSet, basename="handover-item")

urlpatterns = router.urls
