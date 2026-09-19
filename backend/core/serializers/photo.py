# core/serializers/photo.py

from rest_framework import serializers
from core.models import EventPhoto

# limit the images' size so a user cannot do anything he wants
MAX_IMAGE_SIZE = 10 * 1024 * 1024 # max size:10 MB

class EventPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventPhoto
        fields = ['id', 'event', 'image', 'caption', 'order']
        read_only_fields = ['event']

    # cehck format and size
    def validate_image(self, image):
        if image.size > MAX_IMAGE_SIZE:
            raise serializers.ValidationError(f'Image is too large, the limit is {MAX_IMAGE_SIZE // (1024 * 1024)}MB.')
        image_format = getattr(getattr(image, 'image', None), 'format', None)
        if image_format not in {'JPEG', 'PNG', 'WEBP'}:
            raise serializers.ValidationError('Only JPEG, PNG and WebP images are allowed.')
        return image

    def validate(self, attrs):
        event = self.context.get('event')
        # check max number of images per event which is 20
        if self.instance is None and event and event.photos.count() >= 20:
            raise serializers.ValidationError({'image': f'The max number of photos per event is:{20}.'})
        return attrs

    def create(self, validated_data):
        event = self.context.get('event')
        if not event:
            raise serializers.ValidationError({'detail': 'Event is not given.'})
        validated_data['event'] = event
        return super().create(validated_data)