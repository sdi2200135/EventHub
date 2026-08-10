# core/serializers/user.py
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from core.models import User


class UserPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'role']


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'phone', 'address', 'city', 'country', 'afm',
            'role', 'status',
        ]
        read_only_fields = ['id', 'username', 'role', 'status']


class UserAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'phone', 'address', 'city', 'country', 'afm',
            'role', 'status', 'is_active', 'date_joined',
        ]
        read_only_fields = ['id', 'username', 'date_joined']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    password2 = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(
        choices=[
            (User.Role.ORGANIZER, User.Role.ORGANIZER.label),
            (User.Role.PARTICIPANT, User.Role.PARTICIPANT.label),
        ],
        default=User.Role.PARTICIPANT,
    )

    class Meta:
        model = User
        fields = [
            'username', 'password', 'password2', 'email',
            'first_name', 'last_name', 'phone', 'address',
            'city', 'country', 'afm', 'role',
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password2'):
            raise serializers.ValidationError({'password2': 'Passwords do not match.'})
        validate_password(attrs['password'])
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data, status=User.Status.PENDING)
        user.set_password(password)
        user.save()
        return user
