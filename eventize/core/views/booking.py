# core/views/booking.py
from django.db import transaction
from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.models import Booking, TicketType
from core.permissions import IsBookingOwnerOrEventOrganizer, IsParticipant
from core.serializers import BookingSerializer


class BookingViewSet(viewsets.ModelViewSet):
    http_method_names = ['get', 'post', 'head', 'options']
    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticated, IsBookingOwnerOrEventOrganizer]

    def get_queryset(self):
        user = self.request.user
        if user.is_admin():
            return Booking.objects.all()
        return Booking.objects.filter(Q(attendee=user) | Q(event__organizer=user))

    def get_permissions(self):
        if self.action == 'create':
            return [IsAuthenticated(), IsParticipant()]
        return super().get_permissions()

    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        booking = self.get_object()
        if booking.attendee_id != request.user.id:
            raise PermissionDenied('Only the attendee can confirm this booking.')
        with transaction.atomic():
            booking.ticket_type = TicketType.objects.select_for_update().get(pk=booking.ticket_type_id)
            if not booking.confirm():
                return Response(
                    {'detail': 'Ticket type is no longer available in the requested quantity.'},
                    status=status.HTTP_409_CONFLICT,
                )
        return Response(BookingSerializer(booking).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        booking = self.get_object()
        user = request.user
        if not (booking.attendee_id == user.id or booking.event.organizer_id == user.id or user.is_admin()):
            raise PermissionDenied('You are not allowed to cancel this booking.')
        with transaction.atomic():
            booking.cancel()
        return Response(BookingSerializer(booking).data)
