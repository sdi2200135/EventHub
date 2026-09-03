# core/permissions.py
from rest_framework.permissions import SAFE_METHODS, BasePermission

from core.models import Event

"""""
The roles we implented are admin, guest, organizer/participant.
The user doesn't select which role, he is organizer or participant but once he is approved by the admin he can be both.
For this reason there is not anny distinction between organizer and particpant/attendee


"""
class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_admin)


class IsApprovedUser(BasePermission):
    """Defense-in-depth: gate access even for tokens issued before a later rejection."""

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        return user.is_admin or user.is_approved


# The assignment has no fixed roles: the same user may organise one event and
# book another. "Organizer" / "Participant" describe what a user is doing, not a
# stored attribute, so gating on User.is_organizer (= "has already organised an
# event") would make it impossible to ever create a first event. Ownership of a
# specific object is enforced by the object-level classes below.


class IsOrganizer(IsApprovedUser):
    pass


class IsParticipant(IsApprovedUser):
    pass


class IsEventOwnerOrReadOnly(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return bool(
            request.user
            and request.user.is_authenticated
            and (obj.organizer_id == request.user.id or request.user.is_admin)
        )


class IsTicketTypeEventOwnerOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        user = request.user
        if not (user and user.is_authenticated):
            return False
        # On create there is no object yet, so has_object_permission never runs.
        # Resolve the parent event from the URL or the body and check it here.
        event_id = (
            view.kwargs.get('event_id')
            or request.data.get('event')
            or request.data.get('event_id')
        )
        if not event_id:
            # detail routes (update/destroy): let has_object_permission decide
            return True
        try:
            event = Event.objects.get(pk=event_id)
        except (Event.DoesNotExist, ValueError, TypeError):
            return True  # let the view/serializer return 404 or 400 instead
        return event.organizer_id == user.id or user.is_admin

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return bool(
            request.user
            and request.user.is_authenticated
            and (obj.event.organizer_id == request.user.id or request.user.is_admin)
        )


class IsBookingOwnerOrEventOrganizer(BasePermission):
    def has_object_permission(self, request, view, obj):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (obj.attendee_id == user.id or obj.event.organizer_id == user.id or user.is_admin)
        )


class IsMessageParticipant(BasePermission):
    def has_object_permission(self, request, view, obj):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.id in (obj.sender_id, obj.receiver_id)
        )
