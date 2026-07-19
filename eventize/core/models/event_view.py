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
    viewed_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['user', 'event']  # Ένας χρήστης μία φορά ανά event (ή μπορείς να το αφαιρέσεις)
        ordering = ['-viewed_at']
    
    def __str__(self):
        return f"{self.user.username} viewed {self.event.title} at {self.viewed_at}"