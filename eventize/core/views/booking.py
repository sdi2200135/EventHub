# core/views/booking.py
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.models import Booking
from core.permissions import IsBookingOwnerOrEventOrganizer, IsParticipant, IsApprovedUser, IsBookingOwner
from core.serializers import BookingSerializer
from core.services.booking import (
    confirm_booking,
    get_booking_queryset,
    SoldOutError,
    BookingNotPendingError,
    EventNotActiveError
)

class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.all()
    serializer_class = BookingSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['event', 'status']
    permission_classes = [IsApprovedUser, IsBookingOwnerOrEventOrganizer]

    def get_queryset(self):
        return get_booking_queryset(self.request.user)

    def get_permissions(self):
        if self.action == 'create': #only approved users can make a reservation
            return [IsAuthenticated(), IsParticipant()]
        elif self.action == 'confirm': #only attendee can approve
            return [IsBookingOwner()]
        return super().get_permissions()

    def get_serializer_context(self): #it adds the request to the serializer's context
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_create(self, serializer): #creates a new reservation
        serializer.save()

    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        booking = self.get_object()
        try:
            booking = confirm_booking(
                booking_id=booking.id,
                event_id=booking.event_id,
                user=request.user,
                
            )
        except BookingNotPendingError as e:
            return Response({'detail':str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except SoldOutError as e:
            return Response({'detail':str(e)}, status=status.HTTP_409_CONFLICT)
        except PermissionError as e:
            return Response({'detail':str(e)}, status=status.HTTP_403_FORBIDDEN)
        except EventNotActiveError as e:
            return Response({'detail':str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(BookingSerializer(booking).data)

    def update(self, request, *args, **kwargs):
        return Response({'detail':'Bookings cannot be updated once submitted.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    def partial_update(self, request, *args, **kwargs): #partial booking updates are not permitted
        return self.update(request, *args, **kwargs)

    def destroy(self,requests,*args,**kwargs):
        return Response({'detail':'Bookings cannot be withdrawn. They are cancelled only if the organiser cancels the event.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)