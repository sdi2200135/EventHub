# core/services/ticket_type.py
from django.db import transaction
from django.db.models import Sum
from django.core.exceptions import ValidationError
from core.models import TicketType, Event

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
    """"when we try to modify ticket types for an event that is not Draft
    Only Draft events allow changes to ticket types"""
    pass

# Create new ticket type for an event and returns it
@transaction.atomic #it makes changes to the database that must all be performed together or not at all
def create_ticket_type(*, event_id, user, name, price, quantity):
    # get event with lock to prevent race conditions
    event = Event.objects.select_for_update().get(pk=event_id)

    # check if the user has the right to create a ticket type (if the user is event's organizer or admin)
    if event.organizer_id != user.id and not user.is_admin():
        raise PermissionError("Only the event organizer or an admin can add ticket types.")

    # check if the event is Draft to modify it
    if event.status != Event.EventStatus.DRAFT:
        raise EventNotEditableError(f"Can't modify ticket types when event is in '{event.status}' status."
                                    "Only Draft events can be modified.") 

    # calc the total num of ticket types that already exist(with an SQL query)
    other_total = event.ticket_types.aggregate(total = Sum('quantity'))['total'] or 0

    if other_total + quantity > event.capacity:
        available = event.capacity - other_total
        raise CapacityExceededError(f"Can't add {quantity} tickets. Only {available} capacity available.")

    # create new ticket type
    ticket_type = TicketType.objects.create(
        event = event,
        name = name,
        price = price,
        quantity = quantity,
        reversed = 0
    ) 

    return ticket_type

# update ticket type
@transaction.atomic
def update_ticket_type(*, ticket_type_id, user, **validated_data):
    ticket_type = TicketType.objects.select_for_update().get(pk = ticket_type_id)
    event = ticket_type.event

    if event.organizer_id != user.id and not user.is_admin:
        raise PermissionError("Only the event organizer or an admin can modify ticket types.")

    if event.status != Event.EventStatus.DRAFT:
        raise EventNotEditableError(f"Cannot modify ticket types when event is in '{event.status}' status."
                                    "Only Draft events can be modified.")

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
    ticket_type = TicketType.objects.select_for_update().get(pk = ticket_type_id)
    event = ticket_type.event

    if event.organizer_id != user.id and not user.is_admin():
        raise PermissionError("Only the event organizer or an admin can modify ticket types.")

    if event.status != Event.EventStatus.DRAFT:
            raise EventNotEditableError(f"Cannot modify ticket types when event is in '{event.status}' status."
                                        "Only Draft events can be modified.")

    # check if there are any bookings to avoid delete
    if ticket_type.bookings.exists():
        c_booking = ticket_type.bookings.count()
        raise ReservedTicketsError(f"Cannot delete ticket type with {c_booking} existing bookings.")

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
    ticket_type.save()
    return ticket_type