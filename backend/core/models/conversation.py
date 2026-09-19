from django.db import models

from .user import User
from .event import Event


class Conversation(models.Model):
    organizer = models.ForeignKey(
        User, 
        on_delete=models.PROTECT, 
        related_name='organizer_conversation'
    )
    attendee = models.ForeignKey(
        User, 
        on_delete=models.PROTECT, 
        related_name='attendee_conversation'
    )
    event = models.ForeignKey(
        Event, 
        on_delete=models.CASCADE, 
        related_name='conversations',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    deleted_by_organizer = models.BooleanField(default=False)
    deleted_by_attendee = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']
        # use indexing as this way the search in db will be faster ( due to indexing b-tree)
        indexes = [
            models.Index(fields=['organizer', 'deleted_by_organizer', '-created_at']),
            models.Index(fields=['attendee', 'deleted_by_attendee', '-created_at']),
        ]
        # so we don't have double entries with conversations with same participants over the same event
        constraints = [
            models.UniqueConstraint(fields=['event', 'attendee'], name='uniq_conversation_event_participant'),
        ]

