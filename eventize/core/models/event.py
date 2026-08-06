# core/models/event.py
from django.db import models
from django.core.validators import MinValueValidator
from .user import User
from django.utils import timezone

class Event(models.Model):
    class EventStatus(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        PUBLISHED = 'PUBLISHED', 'Published'
        COMPLETED = 'COMPLETED', 'Completed'
        CANCELLED = 'CANCELLED', 'Cancelled'
    
    class EventType(models.TextChoices):
        CONCERT = 'CONCERT', 'Concert'
        SEMINAR = 'SEMINAR', 'Seminar'
        THEATER = 'THEATER', 'Theater'
        CONFERENCE = 'CONFERENCE', 'Conference'
        SPORTS = 'SPORTS', 'Sports'
        OTHER = 'OTHER', 'Other'
    
    event_id = models.CharField(max_length=20, unique=True)
    
    organizer = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='events'
    )
    
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    event_type = models.CharField(max_length=50, choices=EventType.choices, default='OTHER')
    venue = models.CharField(max_length=200)
    address = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    country = models.CharField(max_length=100)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()
    capacity = models.IntegerField(validators=[MinValueValidator(1)])
    status = models.CharField(max_length=20, choices=EventStatus.choices, default='DRAFT')
    
    categories = models.ManyToManyField(
        'Category', 
        through='EventCategory',
        related_name='events',
        blank=True
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.event_id} - {self.title}"
    
    def is_published(self):
        return self.status == 'PUBLISHED'
    
    def is_cancelled(self):
        return self.status == 'CANCELLED'
    
    def is_active(self):
        return self.status == 'PUBLISHED' and self.start_datetime > timezone.now()
    
    def get_available_capacity(self):
        """Υπολογίζει συνολικές διαθέσιμες θέσεις"""
        return sum(ticket.available for ticket in self.ticket_types.all())
    
    def get_total_booked(self):
        """Υπολογίζει συνολικές κρατημένες θέσεις"""
        return sum(
            booking.number_of_tickets 
            for booking in self.bookings.filter(status='CONFIRMED')
        )