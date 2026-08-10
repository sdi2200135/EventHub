# core/serializers/media.py
from rest_framework import serializers

from core.models import Media


class MediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Media
        fields = ['id', 'event', 'photo']
