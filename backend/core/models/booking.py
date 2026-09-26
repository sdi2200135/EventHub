# core/models/booking.py
from django.db import models
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from core.utils import set_id_from_pk, temporary_id

from .user import User
from .event import Event
from .ticket_type import TicketType

class Booking(models.Model):
    class BookingStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        CONFIRMED = 'CONFIRMED', 'Confirmed'
        CANCELLED = 'CANCELLED', 'Cancelled'
    
    booking_id = models.CharField(max_length=20, unique=True)
    
    # relations
    event = models.ForeignKey(
        Event, 
        on_delete=models.PROTECT, 
        related_name='bookings'
    )
    attendee = models.ForeignKey(
        User, 
        on_delete=models.PROTECT, 
        related_name='bookings'
    )
    ticket_type = models.ForeignKey(
        TicketType, 
        on_delete=models.PROTECT, 
        related_name='bookings'
    )
    
    # booking's info
    number_of_tickets = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    total_cost = models.DecimalField(max_digits=10, decimal_places=2)
    
    status = models.CharField(max_length=20, choices=BookingStatus.choices, default=BookingStatus.PENDING)
    
    # time of booking
    created_at = models.DateTimeField(auto_now_add=True)  
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['attendee', '-created_at']),
            models.Index(fields=['event', 'status']),
        ]

    # the unique value of booking is given on .save and it is built based on the pk
    def save(self, *args, **kwargs):
        if not self.booking_id:
            # by giving a temporary id and then build the unique id based on the pk solves the race condition 
            # as both will be based on the pk which can never be duplicated
            self.booking_id = temporary_id()
            super().save(*args, **kwargs)
            set_id_from_pk(self, 'booking_id', 'BK')
            return
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.booking_id} — {self.attendee.username} — {self.number_of_tickets}×{self.ticket_type.name}"

    def clean(self):
        super().clean()
        errors = {}

        # check if the ticket type belongs to the current event
        if self.event_id and self.ticket_type_id and self.ticket_type.event_id != self.event_id:
                errors['ticket_type'] = 'ticket type event id and event id must be the same.'

        if not self.pk and self.event_id:
            # the event is not published doesn't accept bookings
            if not self.event.is_published:
                errors['event'] = 'This event is not accepting bookings.'
            # no bookings, it has already began
            elif not self.event.is_active:
                errors['event'] = 'This event has finished.'

        # not available tickets to purchase
        if not self.pk and self.ticket_type_id and self.number_of_tickets:
                if self.number_of_tickets > self.ticket_type.available:
                    errors['number_of_tickets'] = 'Not enough tickets available for this type.'


        if errors:
            raise ValidationError(errors)
    
    @property
    def is_active(self):
        return self.status == self.BookingStatus.CONFIRMED
