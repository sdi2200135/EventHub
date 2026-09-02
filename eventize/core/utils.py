# core/utils.py
from django.db import transaction

# 
def generate_id(model, field_name, prefix, scope=None):
    """Atomically generate the next '<prefix><n>' value for a model field.

    scope, if given, is a dict of extra filter kwargs (e.g. {'event': event})
    for models where the id field is only unique within a parent (TicketType).
    """
    scope = scope or {}
    with transaction.atomic():
        qs = model.objects.select_for_update().filter(**scope)
        last = qs.order_by(f'-{field_name}').values_list(field_name, flat=True).first()
        if last and last[len(prefix):].isdigit():
            n = int(last[len(prefix):]) + 1
        else:
            n = qs.count() + 1
        return f"{prefix}{n:04d}"
