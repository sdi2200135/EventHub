# core/models/photo.py

from django.db import models
from .event import Event

class EventPhoto(models.Model):
    event = models.ForeignKey(
        Event, 
        on_delete=models.CASCADE, 
        related_name='photos'
    )
    image = models.ImageField(upload_to='events/%Y/%m/')
    caption = models.CharField(max_length=200, blank=True)
    order = models.PositiveIntegerField(default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    
    class Meta:
        ordering = ['order', 'uploaded_at']
        verbose_name_plural = "Event photos"

    def __str__(self):
        return f"Media for {self.event.title}"