# core/models/event.py

from django.db import models
from django.core.validators import MinValueValidator
from .user import User
from django.utils import timezone
from django.db.models import Sum, Q, F
from django.core.exceptions import ValidationError

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
        on_delete=models.PROTECT, 
        related_name='organized_events'
    )
    
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    event_type = models.CharField(max_length=50, choices=EventType.choices, default=EventType.OTHER)
    venue = models.CharField(max_length=200)
    address = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    country = models.CharField(max_length=100)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()
    capacity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    status = models.CharField(max_length=20, choices=EventStatus.choices, default=EventStatus.DRAFT)
    
    categories = models.ManyToManyField(
        'Category', 
        related_name='events',
    )

    # update time
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # rules for the db
    class Meta:
        # order by latest start time
        ordering = ['-start_datetime']
        # db rule end_datetime > start_datetime
        constraints = [
            models.CheckConstraint(
                condition=Q(end_datetime__gt=F('start_datetime')),
                name='event_end_after_start',
            ),
        ]
        # create indexing for faster search
        indexes = [
            models.Index(fields=['status', 'start_datetime']),
            models.Index(fields=['city', 'start_datetime']),
        ]

    def __str__(self):
        return f"{self.event_id} - {self.title}"

    @property
    def is_published(self):
        return self.status == self.EventStatus.PUBLISHED
    
    @property
    def is_cancelled(self):
        return self.status == self.EventStatus.CANCELLED
    
    @property
    def is_active(self):
        return self.status == self.EventStatus.PUBLISHED and self.start_datetime > timezone.now()
    
    @property
    def total_reserved(self):
        return self.ticket_types.aggregate(t=Sum('reserved'))['t'] or 0

    @property
    def available_capacity(self):
        return self.capacity - self.total_reserved

    def clean(self):
        super().clean()
        if self.start_datetime and self.end_datetime and self.end_datetime <= self.start_datetime:
            raise ValidationError({'end_datetime': 'End time must be after start time.'})