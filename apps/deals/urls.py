from rest_framework.routers import DefaultRouter
from .views import DealViewSet, EditAccessRequestViewSet

router = DefaultRouter()
router.register("deals", DealViewSet, basename="deal")
router.register("edit-access-requests", EditAccessRequestViewSet, basename="edit-access-request")

urlpatterns = router.urls
