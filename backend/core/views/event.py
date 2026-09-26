# core/views/event.py
from django.db import transaction
from django.db.models import F, Q, Sum, Case, When, IntegerField, Value
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import status, viewsets, serializers
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from core.filters import EventFilter
from core.models import Event, EventPhoto, EventView, Conversation, Booking
from core.permissions import IsApprovedUser, IsEventOwnerOrReadOnly, IsOrganizer
from core.serializers import EventDetailSerializer, EventListSerializer, EventWriteSerializer, EventPhotoSerializer
from core.services.booking import cancel_event_bookings
from core.services.conv_mess import send_message
from core.services.event import (
    create_event,
    update_event,
    mark_completed_events,
    DomainError,
)
from core.services.recommendations import rank_event_ids
from datetime import timedelta

# to count event view 
VIEW_COOLDOWN = timedelta(seconds=30)



class EventViewSet(viewsets.ModelViewSet):
    filterset_class = EventFilter
    search_fields = ['title', 'description']
    ordering_fields = ['start_datetime', 'capacity', 'created_at']

    def get_queryset(self):

        # update the completed events' status
        mark_completed_events()

        user = self.request.user
        qs = Event.objects.select_related('organizer').prefetch_related(
            'categories', 'ticket_types', 'photos'
        ).order_by('start_datetime', 'pk')
        if not user.is_authenticated:
            return qs.filter(status=Event.EventStatus.PUBLISHED)
        if user.is_admin:
            return qs

        visible = Q(status=Event.EventStatus.PUBLISHED) | Q(organizer=user)
        # an attendee can open a canceled event only through my bookings which are cancelled
        if self.action != 'list':
            visible |= Q(pk__in=Booking.objects.filter(attendee=user).values('event_id'))
        return qs.filter(visible)

    def get_serializer_class(self):
        if self.action in ('list','recommendations'):
            return EventListSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return EventWriteSerializer
        return EventDetailSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [AllowAny()]
        if self.action == 'create':
            return [IsOrganizer()]
        if self.action == 'recommendations':
            return [IsApprovedUser()]
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
        # don't increase view count when the organizer clicks his event (noise)
        if request.user.is_authenticated and instance.organizer_id != request.user.id:
            view,created = EventView.objects.get_or_create(user=request.user, event=instance)
            if not created:
                # view cooldown so somone spamming f5 on purpose cannot increase the view count
                EventView.objects.filter(
                    pk=view.pk, last_viewed_at__lte=timezone.now() - VIEW_COOLDOWN
                ).update(view_count=F('view_count') + 1, last_viewed_at=timezone.now())

        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    # race condition if someone tries to make a booking and the event is deleted
    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        event = Event.objects.select_for_update().get(pk=instance.pk)
        if event.status != Event.EventStatus.DRAFT and event.bookings.exclude(status=Booking.BookingStatus.PENDING).exists():
            return Response(
                {'detail': 'Cannot delete a published event with existing bookings. Use cancel instead.'}, status=status.HTTP_400_BAD_REQUEST,
            )

        # before deleting the event, delete the pending bookings
        event.bookings.filter(status=Booking.BookingStatus.PENDING).delete()
        self.perform_destroy(event)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], permission_classes=[IsApprovedUser, IsEventOwnerOrReadOnly])
    def publish(self, request, pk=None):
        with transaction.atomic():
        
            event = Event.objects.select_for_update().get(pk=self.get_object().pk)
            # check for the state of event
            if event.status != Event.EventStatus.DRAFT:
                return Response({'detail': 'Only draft events can be published'}, status = 400)
            
            # publishing an event that has already started -> no point
            if event.start_datetime <= timezone.now():
                return Response({'detail': 'This event has already started, it cannot be published.'}, status = 400)

            # check for valid number of tickets and existing ticket types
            total_quantity = event.ticket_types.aggregate(total=Sum('quantity'))['total'] or 0
            
            if total_quantity == 0:
                return Response({'detail': 'Add at least one ticket type before publishing.'}, status = 400)
            if total_quantity > event.capacity:
                return Response({'detail': 'Ticket type quantities exceed event capacity.'}, status = 400)
            
            event.status = Event.EventStatus.PUBLISHED
            event.save(update_fields=['status'])
        return Response(EventDetailSerializer(event, context={'request': request}).data)

    # on cancellation of event we cancel bookings and we keep everything no delete so we can trace the attendees
    @action(detail=True, methods=['post'], permission_classes=[IsApprovedUser, IsEventOwnerOrReadOnly])
    def cancel(self, request, pk=None):
        with transaction.atomic():
            event = Event.objects.select_for_update().get(pk=self.get_object().pk)
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
                send_message(
                    conversation_id=conversation.pk,
                    sender=event.organizer,
                    body=f'The event "{event.title}" scheduled for {timezone.localtime(event.start_datetime):%d-%m-%Y, %H:%M} has been cancelled. We will contact you afterwards for more info.',
                )

        return Response(EventDetailSerializer(event, context={'request': request}).data)

    # add photos on publishing an event
    @action(detail=True, methods=['post'], url_path='photos', permission_classes=[IsApprovedUser, IsEventOwnerOrReadOnly])
    def add_photo(self, request, pk=None):
        event = self.get_object()

        # an event which has started is frozen, no changes applied
        if event.start_datetime <= timezone.now():
            return Response({'detail': 'This event has already started, its photos cannot be changed.'}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = EventPhotoSerializer(data=request.data, context={'event': event, 'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    # fucntion to delete photos on update
    @action(detail=True, methods=['delete'], url_path=r'photos/(?P<photo_id>\d+)',permission_classes=[IsApprovedUser, IsEventOwnerOrReadOnly])
    def delete_photo(self, request, pk=None, photo_id=None):
        event = self.get_object()

        # an event which has started is frozen, no changes applied
        if event.start_datetime <= timezone.now():
            return Response({'detail': 'This event has already started, its photos cannot be changed.'}, status=status.HTTP_400_BAD_REQUEST)

        photo = get_object_or_404(EventPhoto, pk=photo_id, event=event)
        photo.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'])
    def recommendations(self, request): 
        # get the events except the ones who already have a ticket for
        candidates = self.filter_queryset(self.get_queryset()).filter(
            status=Event.EventStatus.PUBLISHED,
            end_datetime__gt=timezone.now(),


        ).exclude(organizer=request.user).exclude(
            pk__in=Booking.objects.filter(
                attendee=request.user,
                status=Booking.BookingStatus.CONFIRMED,
            ).values('event_id')
        )

        # get top events
        ordered_ids = rank_event_ids(request.user.id,list(candidates.values_list('pk', flat=True)))

        queryset = candidates
        if ordered_ids:
            # push the ranking back into SQL as an ordering column otherwise the pagination would be a differently ordered list
            ranking = Case(
                *[When(pk=pk, then=Value(position))
                  for position, pk in enumerate(ordered_ids)],
                output_field=IntegerField(),
            )
            queryset = candidates.annotate(recommendation_rank=ranking) \
                                 .order_by('recommendation_rank')

        page = self.paginate_queryset(queryset)
        return self.get_paginated_response(self.get_serializer(page, many=True).data)