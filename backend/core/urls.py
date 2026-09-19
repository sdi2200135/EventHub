# core/urls.py
from django.urls import include, path, re_path
from rest_framework.routers import DefaultRouter

from core.views import (
    BookingViewSet,
    CategoryViewSet,
    ConversationViewSet,
    CustomTokenObtainPairView,
    CustomTokenRefreshView,
    EventExportView,
    EventViewSet,
    MeView,
    MessageViewSet,
    RegisterView,
    TicketTypeViewSet,
    UserAdminViewSet,
)

router = DefaultRouter()
router.register('categories', CategoryViewSet)
router.register('events', EventViewSet, basename='event')
router.register('ticket-types', TicketTypeViewSet, basename='tickettype')
router.register('bookings', BookingViewSet, basename='booking')
router.register('messages', MessageViewSet, basename='message')
router.register('admin/users', UserAdminViewSet, basename='admin-user')
router.register('conversations', ConversationViewSet, basename='conversation')

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='login'),
    path('auth/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me/', MeView.as_view(), name='me'),
    re_path(r'^admin/events/export/(?P<file_format>xml|json)/$', EventExportView.as_view(), name='admin-event-export'),
    path('', include(router.urls)),
]
