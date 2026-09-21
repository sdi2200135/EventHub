# core/models/photo.py

from django.db import models, transaction
from .event import Event
from django.db.models.signals import post_delete
from django.dispatch import receiver
import os 
# photos are grouped per event: events/EV0001/xxxx.jpg
def event_photo_path(instance, filename):
    return f'events/{instance.event.event_id}/{filename}'

class EventPhoto(models.Model):
    event = models.ForeignKey(
        Event, 
        on_delete=models.CASCADE, 
        related_name='photos'
    )
    image = models.ImageField(upload_to=event_photo_path)
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
    if not name:
        return

    def cleanup():
        storage.delete(name)
        # rmdir deletes the dir when the dir is empty so
        try:
            os.rmdir(os.path.dirname(storage.path(name)))
        except (OSError, NotImplementedError):
            pass

    transaction.on_commit(cleanup)