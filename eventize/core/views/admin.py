# core/views/admin.py
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.models import User
from core.permissions import IsAdmin
from core.serializers import UserAdminSerializer


class UserAdminViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserAdminSerializer
    permission_classes = [IsAdmin]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'role']

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        user = self.get_object()
        user.status = User.Status.APPROVED
        user.save()
        return Response(UserAdminSerializer(user).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        user = self.get_object()
        user.status = User.Status.REJECTED
        user.save()
        return Response(UserAdminSerializer(user).data)
