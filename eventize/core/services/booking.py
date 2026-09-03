#core/services/booking.py
from django.db import transaction, models
from django.db.models import Sum
from django.core.exceptions import ValidationError
from django.utils import timezone
from core.models import Booking, TicketType, Event, User
from core.services.ticket_type import reserve_tickets
from core.utils import generate_id

#Domain Exceptions
class BookingError(Exception):
    """Base exception for all booking errors.""" 
    pass

class SoldOutError(BookingError):
    """It appears when there are no tickets available.""" 
    pass

class BookingNotPendingError(BookingError):
    """It is raised when we try to confirm a non-pending reservation.""" 
    pass

class EventNotActiveError(BookingError):
    """It is triggered when the event is not active (not published or has already started).""" 
    pass

class TicketTypeMismatchError(BookingError):
    """It is raised when the ticket type does not belong to the event.""" 
    pass

class BookingAlreadyConfirmedError(BookingError):
    """It arises when we try to confirm an already confirmed reservation.""" 
    pass

@transaction.atomic
def create_booking(*, user, event_id, ticket_type_id, number_of_tickets):
    # make sure only approved users can make bookings and no guests
    if not (user.is_authenticated and user.is_approved):
        raise PermissionError("Only approved users can make bookings.")
    
    event = Event.objects.select_for_update().get(pk=event_id)
    if not event.is_active: #check event is active
        raise EventNotActiveError(
            f"Event '{event.title}' is not active."
            f"Status: {event.status}, Start: {event.start_datetime}"
        )

    if event.organizer_id == user.id:
        raise PermissionError("An organizer cannot book their own event.")
    
    ticket_type = TicketType.objects.select_for_update().get(pk=ticket_type_id)
    if ticket_type.event_id != event.id: #check ticket type belongs to event
        raise TicketTypeMismatchError(
            f"Ticket type '{ticket_type.name}' doesn't belong to event '{event.title}'."
        )

    if ticket_type.available < number_of_tickets: #check availability
        raise SoldOutError(
            f"Not enough tickets available."
            f"Requested: {number_of_tickets}, Available: {ticket_type.available}"
        )
    reserve_tickets(    #increases the reserved count for the ticket type
        ticket_type_id=ticket_type.id,
        quantity=number_of_tickets
    )
    total_cost = ticket_type.price*number_of_tickets
    booking = Booking.objects.create(
        booking_id=generate_id(Booking, 'booking_id', 'BK'),
        event=event,
        attendee=user,
        ticket_type=ticket_type,
        number_of_tickets=number_of_tickets,
        total_cost=total_cost,
        status=Booking.BookingStatus.PENDING
    )
    return booking

@transaction.atomic
def confirm_booking(*, booking_id,event_id, user):
    event = Event.objects.select_for_update().get(pk=event_id)
    booking=Booking.objects.select_for_update().get(pk=booking_id)

    if booking.attendee_id != user.id: #check permissions
        raise PermissionError("Only the attendee can confirm thi booking.")

    if booking.status != Booking.BookingStatus.PENDING: #check status of booking is PENDING
        raise BookingNotPendingError(
            f"Cannot confirm booking with status '{booking.status}'."
            "Only PENDING bookings can be confirmed."
        )
    
    # check for the active event status
    if not event.is_active: 
        raise EventNotActiveError(
            f"Event '{event.title}' is not active."
            f"Status: {event.status}, Start: {event.start_datetime}"
        )
    ticket_type = booking.ticket_type
    if ticket_type.available < booking.number_of_tickets: #check if the available tickets changed since the booking was made
        raise SoldOutError(
            f"Not enough tickets available."
            f"Requested: {booking.number_of_tickets}, Available: {ticket_type.available}"
        )

    booking.status = Booking.BookingStatus.CONFIRMED
    booking.save()
    return booking

@transaction.atomic
def cancel_event_bookings(*, event):
    # when an event is canceled the bookings' status switch to cancelled, it is the only way a booking can get this status as user cannot cancel a booking after confirmation
    # so we just change status and dont make any other change such as decrease tickets etc
    event = Event.objects.select_for_update().get(pk=event.pk)

    return Booking.objects.filter(
        event=event,
        status__in=(Booking.BookingStatus.PENDING, Booking.BookingStatus.CONFIRMED),
    ).update(status=Booking.BookingStatus.CANCELLED)


def get_booking_queryset(user): #returns the queryset of bookings that a user can view
    if user.is_admin: #admin can see them all
        return Booking.objects.all()
    return Booking.objects.filter(  #attendee can see his own, organizer can see the ones in the events he organizes
        models.Q(attendee=user) | models.Q(event__organizer=user)
    )

def send_booking_confirmation(booking):
    pass 