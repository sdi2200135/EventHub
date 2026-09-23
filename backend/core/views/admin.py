# core/views/admin.py
from django.http import HttpResponse
from django_filters.rest_framework import DjangoFilterBackend
from django.utils.http import content_disposition_header

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError, NotFound

from core.models import User, Event
from core.permissions import IsAdmin
from core.serializers import UserAdminSerializer
from core.services.event import mark_completed_events
from core.services.export import build_events_data, events_to_json, events_to_xml, get_exportable_events


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


# the admin can downolad events as xml or json (DTD)
# the url decides the format, because DRF keeps ?format= for itself
class EventExportView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request, file_format):
        
        # update the completed events' status
        mark_completed_events()

        organizer = request.query_params.get('organizer')
        # check if organizer_id is valid and the organizer exists
        if organizer is not None:
            try:
                organizer = int(organizer)
            except ValueError:
                raise ValidationError({'organizer': 'Must be an integer user ID.'})
            
            user = User.objects.filter(pk=organizer).first()

            if user is None:
                raise NotFound('User with this id doesn\'t exist')

        event_id = request.query_params.get('event')
        if event_id is not None:
            try:
                event_id = int(event_id)
            except ValueError:
                raise ValidationError({'event': 'Must be an integer event ID.'})
            event = Event.objects.filter(pk=event_id).first()
            if event is None:
                raise NotFound('Event with this id doesn\'t exist')
            
        # organizer or custom event
        data = build_events_data(get_exportable_events(organizer, event_id))

        if file_format == 'xml':
            content, content_type = events_to_xml(data), 'application/xml'
        else:
            content, content_type = events_to_json(data), 'application/json'

        response = HttpResponse(content, content_type=f'{content_type}; charset=utf-8')

        if event_id is not None:
            filename = f'event_{event.event_id}.{file_format}'
        else:
            filename = f'events.{file_format}' if organizer is None else f'events_{user.username}.{file_format}'
        # content disposition header so it can work with greek usernames as well
        response['Content-Disposition'] = content_disposition_header(True, filename)
        return response
