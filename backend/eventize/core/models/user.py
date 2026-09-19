# core/models/user.py
from django.core.validators import RegexValidator
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.db.models.functions import Lower
from django.db.models import Q

# the class user has all these fields in order to know 
class User(AbstractUser):
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    email = models.EmailField()  # constraint check
    phone = models.CharField(max_length=30)
    address = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    country = models.CharField(max_length=100)
    afm = models.CharField(
        max_length=9, unique=True,
        validators=[RegexValidator(r'^\d{9}$', 'AFM is a 9-digit number')],
    )
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    REQUIRED_FIELDS = ['email', 'first_name', 'last_name', 
                       'phone','address', 'city', 'country', 'afm']
    
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'
    
    approval_status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING,db_index=True)

    # lowercase the email
    class Meta:
        constraints = [
            models.UniqueConstraint(Lower('email'), name='uniq_user_email_ci'),
            models.CheckConstraint(condition=(
                Q(latitude__isnull = False, longitude__isnull=False) |
                Q(latitude__isnull = True, longitude__isnull= True)),
                name="pair_latitude_longitude_user"),
        ]
    def __str__(self):
        return f"{self.username} ({self.get_approval_status_display()})" 
    
    @property
    def is_admin(self):
        return self.is_staff or self.is_superuser

    @property
    def is_organizer(self):
        return self.organized_events.exists()
    
    @property
    def is_approved(self):
        return self.approval_status == self.Status.APPROVED
    
    