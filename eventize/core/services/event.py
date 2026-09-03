# core/services/events.py
from django.db import transaction
from django.db.models import Sum
from core.models import Event, TicketType
from core.utils import generate_id

class DomainError(Exception):
    """Base for all business-rule violations."""
    default_message = "Operation not allowed."


class CapacityExceeded(DomainError):
    default_message = "Ticket quantities exceed event capacity."

class InvalidTransition(DomainError):
    default_message = "This status change is not allowed."

def create_event(*, organizer, categories=None, ticket_types=None, **data):
    if ticket_types:
        total = sum(tt['quantity'] for tt in ticket_types)
        if total > data['capacity']:
            raise CapacityExceeded(f"Ticket quantities ({total}) exceed capacity ({data['capacity']}).")

    with transaction.atomic():
        event = Event.objects.create(
            event_id=generate_id(Event, 'event_id', 'EV'),
            organizer=organizer,
            status=Event.EventStatus.DRAFT,
            **data,
        )
        if categories:
            event.categories.set(categories)
        for tt in (ticket_types or []):
            TicketType.objects.create(event=event, **tt)
        return event

@transaction.atomic
def update_event(*, event, categories=None, **data):
        event = Event.objects.select_for_update().get(pk=event.pk)

        if event.status in (event.EventStatus.COMPLETED, event.EventStatus.CANCELLED):
            raise InvalidTransition("Cancelled or completed events cannot be edited.")

        # check if the new capacity is bigger than the sum of the toal tickets 
        new_capacity = data.get('capacity')
        if new_capacity is not None and new_capacity != event.capacity:
            total = event.ticket_types.aggregate(t=Sum('quantity'))['t'] or 0
            if total > new_capacity:
                raise CapacityExceeded(
                    f"Capacity ({new_capacity}) is below the total ticket type "
                    f"quantities ({total}). Reduce ticket quantities first."
                )

        for field, value in data.items():
            setattr(event, field, value)
        event.save()
        if categories is not None:
            event.categories.set(categories)
        return event