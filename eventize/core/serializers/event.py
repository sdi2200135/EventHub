# core/serializers/event.py
from rest_framework import serializers

from core.models import Category, Event
from core.utils import generate_id

from .category import CategorySerializer
from .media import MediaSerializer
from .ticket_type import TicketTypeSerializer
from .user import UserPublicSerializer


class EventListSerializer(serializers.ModelSerializer):
    available_capacity = serializers.IntegerField(source='get_available_capacity', read_only=True)
    min_price = serializers.SerializerMethodField()
    categories = serializers.SlugRelatedField(many=True, slug_field='name', read_only=True)

    class Meta:
        model = Event
        fields = [
            'id', 'event_id', 'title', 'event_type', 'venue', 'city', 'country',
            'start_datetime', 'end_datetime', 'capacity', 'status',
            'available_capacity', 'min_price', 'categories',
        ]

    def get_min_price(self, obj):
        prices = [tt.price for tt in obj.ticket_types.all()]
        return min(prices) if prices else None


class EventDetailSerializer(serializers.ModelSerializer):
    organizer = UserPublicSerializer(read_only=True)
    ticket_types = TicketTypeSerializer(many=True, read_only=True)
    media = MediaSerializer(many=True, read_only=True)
    categories = CategorySerializer(many=True, read_only=True)
    available_capacity = serializers.IntegerField(source='get_available_capacity', read_only=True)
    total_booked = serializers.IntegerField(source='get_total_booked', read_only=True)

    class Meta:
        model = Event
        fields = [
            'id', 'event_id', 'organizer', 'title', 'description', 'event_type',
            'venue', 'address', 'city', 'country', 'latitude', 'longitude',
            'start_datetime', 'end_datetime', 'capacity', 'status',
            'categories', 'ticket_types', 'media',
            'available_capacity', 'total_booked', 'created_at', 'updated_at',
        ]


class EventWriteSerializer(serializers.ModelSerializer):
    categories = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Category.objects.all(), required=False,
    )

    class Meta:
        model = Event
        fields = [
            'id', 'event_id', 'title', 'description', 'event_type',
            'venue', 'address', 'city', 'country', 'latitude', 'longitude',
            'start_datetime', 'end_datetime', 'capacity', 'status', 'categories',
        ]
        read_only_fields = ['id', 'event_id', 'status']

    def validate(self, attrs):
        start = attrs.get('start_datetime', getattr(self.instance, 'start_datetime', None))
        end = attrs.get('end_datetime', getattr(self.instance, 'end_datetime', None))
        if start and end and end <= start:
            raise serializers.ValidationError({'end_datetime': 'Must be after start_datetime.'})
        return attrs

    def create(self, validated_data):
        categories = validated_data.pop('categories', [])
        validated_data['event_id'] = generate_id(Event, 'event_id', 'EV')
        validated_data['organizer'] = self.context['request'].user
        event = Event.objects.create(**validated_data)
        if categories:
            event.categories.set(categories)
        return event

    def update(self, instance, validated_data):
        categories = validated_data.pop('categories', None)
        event = super().update(instance, validated_data)
        if categories is not None:
            event.categories.set(categories)
        return event
