# core/filters.py
import django_filters

from core.models import Event


class EventFilter(django_filters.FilterSet):
    category = django_filters.NumberFilter(field_name='categories__id')
    start_after = django_filters.DateTimeFilter(field_name='start_datetime', lookup_expr='gte')
    start_before = django_filters.DateTimeFilter(field_name='start_datetime', lookup_expr='lte')
    min_price = django_filters.NumberFilter(field_name='ticket_types__price', lookup_expr='gte')
    max_price = django_filters.NumberFilter(field_name='ticket_types__price', lookup_expr='lte')

    class Meta:
        model = Event
        fields = ['category', 'city', 'country', 'event_type', 'start_after', 'start_before', 'min_price', 'max_price']
