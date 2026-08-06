# core/models/user.py
from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    phone = models.CharField(max_length=30, blank=True)
    address = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)
    afm = models.CharField(max_length=20, blank=True)

    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'Administrator'
        ORGANIZER = 'ORGANIZER', 'Organizer'
        PARTICIPANT = 'PARTICIPANT', 'Participant'
    
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'
    
    role = models.CharField(max_length=20, choices=Role.choices, default='PARTICIPANT')
    status = models.CharField(max_length=20, choices=Status.choices, default='PENDING')

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"   #που ειναι αυτη η συναρτηση 
    
    def is_admin(self):
        return self.role == 'ADMIN' or self.is_superuser
    
    def is_organizer(self):
        return self.role == 'ORGANIZER'
    
    def is_participant(self):
        return self.role == 'PARTICIPANT'
