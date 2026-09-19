# core/models/photo.py

from django.db import models, transaction
from .event import Event
from django.db.models.signals import post_delete
from django.dispatch import receiver

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

# when the db row of photo is deleted, delete the actual photo
@receiver(post_delete, sender=EventPhoto)
def delete_photo_file(sender, instance, **kwargs):
    name, storage = instance.image.name, instance.image.storage
    if name:
        transaction.on_commit(lambda: storage.delete(name))