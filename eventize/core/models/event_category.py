# core/models/event_category.py

from django.db import models
from .event import Event
from .category import Categpory

class EventCategory(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE)
    category = models.ForeignKey(Categpory, on_delete=models.CASCADE)

    class Meta:
        unique_together = ['event', 'category']
        verbose_name_plural = "Event Categories"
    
    def __str__(self):
        return f"{self.event.title} -> {self.category.name}"