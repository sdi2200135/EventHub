# core/models/event_view.py

from django.db import models
from .user import User
from .event import Event

class EventView(models.Model):
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='event_views'
    )
    event = models.ForeignKey(
        Event, 
        on_delete=models.CASCADE, 
        related_name='views'
    )
    view_count = models.PositiveIntegerField(default=1)

    first_viewed_at = models.DateTimeField(auto_now_add=True)
    last_viewed_at = models.DateTimeField(auto_now=True)


    class Meta:
        ordering = ['-last_viewed_at']
        constraints = [
            models.UniqueConstraint(fields=['user', 'event'], name='unique_user_event_view'),
        ]
        indexes = [models.Index(fields=['user', '-last_viewed_at'])]
    
    def __str__(self):
        return f"{self.user.username} viewed {self.event.title} ({self.view_count}x)"