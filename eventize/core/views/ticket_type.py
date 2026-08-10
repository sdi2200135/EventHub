# core/views/ticket_type.py
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated

from core.models import TicketType
from core.permissions import IsTicketTypeEventOwnerOrReadOnly
from core.serializers import TicketTypeSerializer


class TicketTypeViewSet(viewsets.ModelViewSet):
    queryset = TicketType.objects.all()
    serializer_class = TicketTypeSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['event']

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [AllowAny()]
        return [IsAuthenticated(), IsTicketTypeEventOwnerOrReadOnly()]

    def perform_create(self, serializer):
        event = serializer.validated_data['event']
        user = self.request.user
        if not (event.organizer_id == user.id or user.is_admin()):
            raise PermissionDenied('Only the event organizer or an admin can add ticket types.')
        serializer.save()
