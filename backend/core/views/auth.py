# core/views/auth.py
from rest_framework import generics, serializers
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from django.contrib.auth.models import update_last_login
from core.models import User
from core.permissions import IsApprovedUser
from core.serializers import RegisterSerializer, UserSerializer


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


# log in
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        if not (user.is_superuser or user.is_staff or user.approval_status == User.Status.APPROVED):
            if user.approval_status == User.Status.PENDING:
                detail = 'Account is pending approval by admin.'
            else:
                detail = 'Your account registration was rejected.'
            raise serializers.ValidationError({'detail': detail})
        update_last_login(None, user)

        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class CustomTokenRefreshSerializer(TokenRefreshSerializer):
    # we use a custon token refresh serilizer cause we want on every refresh of token to check the status of approval by admin
    # otherwise the user can be rejected but still getting the token as the REFRESH_TOKEN_LIFETIME is 7 days
    def validate(self, attrs):
        token = RefreshToken(attrs['refresh'])
        user = User.objects.filter(
            **{api_settings.USER_ID_FIELD: token.get(api_settings.USER_ID_CLAIM)}
        ).first()
        if user is None or not (user.is_admin or user.is_approved):
            raise serializers.ValidationError(
                {'detail': 'Account is not approved.'}
            )
        return super().validate(attrs)


class CustomTokenRefreshView(TokenRefreshView):
    serializer_class = CustomTokenRefreshSerializer


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsApprovedUser]

    def get_object(self):
        return self.request.user
