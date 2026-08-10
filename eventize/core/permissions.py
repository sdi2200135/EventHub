# core/permissions.py
from rest_framework.permissions import SAFE_METHODS, BasePermission

from core.models import User


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_admin())


class IsApprovedUser(BasePermission):
    """Defense-in-depth: gate access even for tokens issued before a later rejection."""

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        return user.is_superuser or user.is_staff or user.status == User.Status.APPROVED


class IsOrganizer(IsApprovedUser):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and (
            request.user.is_organizer() or request.user.is_admin()
        )


class IsParticipant(IsApprovedUser):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and (
            request.user.is_participant() or request.user.is_admin()
        )


class IsEventOwnerOrReadOnly(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return bool(
            request.user
            and request.user.is_authenticated
            and (obj.organizer_id == request.user.id or request.user.is_admin())
        )


class IsTicketTypeEventOwnerOrReadOnly(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return bool(
            request.user
            and request.user.is_authenticated
            and (obj.event.organizer_id == request.user.id or request.user.is_admin())
        )


class IsBookingOwnerOrEventOrganizer(BasePermission):
    def has_object_permission(self, request, view, obj):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (obj.attendee_id == user.id or obj.event.organizer_id == user.id or user.is_admin())
        )


class IsMessageParticipant(BasePermission):
    def has_object_permission(self, request, view, obj):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.id in (obj.sender_id, obj.recipient_id)
        )
