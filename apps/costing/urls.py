from rest_framework.routers import DefaultRouter

from .views import CostModelViewSet, CostLineViewSet

router = DefaultRouter()
router.register(r"cost-models", CostModelViewSet, basename="cost-model")
router.register(r"cost-lines", CostLineViewSet, basename="cost-line")

urlpatterns = router.urls
