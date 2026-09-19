# core/utils.py
import uuid

from django.db import transaction
from django.db.models.functions import Length

# as temporary give full random unique (UUID)
def temporary_id():
    return uuid.uuid4().hex[:20]


# take the primary key of the obj and build the unique id based on that pk is always unique 
def set_id_from_pk(obj, field_name, prefix):
    setattr(obj, field_name, f"{prefix}{obj.pk:04d}")
    obj.save(update_fields=[field_name])
    return obj


# only used by ticket type as a ticket it gets unique id per event
def generate_id(model, field_name, prefix, scope=None):
    """Atomically generate the next '<prefix><n>' value for a model field.

    if a scope is given a dict is used in order to filter  exta kwargs. it
    is used for ticket type till now as it is unique per event
    """
    scope = scope or {}
    with transaction.atomic():
        qs = model.objects.select_for_update().filter(**scope)
        last = qs.order_by(Length(field_name).desc(), f'-{field_name}').values_list(field_name, flat=True).first()
        if last and last[len(prefix):].isdigit():
            n = int(last[len(prefix):]) + 1
        else:
            n = qs.count() + 1
        return f"{prefix}{n:04d}"
