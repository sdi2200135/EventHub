# core/serializers/booking.py
from rest_framework import serializers

from core.models import Booking
from core.utils import generate_id


class BookingSerializer(serializers.ModelSerializer):
    booking_id = serializers.CharField(read_only=True)
    attendee = serializers.PrimaryKeyRelatedField(read_only=True)
    total_cost = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    status = serializers.CharField(read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'booking_id', 'event', 'ticket_type', 'attendee',
            'number_of_tickets', 'total_cost', 'status', 'created_at',
        ]

    def validate(self, attrs):
        event = attrs.get('event') or getattr(self.instance, 'event', None)
        ticket_type = attrs.get('ticket_type') or getattr(self.instance, 'ticket_type', None)
        number_of_tickets = attrs.get('number_of_tickets', getattr(self.instance, 'number_of_tickets', None))

        errors = {}
        if ticket_type and ticket_type.event_id != event.id:
            errors['ticket_type'] = 'Ticket type does not belong to this event.'
        if event and not event.is_active():
            errors['event'] = 'Bookings are only allowed for published, upcoming events.'
        if ticket_type and number_of_tickets and not ticket_type.is_available(number_of_tickets):
            errors['number_of_tickets'] = 'Not enough tickets available for this ticket type.'
        if errors:
            raise serializers.ValidationError(errors)
        return attrs

    def create(self, validated_data):
        request = self.context['request']
        ticket_type = validated_data['ticket_type']
        number_of_tickets = validated_data['number_of_tickets']
        validated_data['booking_id'] = generate_id(Booking, 'booking_id', 'BK')
        validated_data['attendee'] = request.user
        validated_data['total_cost'] = ticket_type.price * number_of_tickets
        return super().create(validated_data)
