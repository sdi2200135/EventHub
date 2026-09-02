# core/urls.py
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from core.views import (
    BookingViewSet,
    CategoryViewSet,
    ConversationViewSet,
    CustomTokenObtainPairView,
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
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me/', MeView.as_view(), name='me'),
    path('', include(router.urls)),
]
