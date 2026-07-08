from rest_framework.routers import DefaultRouter

from .views import SalesAgentViewSet

router = DefaultRouter()
router.register("sales-agents", SalesAgentViewSet, basename="sales-agent")

urlpatterns = router.urls
