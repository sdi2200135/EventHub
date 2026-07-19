# core/models/booking.py
from django.db import models
from django.core.validators import MinValueValidator
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
    
    def confirm(self):
        """Επιβεβαίωση κράτησης"""
        if self.status == 'PENDING':
            if self.ticket_type.reserve(self.number_of_tickets):
                self.status = 'CONFIRMED'
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