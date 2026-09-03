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
    filterset_fields = ['approval_status']

    # approve a user
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        user = self.get_object()
        user.approval_status = User.Status.APPROVED
        user.save(update_fields=['approval_status'])
        return Response(UserAdminSerializer(user).data)

    # reject
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        user = self.get_object()
        user.approval_status = User.Status.REJECTED
        user.save(update_fields=['approval_status'])
        return Response(UserAdminSerializer(user).data)
