# core/filters.py
import django_filters

from core.models import Event


class EventFilter(django_filters.FilterSet):
    category = django_filters.NumberFilter(field_name='categories__id')
    start_after = django_filters.DateTimeFilter(field_name='start_datetime', lookup_expr='gte')
    start_before = django_filters.DateTimeFilter(field_name='start_datetime', lookup_expr='lte')
    # declared so they show up as query params, but applied together in filter_queryset
    # so both bounds land on the SAME ticket type instead of one bound each on different ones
    min_price = django_filters.NumberFilter(method='noop')
    max_price = django_filters.NumberFilter(method='noop')

    class Meta:
        model = Event
        fields = ['category', 'city', 'country', 'event_type', 'start_after', 'start_before', 'min_price', 'max_price']

    def noop(self, queryset, name, value):
        return queryset

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)

        min_price = self.form.cleaned_data.get('min_price')
        max_price = self.form.cleaned_data.get('max_price')
        price_conditions = {}
        if min_price is not None:
            price_conditions['ticket_types__price__gte'] = min_price
        if max_price is not None:
            price_conditions['ticket_types__price__lte'] = max_price
        if price_conditions:
            queryset = queryset.filter(**price_conditions)

        # joins across categories/ticket_types duplicate the parent event row
        return queryset.distinct()
