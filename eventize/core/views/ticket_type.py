# core/views/ticket_type.py
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from core.models import TicketType, Event
from core.permissions import IsTicketTypeEventOwnerOrReadOnly
from core.serializers import TicketTypeSerializer
from core.services.ticket_type import (
    delete_ticket_type,
    CapacityExceededError,
    ReservedTicketsError,
    EventNotEditableError
)

class TicketTypeViewSet(viewsets.ModelViewSet):
    queryset = TicketType.objects.all() #includes all ticket types
    serializer_class = TicketTypeSerializer #the serializer that we use
    #filtering per-event 
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['event']

    def get_permissions(self):
        #if the action is list or retrieve everyone can see ticket types
        if self.action in ('list', 'retrieve'): 
            return [AllowAny()]
        #if the action is create, update or delete only authenticated users and admins
        return [IsAuthenticated(), IsTicketTypeEventOwnerOrReadOnly()] 

    def get_serializer_context(self):   #adds the event and the request to the serializer's context
        context = super().get_serializer_context()  #get base context
        if 'event_id' in self.kwargs: #checks if the URL has event_id to put it in the context
            try:
                context['event'] = Event.objects.get(pk=self.kwargs['event_id'])
            except Event.DoesNotExist:
                pass

        #checks if the user sends an event to the request body, to find it and put it in the context
        if not context.get('event') and self.request.method in ('POST', 'PUT', 'PATCH'):
            event_id = self.request.data.get('event')
            if event_id:
                try:
                    context['event'] = Event.objects.get(pk=event_id)
                except Event.DoesNotExist:
                    pass
        #add request to get the authenticated user
        context['request'] = self.request
        return context

    def get_queryset(self): #Filters ticket types
        queryset = super().get_queryset()

        if 'event_id' in self.kwargs:   #checks if there is an event_id in the URL, to filter only for this event
            queryset = queryset.filter(event_id = self.kwards['event_id'])

        if not self.request.user.is_authenticated:  #checks if the user isn't authenticated, to let him see only published events
            queryset = queryset.filter(event__status=Event.EventStatus.PUBLISHED)

        return queryset

    def perform_create(self, serializer):   #creates a new ticket type
        serializer.save()

    def destroy(self, request, *args, **kwargs):    #deletes a ticket type
        ticket_type = self.get_object()
        try:
            delete_ticket_type(
                ticket_type_id=ticket_type.id,
                user=request.user
            )
        except ReservedTicketsError as e: #400 Bad Request - the user did something wrong
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except EventNotEditableError as e: #400 Bad Request - the event isn't in a draft situation
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except PermissionError as e: #403 Forbidden - the user doesn't have permission
            return Response(
                {'detail': str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        #204 No Content - successful deletion with no content
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['post'], url_path='bulk')
    def bulk_create(self, request): #bulk creation of ticket types for an event
        event_id = request.data.get('event_id')
        ticket_types_data = request.data.get('ticket_types', [])

        if not event_id: #validate event_id
            return Response(
                {'detail':'event_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            event = Event.objects.get(pk=event_id)
        except Event.DoesNotExist:
            return Response(
                {'detail':'Event not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        if event.organizer_id != request.user.id and not request.user.is_admin(): #check permissions
            return Response(
                {'detail':'Only the event organizer or an admin can add ticket types'},
                status=status.HTTP_403_FORBIDDEN
            )

        #process each ticket type
        results = []
        errors = []

        for ticket_data in ticket_types_data:
            try:
                from core.services.ticket_type import create_ticket_type

                ticket_type = create_ticket_type(
                    event_id = event.id,
                    user=request.user,
                    name=ticket_data.get('name'),
                    price=ticket_data.get('price'),
                    quantity=ticket_data.get('quantity')
                )
                results.append(TicketTypeSerializer(ticket_type).data)
            except Exception as e:
                errors.append({
                    'data':ticket_data,
                    'error':str(e)
                })

        return Response({   #return response
            'created':results,
            'errors':errors,
            'total':len(results),
            'failed':len(errors)
        }, status=status.HTTP_201_CREATED if results else status.HTTP_400_BAD_REQUEST)