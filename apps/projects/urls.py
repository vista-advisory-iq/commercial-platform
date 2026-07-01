from rest_framework.routers import DefaultRouter

from .views import ProjectViewSet, MilestoneViewSet, RiskViewSet

router = DefaultRouter()
router.register(r"projects", ProjectViewSet, basename="project")
router.register(r"milestones", MilestoneViewSet, basename="milestone")
router.register(r"risks", RiskViewSet, basename="risk")

urlpatterns = router.urls
