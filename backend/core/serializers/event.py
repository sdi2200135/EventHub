# core/serializers/event.py

from django.utils import timezone
from rest_framework import serializers

from core.models import Category, Event

from .category import CategorySerializer
from .photo import EventPhotoSerializer
from .ticket_type import TicketTypeSerializer
from .user import UserPublicSerializer

from decimal import ROUND_HALF_UP, Decimal

# serializer in order to list many events in grid 
class EventListSerializer(serializers.ModelSerializer):
    
    available_capacity = serializers.IntegerField(read_only=True)
    min_price = serializers.SerializerMethodField()
    categories = serializers.SlugRelatedField(many=True, slug_field='name', read_only=True)
    cover_photo = serializers.SerializerMethodField()
    class Meta:
        model = Event
        fields = [
            'id', 'event_id', 'title', 'event_type', 'venue', 'city', 'country',
            'start_datetime', 'end_datetime', 'capacity', 'status',
            'available_capacity', 'min_price', 'categories', 'cover_photo'
        ]

    def get_min_price(self, obj):
        prices = [tt.price for tt in obj.ticket_types.all()]
        return min(prices) if prices else None
    
    # the 1st photo in order becomes cover photo of the event
    def get_cover_photo(self, obj):
        photos = list(obj.photos.all())
        if not photos:
            return None
        request = self.context.get('request')
        url = photos[0].image.url
        return request.build_absolute_uri(url) if request else url
    
# serializer for full details about the event basically when u have the event alone
class EventDetailSerializer(serializers.ModelSerializer):
    organizer = UserPublicSerializer(read_only=True)
    ticket_types = TicketTypeSerializer(many=True, read_only=True)
    photos = EventPhotoSerializer(many=True, read_only=True)
    categories = CategorySerializer(many=True, read_only=True)
    available_capacity = serializers.IntegerField(read_only=True)
    total_booked = serializers.IntegerField(source='total_reserved', read_only=True)

    class Meta:
        model = Event
        fields = [
            'id', 'event_id', 'organizer', 'title', 'description', 'event_type',
            'venue', 'address', 'city', 'country', 'latitude', 'longitude',
            'start_datetime', 'end_datetime', 'capacity', 'status',
            'categories', 'ticket_types', 'photos',
            'available_capacity', 'total_booked', 'created_at', 'updated_at',
        ]

# serializer for creating and updating an event — defines what a client is allowed to send
class EventWriteSerializer(serializers.ModelSerializer):
    categories = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Category.objects.all(), required=True, allow_empty=False
    )
    latitude = serializers.DecimalField(max_digits=None, decimal_places=None, required=False, allow_null=True)
    longitude = serializers.DecimalField(max_digits=None, decimal_places=None, required=False, allow_null=True)
    class Meta:
        model = Event
        fields = [
            'id', 'event_id', 'title', 'description', 'event_type',
            'venue', 'address', 'city', 'country', 'latitude', 'longitude',
            'start_datetime', 'end_datetime', 'capacity', 'status', 'categories',
        ]
        read_only_fields = ['id', 'event_id', 'status']

    def validate(self, attrs):

        # check the longitude latitude is given as a pair 
        lat = attrs.get('latitude', getattr(self.instance, 'latitude', None))
        lon = attrs.get('longitude', getattr(self.instance, 'longitude', None))
        if (lat is None) != (lon is None):
            raise serializers.ValidationError(
                {'longitude': 'Latitude and longitude must be provided together.'}
            )
        # check lat long range and round to 5 decimal
        if lat is not None:
            if not -90 <= lat <= 90:
                raise serializers.ValidationError({'latitude': 'Latitude must be between -90 and 90.'})
            if not -180 <= lon <= 180:
                raise serializers.ValidationError({'longitude': 'Longitude must be between -180 and 180.'})
            for field in ('latitude', 'longitude'):
                if attrs.get(field) is not None:
                    attrs[field] = attrs[field].quantize(Decimal('0.00001'), rounding=ROUND_HALF_UP)

        # make sure start/end time is correct
        start = attrs.get('start_datetime', getattr(self.instance, 'start_datetime', None))
        end = attrs.get('end_datetime', getattr(self.instance, 'end_datetime', None))
        if start and end and end <= start:
            raise serializers.ValidationError({'end_datetime': 'Must be after start_datetime.'})

        # check start date time to not be in the past
        if 'start_datetime' in attrs and start < timezone.now():
            raise serializers.ValidationError({'start_datetime': 'It cannot be in the past.'})
            
        return attrs
