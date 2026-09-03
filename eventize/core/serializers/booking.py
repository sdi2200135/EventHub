# core/serializers/booking.py
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied

from core.models import Booking
from core.services.booking import (
    create_booking,
    confirm_booking,
    SoldOutError,
    EventNotActiveError,
    TicketTypeMismatchError,
    BookingNotPendingError
)

class BookingSerializer(serializers.ModelSerializer):
    #fields
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
        #get data
        event = attrs.get('event') or getattr(self.instance, 'event', None)
        ticket_type = attrs.get('ticket_type') or getattr(self.instance, 'ticket_type', None)
        number_of_tickets = attrs.get('number_of_tickets', getattr(self.instance, 'number_of_tickets', None))

        errors = {}
        #check ticket type belongs to event
        if ticket_type and event and ticket_type.event_id != event.id:
            errors['ticket_type'] = 'Ticket type does not belong to this event.'
        #check event is active
        if event and not event.is_active:
            errors['event'] = 'Bookings are only allowed for published, upcoming events.'
        #check availability
        if ticket_type and number_of_tickets and not ticket_type.is_available(number_of_tickets):
            errors['number_of_tickets'] = 'Not enough tickets available for this ticket type.'
        #raise errors if any
        if errors:
            raise serializers.ValidationError(errors)
        return attrs

    def create(self, validated_data):
        #get request from context
        request = self.context.get('request')
        if not request:
            raise serializers.ValidationError(
                {'detail': 'Request must be provided in context.'}
            )

        try:
            booking = create_booking(
                user=request.user,
                event_id=validated_data['event'].id,
                ticket_type_id=validated_data['ticket_type'].id,
                number_of_tickets=validated_data['number_of_tickets']
            ) 
        except EventNotActiveError as e:
            raise serializers.ValidationError({'detail':str(e)})
        except TicketTypeMismatchError as e:
            raise serializers.ValidationError({'detail':str(e)})
        except SoldOutError as e:
            raise serializers.ValidationError({'detail':str(e)})
        except PermissionError as e:
            raise PermissionDenied(str(e))

        return booking

    def update(self, instance, validated_data): #bookings are not updated directly.
        raise serializers.ValidationError(
            {'detail':'Bookings cannot be updated or withdrawn once submitted.'}
        )