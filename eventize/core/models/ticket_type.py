# core/models/ticket_type.py

from django.db import models
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from .event import Event
from django.db.models import Sum, Q, F

class TicketType(models.Model):
    event = models.ForeignKey(
        Event, 
        on_delete=models.CASCADE, 
        related_name='ticket_types'
    )
    
    name = models.CharField(max_length=100)  # for example VVIP, student, VIP
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    # total tickets
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])  

    # reserved tickets
    reserved = models.PositiveIntegerField(default=0)

        
    class Meta:
        ordering = ['price']

        constraints = [
            models.CheckConstraint(condition=Q(reserved__lte=F('quantity')),
                                   name='tickettype_reserved_within_quantity'), # check that the reserved tickers are not more than the capacity of tickets
        ]

    @property
    def available(self):
        return self.quantity - self.reserved

    
    def clean(self):
        super().clean()
        #  Guard, no validation if the fields we need aren't ready yet
        if not self.event_id or self.quantity is None:
            return

        # not set the total tickets to smaller number than the one which are reserved
        if self.pk and self.quantity < self.reserved:
            raise ValidationError({
                'quantity': f'There are already {self.reserved} reserved tickets.'
            })
        
        # check that the sum of all ticket type quantities must not exceed the event capacity

        # exclude(pk=self.pk) subtracts this row's own  old value on update; on create pk is None so nothing is excluded.
        # find the rest ticket types add the number of tickets except the current one and add it afterwards
        others = (self.event.ticket_types.exclude(pk=self.pk)
                  .aggregate(t=Sum('quantity'))['t'] or 0)
        if others + self.quantity > self.event.capacity:
            raise ValidationError({
                'quantity': f'Exceeds the capacity. Available: {self.event.capacity - others}.'
            })

    def is_available(self, num_tickets=1):
        return self.available >= num_tickets
    
    def __str__(self):
      return f"{self.name} — {self.price}€ ({self.available}/{self.quantity})"