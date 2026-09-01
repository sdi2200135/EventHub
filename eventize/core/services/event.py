# core/services/events.py
from django.db import transaction
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


def update_event(*, event, categories=None, **data):
    if event.status == Event.EventStatus.CANCELLED:
        raise InvalidTransition("Cancelled events cannot be edited.")

    with transaction.atomic():
        for field, value in data.items():
            setattr(event, field, value)
        event.save()
        if categories is not None:
            event.categories.set(categories)
        return event