# from django.contrib import admin

# # Register your models here.
# from django.contrib import admin
# from django.contrib.auth.admin import UserAdmin
# from .models import User

# admin.site.register(User, UserAdmin)

#new edition
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Event, Category, TicketType, Booking, Message, Media

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'role', 'status', 'is_active')
    list_filter = ('role', 'status', 'is_active')
    fieldsets = UserAdmin.fieldsets + (
        ('Custom Fields', {'fields': ('phone', 'address', 'city', 'country', 'afm', 'role', 'status')}),
    )

@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ('event_id', 'title', 'organizer', 'status', 'start_datetime')
    list_filter = ('status', 'event_type', 'city')
    search_fields = ('title', 'event_id', 'organizer__username')

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name',)

@admin.register(TicketType)
class TicketTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'event', 'price', 'quantity', 'available')

@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('booking_id', 'event', 'attendee', 'number_of_tickets', 'status')
    list_filter = ('status',)

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('subject', 'sender', 'recipient', 'is_read', 'created_at')

@admin.register(Media)
class MediaAdmin(admin.ModelAdmin):
    list_display = ('event', 'photo')
