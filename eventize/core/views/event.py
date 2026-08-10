# core/views/event.py
from django.db.models import Q, Sum
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from core.filters import EventFilter
from core.models import Event, EventView, Message
from core.permissions import IsEventOwnerOrReadOnly, IsOrganizer
from core.serializers import EventDetailSerializer, EventListSerializer, EventWriteSerializer


class EventViewSet(viewsets.ModelViewSet):
    filterset_class = EventFilter
    search_fields = ['title', 'description']
    ordering_fields = ['start_datetime', 'capacity', 'created_at']

    def get_queryset(self):
        user = self.request.user
        qs = Event.objects.all().order_by('start_datetime', 'pk')
        if not user.is_authenticated:
            return qs.filter(status=Event.EventStatus.PUBLISHED)
        if user.is_admin():
            return qs
        if user.is_organizer():
            return qs.filter(Q(status=Event.EventStatus.PUBLISHED) | Q(organizer=user))
        return qs.filter(status=Event.EventStatus.PUBLISHED)

    def get_serializer_class(self):
        if self.action == 'list':
            return EventListSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return EventWriteSerializer
        return EventDetailSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [AllowAny()]
        if self.action == 'create':
            return [IsAuthenticated(), IsOrganizer()]
        return [IsAuthenticated(), IsEventOwnerOrReadOnly()]

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if request.user.is_authenticated:
            EventView.objects.get_or_create(user=request.user, event=instance)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status != Event.EventStatus.DRAFT and instance.bookings.exists():
            return Response(
                {'detail': 'Cannot delete a published event with existing bookings. Use cancel instead.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsEventOwnerOrReadOnly])
    def publish(self, request, pk=None):
        event = self.get_object()
        total_quantity = event.ticket_types.aggregate(total=Sum('quantity'))['total'] or 0
        if total_quantity == 0:
            return Response({'detail': 'Add at least one ticket type before publishing.'}, status=400)
        if total_quantity > event.capacity:
            return Response({'detail': 'Ticket type quantities exceed event capacity.'}, status=400)
        event.status = Event.EventStatus.PUBLISHED
        event.save()
        return Response(EventDetailSerializer(event).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsEventOwnerOrReadOnly])
    def cancel(self, request, pk=None):
        event = self.get_object()
        event.status = Event.EventStatus.CANCELLED
        event.save()

        attendee_ids = event.bookings.values_list('attendee', flat=True).distinct()
        Message.objects.bulk_create([
            Message(
                sender=event.organizer,
                recipient_id=attendee_id,
                event=event,
                subject=f'Event Cancelled: {event.title}',
                body=f'The event "{event.title}" scheduled for {event.start_datetime} has been cancelled.',
            )
            for attendee_id in attendee_ids
        ])
        return Response(EventDetailSerializer(event).data)
