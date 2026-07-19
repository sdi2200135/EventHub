# core/models/message.py
from django.db import models
from .user import User
from .event import Event

class Message(models.Model):
    # Σχέσεις
    sender = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='sent_messages'
    )
    recipient = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='received_messages'
    )
    event = models.ForeignKey(
        Event, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True, 
        related_name='messages'
    )
    
    # Περιεχόμενο
    subject = models.CharField(max_length=200)
    body = models.TextField()
    
    # Κατάσταση
    is_read = models.BooleanField(default=False)
    
    # Διαγραφή (soft delete)
    deleted_by_sender = models.BooleanField(default=False)
    deleted_by_recipient = models.BooleanField(default=False)
    
    # Χρονική σήμανση
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"From {self.sender.username} to {self.recipient.username}: {self.subject}"
    
    def mark_as_read(self):
        """Μαρκάρισμα ως αναγνωσμένο"""
        if not self.is_read:
            self.is_read = True
            self.save()
    
    def delete_for_sender(self):
        """Διαγραφή μόνο για τον αποστολέα"""
        self.deleted_by_sender = True
        self.save()
    
    def delete_for_recipient(self):
        """Διαγραφή μόνο για τον παραλήπτη"""
        self.deleted_by_recipient = True
        self.save()