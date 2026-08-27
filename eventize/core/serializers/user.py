# core/serializers/user.py
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from core.models import User


class UserPublicSerializer(serializers.ModelSerializer):
    """info about what anyone can see"""
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name']


class UserSerializer(serializers.ModelSerializer):
    """user's accouunt info"""
    approval_status_display = serializers.CharField(source='get_approval_status_display', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'phone', 'address', 'city', 'country', 'afm',
            'latitude', 'longitude',
            'approval_status', 'approval_status_display', 'is_staff',
        ]
        read_only_fields = ['id', 'username', 'afm','approval_status', 'is_staff']


class UserAdminSerializer(serializers.ModelSerializer):
    """detailed user's info for admin"""
    approval_status_display = serializers.CharField(source='get_approval_status_display', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'phone', 'address', 'city', 'country', 'afm',
            'approval_status', 'approval_status_display',
            'is_active', 'is_staff', 'date_joined',
        ]
        read_only_fields = fields        #all the fields are read only


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            'username', 'password', 'password2', 'email',
            'first_name', 'last_name', 'phone', 'address',
            'city', 'country', 'afm', 'latitude', 'longitude',
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password2'):
            raise serializers.ValidationError({'password2': 'Passwords do not match.'})
        validate_password(attrs['password'])
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        validated_data['email']=User.objects.normalize_email(validated_data['email'])
        user = User(**validated_data, approval_status=User.Status.PENDING)
        user.set_password(password)
        user.save()
        return user