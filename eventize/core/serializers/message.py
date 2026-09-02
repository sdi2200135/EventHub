# core/serializers/message.py
from rest_framework import serializers

from core.models import Message, Conversation


class MessageSerializer(serializers.ModelSerializer):
    sender = serializers.PrimaryKeyRelatedField(read_only=True)
    receiver= serializers.PrimaryKeyRelatedField(read_only=True)
    is_read = serializers.BooleanField(read_only=True)

    class Meta:
        model = Message
        fields = [
            'id', 'sender', 'receiver', 'body', 'conversation',
            'is_read', 'created_at',
        ]

    def validate(self, attrs):
        request = self.context['request']
        conv = attrs.get('conversation')
        if conv is not None and (request.user.id not in (conv.organizer_id, conv.attendee_id)):
                raise serializers.ValidationError({ 'conversation':'You are not a part of this converation'})
        return attrs

    def create(self, validated_data):
        conversation = validated_data['conversation']
        sender = self.context['request'].user
        receiver_id = conversation.attendee_id if sender.id == conversation.organizer_id else conversation.organizer_id
        validated_data['sender'] = sender
        validated_data['receiver_id'] = receiver_id
        return super().create(validated_data)
