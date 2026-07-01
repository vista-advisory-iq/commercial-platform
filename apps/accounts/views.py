from rest_framework.views import APIView
from rest_framework.response import Response


class MeView(APIView):
    """Return the authenticated user's identity and role."""

    def get(self, request):
        u = request.user
        return Response({
            "id": str(u.id),
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "role_display": u.get_role_display(),
        })
