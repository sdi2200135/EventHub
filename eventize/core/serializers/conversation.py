# core/serializers/conversation.py
from rest_framework import serializers

from core.models import Conversation, Event

class ConversationSerializer(serializers.ModelSerializer):
    organizer = serializers.PrimaryKeyRelatedField(read_only=True)
    attendee = serializers.PrimaryKeyRelatedField(read_only=True)
    event = serializers.PrimaryKeyRelatedField(queryset=Event.objects.all(), required=True)
    has_unread = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id', 'organizer', 'attendee', 'event', 'created_at', 'has_unread',
        ]

    # mark the conversation as one with unread messages
    def get_has_unread(self, obj):
        request = self.context.get('request')
        if not request:
            return False
        return obj.messages.filter(receiver=request.user, is_read=False, deleted_by_receiver=False).exists()

    def validate(self, attrs):
        request = self.context['request']
        event = attrs.get('event')

        # check that only organizers or people with bookings can start a convo

        # if the user has a bookinh
        if event.bookings.filter(attendee=request.user).exists():
            attrs['attendee_id'] = request.user.id

        # if the user is the organizer
        elif event.organizer_id == request.user.id:
            attendee_id = request.data.get('attendee')
            if attendee_id is None:
                raise serializers.ValidationError({'attendee': 'Specify with whom u want to to start a conversation with.'})

            if not event.bookings.filter(attendee=attendee_id).exists():
                raise serializers.ValidationError({'attendee': 'This user does not have a booking on this event.'})
            # get attendee id
            attrs['attendee_id'] = attendee_id
        else:
            raise serializers.ValidationError({'event': 'You must be the organizer or have a booking on this event to start a conversation.'})
        return attrs

    # if the convo exists doeesn't create one pop up the existing one
    def create(self, validated_data):
        event = validated_data['event']
        conversation, _ = Conversation.objects.get_or_create(
            event=event,
            attendee_id=validated_data['attendee_id'],
            defaults={'organizer': event.organizer},
        )
        return conversation