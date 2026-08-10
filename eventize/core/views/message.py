# core/views/message.py
from django.db.models import Q
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.models import Message
from core.permissions import IsMessageParticipant
from core.serializers import MessageSerializer


class MessageViewSet(viewsets.ModelViewSet):
    http_method_names = ['get', 'post', 'head', 'options']
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated, IsMessageParticipant]

    def get_queryset(self):
        user = self.request.user
        return Message.objects.filter(
            Q(sender=user, deleted_by_sender=False) | Q(recipient=user, deleted_by_recipient=False)
        )

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.recipient_id == request.user.id:
            instance.mark_as_read()
        return Response(self.get_serializer(instance).data)

    @action(detail=False, methods=['get'])
    def inbox(self, request):
        qs = Message.objects.filter(recipient=request.user, deleted_by_recipient=False)
        if request.query_params.get('unread') == 'true':
            qs = qs.filter(is_read=False)
        page = self.paginate_queryset(qs)
        serializer = self.get_serializer(page or qs, many=True)
        return self.get_paginated_response(serializer.data) if page is not None else Response(serializer.data)

    @action(detail=False, methods=['get'])
    def sent(self, request):
        qs = Message.objects.filter(sender=request.user, deleted_by_sender=False)
        page = self.paginate_queryset(qs)
        serializer = self.get_serializer(page or qs, many=True)
        return self.get_paginated_response(serializer.data) if page is not None else Response(serializer.data)

    @action(detail=True, methods=['post'])
    def delete_for_me(self, request, pk=None):
        message = self.get_object()
        user = request.user
        if message.sender_id == user.id:
            message.delete_for_sender()
        elif message.recipient_id == user.id:
            message.delete_for_recipient()
        else:
            raise PermissionDenied('You are not a participant in this message.')
        return Response(status=204)
