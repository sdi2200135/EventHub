# core/services/conv_mess.py
from django.db import transaction
from core.models import Conversation, Message

# delete message or conversations it works with this logic:
# soft delete if both of the participants have deleted then it is permanently deleted from db
# use atomic due to race condition if both participants delete at the same time

@transaction.atomic
def delete_conversation_for_organizer(*, conversation_id, user):
    conv = Conversation.objects.select_for_update().get(pk=conversation_id)
    if conv.organizer_id != user.id:
        raise PermissionError("Only the organizer can delete this conversation for themselves.")
    conv.deleted_by_organizer = True
    conv.save(update_fields=['deleted_by_organizer'])
    if conv.deleted_by_attendee:
        conv.delete()
        return None
    return conv

@transaction.atomic
def delete_conversation_for_attendee(*, conversation_id, user):
    conv = Conversation.objects.select_for_update().get(pk=conversation_id)
    if conv.attendee_id != user.id:
        raise PermissionError("Only the attendee can delete this conversation for themselves.")
    conv.deleted_by_attendee = True
    conv.save(update_fields=['deleted_by_attendee'])
    if conv.deleted_by_organizer:
        conv.delete()
        return None
    return conv


@transaction.atomic
def delete_message_for_sender(*, message_id, user):
    mess = Message.objects.select_for_update().get(pk=message_id)
    if mess.sender_id != user.id:
        raise PermissionError("Only the sender can delete this message for themselves.")
    mess.deleted_by_sender = True
    mess.save(update_fields=['deleted_by_sender'])
    if mess.deleted_by_receiver:
        mess.delete()
        return None
    return mess

@transaction.atomic
def delete_message_for_receiver(*, message_id, user):
    mess = Message.objects.select_for_update().get(pk=message_id)
    if mess.receiver_id != user.id:
        raise PermissionError("Only the receiver can delete this message for themselves.")
    mess.deleted_by_receiver = True
    mess.save(update_fields=['deleted_by_receiver'])
    if mess.deleted_by_sender:
        mess.delete()
        return None
    return mess