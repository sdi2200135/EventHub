# core/views/conversation.py
from django.db.models import Exists, OuterRef, Q

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from core.models import Conversation, Message
from core.serializers import ConversationSerializer
from core.permissions import IsApprovedUser
from core.services.conv_mess import (
    delete_conversation_for_organizer,
    delete_conversation_for_attendee,
)


class ConversationViewSet(viewsets.ModelViewSet):
    # a conversation cannot ber edited after creation, only creat/list/delete
    http_method_names = ['get', 'post', 'delete', 'head', 'options']
    serializer_class = ConversationSerializer
    permission_classes = [IsApprovedUser]

    def get_queryset(self):
        user = self.request.user
        # also ask the db if the conversation has an unread message, so the
        # serializer reads it from the object instead of querying again
        # better performance
        unread = Message.objects.filter(
            conversation=OuterRef('pk'), receiver=user,
            is_read=False, deleted_by_receiver=False,
        )
        # return only conversations  the user is part of
        return Conversation.objects.filter(
            Q(organizer=user, deleted_by_organizer=False) | Q(attendee=user, deleted_by_attendee=False)
        ).annotate(has_unread_flag=Exists(unread))

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    # delete conversation
    def destroy(self, request, *args, **kwargs):
        conversation = self.get_object()
        try:
            if request.user.id == conversation.organizer_id:
                delete_conversation_for_organizer(conversation_id=conversation.pk, user=request.user)
            elif request.user.id == conversation.attendee_id:
                delete_conversation_for_attendee(conversation_id=conversation.pk, user=request.user)
            else:
                raise PermissionDenied('You are not a participant in this conversation.')
        except PermissionError as e:
            raise PermissionDenied(str(e))
        return Response(status=status.HTTP_204_NO_CONTENT)

    # mark message as read
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        conversation = self.get_object()
        Message.objects.filter(
            conversation=conversation, receiver=request.user, is_read=False
        ).update(is_read=True)
        return Response(status=status.HTTP_204_NO_CONTENT)
