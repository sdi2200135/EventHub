# core/serializers/message.py
from rest_framework import serializers

from core.models import Message


class MessageSerializer(serializers.ModelSerializer):
    sender = serializers.PrimaryKeyRelatedField(read_only=True)
    is_read = serializers.BooleanField(read_only=True)

    class Meta:
        model = Message
        fields = [
            'id', 'sender', 'receiver', 'event', 'subject', 'body',
            'is_read', 'created_at',
        ]

    def validate(self, attrs):
        request = self.context['request']
        event = attrs.get('event')
        if event is not None:
            is_organizer = event.organizer_id == request.user.id
            has_booking = event.bookings.filter(attendee=request.user).exists()
            if not (is_organizer or has_booking):
                raise serializers.ValidationError({
                    'event': 'You must be the organizer or have a booking on this event to message about it.'
                })
        return attrs

    def create(self, validated_data):
        validated_data['sender'] = self.context['request'].user
        return super().create(validated_data)
