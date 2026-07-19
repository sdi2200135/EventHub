# core/models/ticket_type.py
from django.db import models
from django.core.validators import MinValueValidator
from .event import Event

class TicketType(models.Model):
    ticket_type_id = models.CharField(max_length=20)
    
    event = models.ForeignKey(
        Event, 
        on_delete=models.CASCADE, 
        related_name='ticket_types'
    )
    
    name = models.CharField(max_length=100)  # π.χ. "General Admission", "Student"
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    quantity = models.IntegerField(validators=[MinValueValidator(0)])  # Συνολική ποσότητα
    available = models.IntegerField(validators=[MinValueValidator(0)])  # Διαθέσιμο υπόλοιπο
    
    class Meta:
        unique_together = ['event', 'ticket_type_id']
    
    def __str__(self):
        return f"{self.name} - {self.price}€ (Available: {self.available})"
    
    def reserve(self, num_tickets):
        """Κάνει κράτηση εισιτηρίων αν υπάρχουν διαθέσιμα"""
        if self.available >= num_tickets:
            self.available -= num_tickets
            self.save()
            return True
        return False
    
    def release(self, num_tickets):
        """Απελευθερώνει εισιτήρια (π.χ. ακύρωση)"""
        self.available += num_tickets
        self.save()
    
    def is_available(self, num_tickets=1):
        return self.available >= num_tickets