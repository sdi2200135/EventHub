# core/services/ticket_type.py
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from core.models import TicketType, Event,Booking

# Domain Exceptions (relate to the logic of ticket types)
class TicketTypeError(Exception):
    """"Base exception for all ticket type errors
    All other exceptions inherit from this one"""
    pass

class CapacityExceededError(TicketTypeError):
    """"When the sum of the ticket types is more than the event's capacity"""
    pass

class ReservedTicketsError(TicketTypeError):
    """"when we try to do something that affects reserved tickets"""
    pass

class EventNotEditableError(TicketTypeError):
    """"when we try to modify ticket types for an event that is not Draft or published
    Only Draft or published events allow changes to ticket types"""
    pass

# Create new ticket type for an event and returns it
@transaction.atomic #it makes changes to the database that must all be performed together or not at all
def create_ticket_type(*, event_id, user, name, price, quantity):
    # get event with lock to prevent race conditions
    event = Event.objects.select_for_update().get(pk=event_id)

    # check if the user has the right to create a ticket type (if the user is event's organizer or admin)
    if event.organizer_id != user.id and not user.is_admin:
        raise PermissionError("Only the event organizer or an admin can add ticket types.")

    # check if the event is draft or published to modify it
    if event.status in (event.EventStatus.COMPLETED, event.EventStatus.CANCELLED):
        raise EventNotEditableError(f"Can't modify ticket types when event is in '{event.status}' status. Only draft or published events can be modified.") 

    # an event which has started is frozen, no changes applied
    if event.start_datetime <= timezone.now():
        raise EventNotEditableError("This event has already started, its ticket types cannot be changed.")

    # calc the total num of ticket types that already exist(with an SQL query)
    other_total = event.ticket_types.aggregate(total = Sum('quantity'))['total'] or 0

    if other_total + quantity > event.capacity:
        available = event.capacity - other_total
        raise CapacityExceededError(f"Can't add {quantity} tickets. Only {available} capacity available.")

    # unique id given on .save() of ticket_type by generated_id per scope
    ticket_type = TicketType.objects.create(
        event = event,
        name = name,
        price = price,
        quantity = quantity,
    )

    return ticket_type

# update ticket type
@transaction.atomic
def update_ticket_type(*, ticket_type_id, user, **validated_data):
    event_id = TicketType.objects.values_list('event_id', flat=True).get(pk = ticket_type_id)
    event = Event.objects.select_for_update().get(pk = event_id)
    ticket_type = TicketType.objects.select_for_update().get(pk = ticket_type_id)

    if event.organizer_id != user.id and not user.is_admin:
        raise PermissionError("Only the event organizer or an admin can modify ticket types.")

    if event.status in (event.EventStatus.COMPLETED, event.EventStatus.CANCELLED):
        raise EventNotEditableError(f"Cannot modify ticket types when event is in '{event.status}' status. Only draft or published events can be modified.")

    # an event which has started is frozen, no changes applied
    if event.start_datetime <= timezone.now():
        raise EventNotEditableError("This event has already started, its ticket types cannot be changed.")

    # check if the amount of tickets the user is trying to reduce is more than the reserved tickets
    new_quantity = validated_data.get('quantity')
    if new_quantity is not None and new_quantity < ticket_type.reserved:
        raise ReservedTicketsError(f"Cannot reduce quantity to {new_quantity}."
                                   f"There are already {ticket_type.reserved} reserved tickets.")

    # if the quantity changes we have to check the total capacity
    if new_quantity is not None:
        # calc the num of the other ticket types, without the current
        other_total = event.ticket_types.exclude(pk = ticket_type.pk).aggregate(total = Sum('quantity'))['total'] or 0

        if other_total + new_quantity > event.capacity:
                available = event.capacity - other_total
                raise CapacityExceededError(f"Can't add {new_quantity} tickets. Only {available} capacity available.")

    # update fields that are sent to validated_data
    for field, value in validated_data.items():
        setattr(ticket_type, field, value)
    ticket_type.save()

    return ticket_type

# delete ticket type (if success returns true)
@transaction.atomic
def delete_ticket_type(*, ticket_type_id, user):
    event_id = TicketType.objects.values_list('event_id', flat=True).get(pk = ticket_type_id)
    event = Event.objects.select_for_update().get(pk = event_id)
    ticket_type = TicketType.objects.select_for_update().get(pk = ticket_type_id)

    if event.organizer_id != user.id and not user.is_admin:
        raise PermissionError("Only the event organizer or an admin can modify ticket types.")

    if event.status in (event.EventStatus.COMPLETED, event.EventStatus.CANCELLED):
            raise EventNotEditableError(f"Cannot modify ticket types when event is in '{event.status}' status."
                                        "Only published or draft events can be modified.")

    # an event which has started is frozen, no changes applied
    if event.start_datetime <= timezone.now():
        raise EventNotEditableError("This event has already started, its ticket types cannot be changed.")
    
    # a published event must always have one ticket type and  if this is the last one u cannot delet it 
    if event.status == event.EventStatus.PUBLISHED and event.ticket_types.count() == 1:
        raise EventNotEditableError("A published event must have at least a ticket type.")
    
    # check if there are any bookings to avoid delete
    if ticket_type.bookings.exclude(status=Booking.BookingStatus.PENDING).exists():
        c_booking = ticket_type.bookings.exclude(status=Booking.BookingStatus.PENDING).count()
        raise ReservedTicketsError(f"Cannot delete ticket type with {c_booking} existing bookings.")
    
    # firstly delete pending bookings and then the filter
    ticket_type.bookings.filter(status=Booking.BookingStatus.PENDING).delete()
    ticket_type.delete()
    return True

# reserve tickets (for booking service when a user makes a reservation)
@transaction.atomic
def reserve_tickets(*, ticket_type_id, quantity):
    ticket_type = TicketType.objects.select_for_update().get(pk = ticket_type_id)

    # check availability
    if ticket_type.available < quantity:
        from core.services.booking import SoldOutError  #import is here to avoid circular import
        raise SoldOutError(f"Not enough tickets available."
                           f"Requested: {quantity}, Available: {ticket_type.available}")

    ticket_type.reserved += quantity
    ticket_type.save(update_fields=['reserved'])
    return ticket_type