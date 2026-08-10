# core/models/user.py
from django.db import models
from django.contrib.auth.models import AbstractUser


# the class user has all these fields in order to know 
class User(AbstractUser):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'

    phone = models.CharField(max_length=30, blank=True)
    address = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)
    afm = models.CharField(max_length=20, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

  
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'
    
    approval_status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING,db_index=True)

    def __str__(self):
        return f"{self.username} ({self.get_approval_status_display()})" 
    
    @property
    def is_organizer(self):
        return self.organized_events.exists()
    
    @property
    def is_approved(self):
        return self.approval_status == self.Status.APPROVED