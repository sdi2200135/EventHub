# core/serializers/user.py
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from core.models import User


class UserPublicSerializer(serializers.ModelSerializer):
    """info about what anyone can see"""
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name']

class UserSerializer(serializers.ModelSerializer):
    """user's account info"""
    approval_status_display = serializers.CharField(source='get_approval_status_display', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'phone', 'address', 'city', 'country', 'afm',
            'latitude', 'longitude',
            'approval_status', 'approval_status_display', 'is_staff',
        ]
        # email cannot be changed after registration
        read_only_fields = ['id', 'username', 'afm','approval_status', 'is_staff','email']

    # make sure the pair longitude lataitude is given
    def validate(self, attrs):
        lat = attrs.get('latitude', getattr(self.instance, 'latitude', None))
        lon = attrs.get('longitude', getattr(self.instance, 'longitude', None))
        if (lat is None) != (lon is None):
            raise serializers.ValidationError(
                {'longitude': 'Latitude and longitude must be provided together.'}
            )
        return attrs


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
        read_only_fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'phone', 'address', 'city', 'country', 'afm',
            'approval_status', 
            'is_active', 'is_staff', 'date_joined',
        ]       


class RegisterSerializer(serializers.ModelSerializer):
    # Public sign-up. New accounts start as PENDING and need admin approval.

    # passwords are enabled with trim whitespace from end and beginning
    password = serializers.CharField(write_only=True)
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            'username', 'password', 'password2', 'email',
            'first_name', 'last_name', 'phone', 'address',
            'city', 'country', 'afm', 'latitude', 'longitude',
        ]

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value

    def validate(self, attrs):
        # make sure the 2 passwords match
        password = attrs['password']
        password2 = attrs.pop('password2')
        if password != password2:
            raise serializers.ValidationError({'password2': 'Passwords do not match.'})

        # check the longitude latitude is given as a pair 
        lat = attrs.get('latitude')
        lon = attrs.get('longitude')
        if (lat is None) != (lon is None):
            raise serializers.ValidationError(
                {'longitude': 'Latitude and longitude must be provided together.'}
            )

        unsaved = User(
            username=attrs.get('username'),
            email=attrs.get('email', ''),
            first_name=attrs.get('first_name', ''),
            last_name=attrs.get('last_name', ''),
        )
        try:
            validate_password(password, user=unsaved)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({'password': list(exc.messages)})
        return attrs

    # save user 
    def create(self, validated_data):
        password = validated_data.pop('password')
        validated_data['email']=User.objects.normalize_email(validated_data['email'])
        user = User(**validated_data, approval_status=User.Status.PENDING)
        user.set_password(password)
        user.save()
        return user