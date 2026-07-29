# # Create your models here.
# from django.db import models
# from django.contrib.auth.models import AbstractUser



# class User(AbstractUser):
#     phone = models.CharField(max_length=30, blank=True)
#     city = models.CharField(max_length=100, blank=True)
#     afm = models.CharField(max_length=20, blank=True)

#     class Status(models.TextChoices):
#         PENDING = 'PENDING', 'Pending'
#         APPROVED = 'APPROVED', 'Approved'
#         REJECTED = 'REJECTED', 'Rejected'

#     role = models.CharField(max_length=10, default='USER')
#     status = models.CharField(max_length=10, choices=Status.choices, default='PENDING')