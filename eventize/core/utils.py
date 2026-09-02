# core/utils.py
from django.db import transaction

# 
def generate_id(model, field_name, prefix, scope=None):
    """Atomically generate the next '<prefix><n>' value for a model field.

    if a scope is given a dict is used in order to filter  exta kwargs. it
    is used for ticket type till now as it is unique per event
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
