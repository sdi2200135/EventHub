# core/models/message.py

from django.db import models
from .user import User
from .event import Event
from .conversation import Conversation


class Message(models.Model):
    # relations
    sender = models.ForeignKey(
        User, 
        on_delete=models.PROTECT, 
        related_name='sent_messages'
    )
    receiver = models.ForeignKey(
        User, 
        on_delete=models.PROTECT, 
        related_name='received_messages'
    )

    # if conversation is deleted, its messages are deleted too
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages'
    )

    # context
    body = models.TextField(max_length=2048)
    
    is_read = models.BooleanField(default=False)
    
    # soft delete flags
    deleted_by_sender = models.BooleanField(default=False)
    deleted_by_receiver = models.BooleanField(default=False)
    
    # time of the message
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        # use indexing as this way the search in db will be faster ( due to indexing b-tree)
        indexes = [
            models.Index(fields=['receiver', 'deleted_by_receiver', '-created_at']),
            models.Index(fields=['sender', 'deleted_by_sender', '-created_at']),
        ]
    
    def __str__(self):
        return f"From {self.sender.username} to {self.receiver.username}"
    
    # Marked as read
    def mark_as_read(self):
        self.is_read = True
        self.save(update_fields=['is_read'])
