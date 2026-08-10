# core/serializers/ticket_type.py
from django.db.models import Sum
from rest_framework import serializers

from core.models import TicketType
from core.utils import generate_id


class TicketTypeSerializer(serializers.ModelSerializer):
    ticket_type_id = serializers.CharField(read_only=True)
    available = serializers.IntegerField(read_only=True)

    class Meta:
        model = TicketType
        fields = ['id', 'ticket_type_id', 'event', 'name', 'price', 'quantity', 'available']

    def validate(self, attrs):
        event = attrs.get('event') or getattr(self.instance, 'event', None)
        quantity = attrs.get('quantity', getattr(self.instance, 'quantity', None))

        other_total = event.ticket_types.exclude(
            pk=self.instance.pk if self.instance else None
        ).aggregate(total=Sum('quantity'))['total'] or 0

        if other_total + quantity > event.capacity:
            raise serializers.ValidationError({
                'quantity': 'Sum of ticket-type quantities cannot exceed event capacity.'
            })
        return attrs

    def create(self, validated_data):
        event = validated_data['event']
        validated_data['ticket_type_id'] = generate_id(
            TicketType, 'ticket_type_id', 'TT', scope={'event': event}
        )
        validated_data['available'] = validated_data['quantity']
        return super().create(validated_data)
