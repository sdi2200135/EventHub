# core/serializers/ticket_type.py
from django.db.models import Sum

from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied

from core.models import TicketType
from core.services.ticket_type import (
    create_ticket_type, 
    update_ticket_type, 
    CapacityExceededError, 
    ReservedTicketsError,
    EventNotEditableError
)


class TicketTypeSerializer(serializers.ModelSerializer):
    available = serializers.IntegerField(read_only=True) #calc from model (quantity - reserved)

    class Meta:
        model = TicketType
        fields = ['id', 'event', 'name', 'price', 'quantity', 'available']
        read_only_fields = ['event'] #take it from context (URL)

    #verify that the sum of the ticket types doesn't exceed the event's capacity 
    def validate(self, attrs):
        # get event from context or from instance
        event = self.context.get('event')
        instance = self.instance
        if not event and instance:
            event = instance.event
        if not event:   #cannot do validation without event
            return attrs

        # get quantity from attrs or from instance
        quantity = attrs.get('quantity', getattr(instance, 'quantity', None))
        if quantity is None:
            return attrs

        # calc total of ticket types (except the current)
        other_total = event.ticket_types.exclude(
            pk=instance.pk if instance else None
        ).aggregate(total=Sum('quantity'))['total'] or 0

        if other_total + quantity > event.capacity:
            available = event.capacity - other_total
            raise serializers.ValidationError({
                'quantity': f'Sum of ticket types cannot exceed event capacity. Available: {available}'
            })
        return attrs

    def create(self, validated_data):
        # get event and request from context
        event = self.context.get('event')
        request = self.context.get('request')
        if not event or not request:
            raise serializers.ValidationError({'detail': 'Event and request nust be provided in context.'})

        # call sesrvice
        try:
            ticket_type = create_ticket_type(
                event_id=event.id,
                user=request.user,
                name=validated_data['name'],
                price=validated_data['price'],
                quantity=validated_data['quantity']
            )
        # all service exceptions are converted into a ValidationError so that the frontend can understand them
        except CapacityExceededError as e:
            raise serializers.ValidationError({'detail': str(e)})
        except EventNotEditableError as e:
                    raise serializers.ValidationError({'detail': str(e)})
        except PermissionError as e:
                    raise PermissionDenied(str(e))

        return ticket_type

    def update(self, instance, validated_data):
        request = self.context.get('request')
        if not request:
            raise serializers.ValidationError(
                {'detail': 'Request must be provided in context.'}
            )

        # call sesrvice
        try:
            ticket_type = update_ticket_type(
                ticket_type_id=instance.id,
                user=request.user,
                **validated_data
            )
        # all service exceptions are converted into a ValidationError so that the frontend can understand them
        except CapacityExceededError as e:
            raise serializers.ValidationError({'detail': str(e)})
        except ReservedTicketsError as e:
            raise serializers.ValidationError({'detail': str(e)})
        except EventNotEditableError as e:
                    raise serializers.ValidationError({'detail': str(e)})
        except PermissionError as e:
                    raise PermissionDenied(str(e))

        return ticket_type