# core/models/message.py

from django.db import models
from .user import User
from .event import Event

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
    event = models.ForeignKey(
        Event, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True, 
        related_name='messages'
    )
    
    # context
    subject = models.CharField(max_length=200)
    body = models.TextField()
    
    is_read = models.BooleanField(default=False)
    
    # delete flags
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
        return f"From {self.sender.username} to {self.receiver.username}: {self.subject}"
    
    # Marked as read
    def mark_as_read(self):
        self.is_read = True
        self.save(update_fields=['is_read'])

    # deleted by sender
    def deleted_for_sender(self):
        self.deleted_by_sender = True
        self.save(update_fields=['deleted_by_sender'])

    # deleted by receiver
    def deleted_for_receiver(self):
        self.deleted_by_receiver = True
        self.save(update_fields=['deleted_by_receiver'])