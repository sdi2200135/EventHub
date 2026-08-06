# core/models/booking.py
from django.db import models
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db.models import Sum
from .user import User
from .event import Event
from .ticket_type import TicketType

class Booking(models.Model):
    class BookingStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        CONFIRMED = 'CONFIRMED', 'Confirmed'
        CANCELLED = 'CANCELLED', 'Cancelled'
    
    # Μοναδικό αναγνωριστικό (π.χ. B501)
    booking_id = models.CharField(max_length=20, unique=True)
    
    # Σχέσεις
    event = models.ForeignKey(
        Event, 
        on_delete=models.CASCADE, 
        related_name='bookings'
    )
    attendee = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='bookings'
    )
    ticket_type = models.ForeignKey(
        TicketType, 
        on_delete=models.CASCADE, 
        related_name='bookings'
    )
    
    # Στοιχεία κράτησης
    number_of_tickets = models.IntegerField(validators=[MinValueValidator(1)])
    total_cost = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Κατάσταση
    status = models.CharField(max_length=20, choices=BookingStatus.choices, default='PENDING')
    
    # Χρονική σήμανση
    created_at = models.DateTimeField(auto_now_add=True)  # Time που έγινε η κράτηση
    
    def __str__(self):
        return f"{self.booking_id} - {self.attendee.username} - {self.number_of_tickets}x{self.ticket_type.name}"

    def clean(self):
        errors = {}

        if self.event_id and self.ticket_type_id:
            if self.ticket_type.event_id != self.event_id:
                errors['ticket_type'] = 'ticket type event id and event id must be the same.'

        if self.event_id:
            if not self.event.is_active():
                errors['event'] = 'Η κράτηση επιτρέπεται μόνο για δημοσιευμένες και μελλοντικές εκδηλώσεις.'

        if self.event_id and self.number_of_tickets:
            confirmed_total = Booking.objects.filter(
                event=self.event,
                status=self.BookingStatus.CONFIRMED,
            ).exclude(pk=self.pk).aggregate(
                total=Sum('number_of_tickets')
            )['total'] or 0

            if confirmed_total + self.number_of_tickets > self.event.capacity:
                errors['number_of_tickets'] = 'Η κράτηση ξεπερνά τη συνολική χωρητικότητα της εκδήλωσης.'

        if self.ticket_type_id and self.number_of_tickets and self.status == self.BookingStatus.PENDING:
            if self.number_of_tickets > self.ticket_type.available:
                errors['number_of_tickets'] = 'Δεν υπάρχουν αρκετά διαθέσιμα εισιτήρια για αυτόν τον τύπο.'

        if errors:
            raise ValidationError(errors)
    
    def confirm(self):
        """Επιβεβαίωση κράτησης"""
        if self.status == self.BookingStatus.PENDING:
            self.full_clean()
            if self.ticket_type.reserve(self.number_of_tickets):
                self.status = self.BookingStatus.CONFIRMED
                self.save()
                return True
        return False
    
    def cancel(self):
        """Ακύρωση κράτησης"""
        if self.status == 'CONFIRMED':
            self.status = 'CANCELLED'
            self.ticket_type.release(self.number_of_tickets)
            self.save()
    
    @property
    def is_active(self):
        return self.status == 'CONFIRMED'
