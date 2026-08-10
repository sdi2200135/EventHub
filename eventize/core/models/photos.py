# core/models/media.py
from django.db import models
from .event import Event

class Media(models.Model):
    event = models.ForeignKey(
        Event, 
        on_delete=models.CASCADE, 
        related_name='photos'
    )
    # Μπορεί να είναι URL ή διαδρομή αρχείου
    photo = models.CharField(max_length=255)  # π.χ. "cover1.jpg"
    # Εναλλακτικά, αν θες upload:
    # image = models.ImageField(upload_to='event_photos/', blank=True, null=True)
    
    def __str__(self):
        return f"Media for {self.event.title}: {self.photo}"
    
    class Meta:
        verbose_name_plural = "Media"