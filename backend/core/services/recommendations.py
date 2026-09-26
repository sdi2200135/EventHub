# core/services/recommendations.py

import threading
from datetime import timedelta

from django.db.models import Count, Max
from django.utils import timezone

from core.models import Booking, EventView
from core.services.helper_recommendations import BiasedMF, build_interactions
# =================================
#     Live model
# =================================

# training on every request is not an option as the response would delay the response.
# the trained model is kept in memory and rebuilt every time there is an interaction which make a difference
# or when TTL expires

CACHE_TTL = timedelta(minutes=10)

_lock = threading.Lock()
_cache = {'model': None, 'fingerprint': None, 'trained_at': None}

# get users' interactions bookings and views
def _fingerprint():
    views = EventView.objects.aggregate(n=Count('pk'), last=Max('last_viewed_at'))
    bookings = Booking.objects.filter(status=Booking.BookingStatus.CONFIRMED).aggregate(n=Count('pk'), last=Max('created_at'))
    return (views['n'], views['last'], bookings['n'], bookings['last'])

# model trained on site's own data rebuilt only when it has to
def get_model():
    fingerprint = _fingerprint()
    with _lock:
        model = _cache['model']
        if (model is not None
                and _cache['fingerprint'] == fingerprint
                and timezone.now() - _cache['trained_at'] < CACHE_TTL):
            return model

        model = BiasedMF().fit(build_interactions())
        _cache.update(model=model, fingerprint=fingerprint, trained_at=timezone.now())
        return model

# return the recommended events 
def rank_event_ids(user_id, event_ids):
    model = get_model()
    # ties break on id, so the order stays stable between pages instead of
    # shifting from one request to the next
    return sorted(event_ids,
                  key=lambda event_id: (-model.predict(user_id, event_id), event_id))