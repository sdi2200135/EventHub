# core/views/event.py
from django.db import transaction
from django.db.models import F, Q, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import status, viewsets, serializers
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from core.filters import EventFilter
from core.models import Event, EventPhoto, EventView, Message, Conversation
from core.permissions import IsApprovedUser, IsEventOwnerOrReadOnly, IsOrganizer
from core.serializers import EventDetailSerializer, EventListSerializer, EventWriteSerializer, EventPhotoSerializer
from core.services.booking import cancel_event_bookings
from core.services.event import (
    create_event,
    update_event,
    DomainError,
)


class EventViewSet(viewsets.ModelViewSet):
    filterset_class = EventFilter
    search_fields = ['title', 'description']
    ordering_fields = ['start_datetime', 'capacity', 'created_at']

    def get_queryset(self):
        user = self.request.user
        qs = Event.objects.select_related('organizer').prefetch_related(
            'categories', 'ticket_types'
        ).order_by('start_datetime', 'pk')
        if not user.is_authenticated:
            return qs.filter(status=Event.EventStatus.PUBLISHED)
        if user.is_admin:
            return qs
        if user.is_organizer:
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
            return [IsOrganizer()]
        return [IsApprovedUser(), IsEventOwnerOrReadOnly()]

    def perform_create(self, serializer):
        data = dict(serializer.validated_data)
        categories = data.pop('categories', None)
        try:
            event = create_event(organizer=self.request.user, categories=categories, **data)
        except DomainError as e:
            raise serializers.ValidationError({'detail': str(e)})
        serializer.instance = event

    def perform_update(self, serializer):
        data = dict(serializer.validated_data)
        categories = data.pop('categories', None)
        try:
            event = update_event(event=serializer.instance, categories=categories, **data)
        except DomainError as e:
            raise serializers.ValidationError({'detail': str(e)})
        serializer.instance = event

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if request.user.is_authenticated:
            view,created = EventView.objects.get_or_create(user=request.user, event=instance)
            if( not created ):
                EventView.objects.filter(pk=view.pk).update(view_count=F('view_count') + 1, last_viewed_at = timezone.now())

        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status != Event.EventStatus.DRAFT and instance.bookings.exists():
            return Response(
                {'detail': 'Cannot delete a published event with existing bookings. Use cancel instead.'}, status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'], permission_classes=[IsApprovedUser, IsEventOwnerOrReadOnly])
    def publish(self, request, pk=None):
        with transaction.atomic():
            event = self.get_object()

            # check for the state of event
            if event.status != Event.EventStatus.DRAFT:
                return Response({'detail': 'Only draft events can be published'}, status = 400)

            # check for valid number of tickets and existing ticket types
            total_quantity = event.ticket_types.aggregate(total=Sum('quantity'))['total'] or 0
            
            if total_quantity == 0:
                return Response({'detail': 'Add at least one ticket type before publishing.'}, status = 400)
            if total_quantity > event.capacity:
                return Response({'detail': 'Ticket type quantities exceed event capacity.'}, status = 400)
            
            event.status = Event.EventStatus.PUBLISHED
            event.save(update_fields=['status'])
        return Response(EventDetailSerializer(event).data)

    # on cancellation of event we cancel bookings and we keep everything no delete so we can trace the attendees
    @action(detail=True, methods=['post'], permission_classes=[IsApprovedUser, IsEventOwnerOrReadOnly])
    def cancel(self, request, pk=None):
        event = self.get_object()
        if event.status != Event.EventStatus.PUBLISHED:
            return Response(
                {'detail': f"Only a published event can be cancelled"}, status=status.HTTP_400_BAD_REQUEST,
            )
        event.status = Event.EventStatus.CANCELLED
        event.save(update_fields=['status'])

        cancel_event_bookings(event=event)

        #  we want only one message per user even if he has more than one bookings
        attendee_ids = event.bookings.order_by().values_list('attendee', flat=True).distinct()

        # send message to every attendee
        for attendee_id in attendee_ids:
            conversation, _ = Conversation.objects.get_or_create(
                attendee_id=attendee_id, 
                defaults={'organizer': event.organizer},
                event=event,
            )
            Message.objects.create(
                sender=event.organizer,
                receiver_id=attendee_id,
                conversation=conversation,
                body=f'The event "{event.title}" scheduled for {event.start_datetime} has been cancelled.',
            )

        return Response(EventDetailSerializer(event).data)

    # add photos on publishing an event
    @action(detail=True, methods=['post'], url_path='photos', permission_classes=[IsApprovedUser, IsEventOwnerOrReadOnly])
    def add_photo(self, request, pk=None):
        event = self.get_object()
        serializer = EventPhotoSerializer(data=request.data, context={'event': event, 'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    # fucntion to delete photos on update
    @action(detail=True, methods=['delete'], url_path=r'photos/(?P<photo_id>\d+)',permission_classes=[IsApprovedUser, IsEventOwnerOrReadOnly])
    def delete_photo(self, request, pk=None, photo_id=None):
        event = self.get_object()
        photo = get_object_or_404(EventPhoto, pk=photo_id, event=event)
        photo.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
