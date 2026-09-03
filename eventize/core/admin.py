from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import (User, Event, Category, TicketType, Booking,
                     Conversation, Message, EventPhoto, EventView)


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name',
                    'approval_status', 'is_staff')
    list_filter = ('approval_status', 'is_staff', 'is_active')
    fieldsets = UserAdmin.fieldsets + (
        ('Contact & Location', {
            'fields': ('phone', 'address', 'city', 'country', 'afm',
                       'latitude', 'longitude')
        }),
        ('Approval', {'fields': ('approval_status',)}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Required', {
            'fields': ('email', 'first_name', 'last_name', 'phone',
                       'address', 'city', 'country', 'afm')
        }),
    )


class TicketTypeInline(admin.TabularInline):
    model = TicketType
    extra = 1


class EventPhotoInline(admin.TabularInline):
    model = EventPhoto
    extra = 1


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ('event_id', 'title', 'organizer', 'status', 'start_datetime')
    list_filter = ('status', 'event_type', 'city')
    search_fields = ('title', 'event_id', 'organizer__username')
    filter_horizontal = ('categories',)
    inlines = [TicketTypeInline, EventPhotoInline]


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(TicketType)
class TicketTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'event', 'price', 'quantity', 'reserved', 'available')
    list_filter = ('event',)


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('booking_id', 'event', 'attendee', 'number_of_tickets',
                    'total_cost', 'status')
    list_filter = ('status',)
    search_fields = ('booking_id', 'attendee__username')


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    fields = ('sender', 'receiver', 'body', 'is_read', 'created_at')
    readonly_fields = ('created_at',)


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('id', 'event', 'organizer', 'attendee', 'message_count', 'created_at')
    list_filter = ('deleted_by_organizer', 'deleted_by_attendee')
    search_fields = ('event__title', 'organizer__username', 'attendee__username')
    inlines = [MessageInline]

    def get_queryset(self, request):
        # the list page shows event/organizer/attendee per row, so join them once
        return super().get_queryset(request).select_related('event', 'organizer', 'attendee')

    @admin.display(description='messages')
    def message_count(self, obj):
        return obj.messages.count()


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('sender', 'receiver', 'conversation', 'is_read', 'created_at')
    list_filter = ('is_read',)
    search_fields = ('sender__username', 'receiver__username', 'body')


@admin.register(EventPhoto)
class EventPhotoAdmin(admin.ModelAdmin):
    list_display = ('event', 'caption', 'order')


@admin.register(EventView)
class EventViewAdmin(admin.ModelAdmin):
    list_display = ('user', 'event', 'view_count', 'last_viewed_at')