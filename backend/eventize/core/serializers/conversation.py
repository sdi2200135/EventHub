# core/serializers/conversation.py
from rest_framework import serializers

from core.models import Conversation, Event, User

class ConversationSerializer(serializers.ModelSerializer):
    
    organizer = serializers.PrimaryKeyRelatedField(read_only=True)
    attendee = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(),required=False)
    event = serializers.PrimaryKeyRelatedField(queryset=Event.objects.all(), required=True)
    has_unread = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id', 'organizer', 'attendee', 'event', 'created_at', 'has_unread',
        ]
        # remove constraint from model for uniqueness, as it creates a problem in attendee
        # as it makes 'attendee' to be sent and cannot be derived from request.ueser
        validators = []

    # mark the conversation as one with unread messages
    def get_has_unread(self, obj):
        # when the view fetches the conversations from db it asks in if the convo contains an unread message
        # so the serializer reads that value off the objec instead of making another query
        # performance better
        annotated = getattr(obj, 'has_unread_flag', None)
        if annotated is not None:
            return annotated
        request = self.context.get('request')
        if not request:
            return False
        return obj.messages.filter(receiver=request.user, is_read=False, deleted_by_receiver=False).exists()

    def validate(self, attrs):
        request = self.context['request']
        event = attrs.get('event')

        # check that only organizers or people with bookings can start a convo

        # if the user has a booking
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

    # overide create func
    def create(self, validated_data):
        event = validated_data['event']
        # if a conv between these people already exists don't create a second one use the existing one
        conversation, created = Conversation.objects.get_or_create(
            event=event,
            attendee_id=validated_data['attendee_id'],
            defaults={'organizer': event.organizer},
        )
        
        # if someone has deleted the conv just use the existing one by just deleting the previous messages ( soft delete exists)
        if not created:
            user_id = self.context['request'].user.id
            if user_id == conversation.organizer_id and conversation.deleted_by_organizer:
                conversation.deleted_by_organizer = False
                conversation.save(update_fields=['deleted_by_organizer'])
            elif user_id == conversation.attendee_id and conversation.deleted_by_attendee:
                conversation.deleted_by_attendee = False
                conversation.save(update_fields=['deleted_by_attendee'])
        return conversation