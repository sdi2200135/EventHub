# core/serializers/photo.py

from rest_framework import serializers
from core.models import EventPhoto


class EventPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventPhoto
        fields = ['id', 'image', 'caption', 'order']
