# core/views/message.py
from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.models import Message
from core.permissions import IsMessageParticipant
from core.serializers import MessageSerializer
from core.services.conv_mess import delete_message_for_sender, delete_message_for_receiver


class MessageViewSet(viewsets.ModelViewSet):
    http_method_names = ['get', 'post', 'head', 'options','delete']
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated, IsMessageParticipant]
    filterset_fields = ['conversation']

    def get_queryset(self):
        user = self.request.user
        return Message.objects.filter(
            Q(sender=user, deleted_by_sender=False) | Q(receiver=user, deleted_by_receiver=False)
        ).order_by('created_at')

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.receiver_id == request.user.id:
            instance.mark_as_read()
        return Response(self.get_serializer(instance).data)

    # delete message
    def destroy(self, request, *args, **kwargs):

        message = self.get_object()
        try:
            if request.user.id == message.sender_id:
                delete_message_for_sender(message_id=message.pk, user=request.user)
            elif request.user.id == message.receiver_id:
                delete_message_for_receiver(message_id=message.pk, user=request.user)
            else:
                raise PermissionDenied('You are not a participant in this conversation.')
        except PermissionError as e:
            raise PermissionDenied(str(e))
        return Response(status=status.HTTP_204_NO_CONTENT)

    # received emails 
    @action(detail=False, methods=['get'])
    def inbox(self, request):
        qs = Message.objects.filter(receiver=request.user, deleted_by_receiver=False)
        if request.query_params.get('unread') == 'true':
            qs = qs.filter(is_read=False)
        page = self.paginate_queryset(qs)
        serializer = self.get_serializer(page or qs, many=True)
        return self.get_paginated_response(serializer.data) if page is not None else Response(serializer.data)

    # sent messages
    @action(detail=False, methods=['get'])
    def sent(self, request):
        qs = Message.objects.filter(sender=request.user, deleted_by_sender=False)
        page = self.paginate_queryset(qs)
        serializer = self.get_serializer(page or qs, many=True)
        return self.get_paginated_response(serializer.data) if page is not None else Response(serializer.data)

    # there is an unread message so inform the user
    @action(detail=False, methods=['get'])
    def unread_summary(self, request):
        has_unread = Message.objects.filter(
            receiver=request.user, is_read=False, deleted_by_receiver=False
        ).exists()
        return Response({'has_unread': has_unread})

