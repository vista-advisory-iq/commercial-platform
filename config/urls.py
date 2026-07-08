from pathlib import Path

from django.conf import settings
from django.contrib import admin
from django.http import HttpResponse, Http404
from django.urls import path, include, re_path
from django.views.generic import View
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path("admin/", admin.site.urls),
    # JWT auth endpoints
    path("api/auth/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    # App APIs
    path("api/", include("apps.accounts.urls")),
    path("api/", include("apps.deals.urls")),
    path("api/", include("apps.notifications.urls")),
    path("api/", include("apps.proposals.urls")),
    path("api/", include("apps.projects.urls")),
    path("api/", include("apps.costing.urls")),
    path("api/", include("apps.agents.urls")),
]


class SPAView(View):
    """
    Serve the built React app's index.html for any non-API/admin route, so the
    SPA's client-side router handles deep links. Only active in production once
    the frontend has been built (frontend/dist exists); a no-op locally where the
    Vite dev server serves the SPA instead.
    """

    def get(self, request, *args, **kwargs):
        index = Path(settings.BASE_DIR) / "frontend" / "dist" / "index.html"
        if not index.exists():
            raise Http404("Frontend build not found (run `npm run build`).")
        return HttpResponse(index.read_text(encoding="utf-8"))


# Catch-all SPA fallback — must be last, and must not shadow /api or /admin.
urlpatterns += [
    re_path(r"^(?!api/|admin|static/).*$", SPAView.as_view()),
]
