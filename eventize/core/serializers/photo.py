# core/serializers/photo.py

from rest_framework import serializers
from core.models import EventPhoto


class EventPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventPhoto
        fields = ['id', 'event', 'image', 'caption', 'order']
        read_only_fields = ['event']

    def create(self, validated_data):
        event = self.context.get('event')
        if not event:
            raise serializers.ValidationError({'detail': 'Event must be known.'})
        validated_data['event'] = event
        return super().create(validated_data)