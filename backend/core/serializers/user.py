# core/serializers/user.py
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from core.models import User

from decimal import ROUND_HALF_UP, Decimal

class UserPublicSerializer(serializers.ModelSerializer):
    """info about what anyone can see"""
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name','email']

class UserSerializer(serializers.ModelSerializer):
    """user's account info"""
    approval_status_display = serializers.CharField(source='get_approval_status_display', read_only=True)
    latitude = serializers.DecimalField(max_digits=None, decimal_places=None, required=False, allow_null=True)
    longitude = serializers.DecimalField(max_digits=None, decimal_places=None, required=False, allow_null=True)
    new_password = serializers.CharField(write_only=True, required=False)
    current_password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'phone', 'address', 'city', 'country', 'afm',
            'latitude', 'longitude',
            'approval_status', 'approval_status_display', 'is_staff',
            'new_password','current_password'
        ]
        # email cannot be changed after registration
        read_only_fields = ['id', 'username', 'afm','approval_status', 'is_staff','email']

    def validate_new_password(self, value):
        try:
            validate_password(value, user=self.instance)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value
    
    # make sure the pair longitude lataitude is given
    def validate(self, attrs):
        # check if the current password matches the existing one 
        if attrs.get('new_password'):
            current = attrs.pop('current_password', None)
            if not current or not self.instance.check_password(current):
                raise serializers.ValidationError({'current_password': 'Your current password is not correct.'})
            
        lat = attrs.get('latitude', getattr(self.instance, 'latitude', None))
        lon = attrs.get('longitude', getattr(self.instance, 'longitude', None))
        if (lat is None) != (lon is None):
            raise serializers.ValidationError(
                {'longitude': 'Latitude and longitude must be provided together.'}
            )
        
        # check lat long range and round to 5 decimal
        if lat is not None:
            if not -90 <= lat <= 90:
                raise serializers.ValidationError({'latitude': 'Latitude must be from -90 to 90.'})
            if not -180 <= lon <= 180:
                raise serializers.ValidationError({'longitude': 'Longitude must be from -180 to 180.'})
            for field in ('latitude', 'longitude'):
                if attrs.get(field) is not None:
                    attrs[field] = attrs[field].quantize(Decimal('0.00001'), rounding=ROUND_HALF_UP)
        return attrs

    # in order to update a race condtion canbe created if user edits his info and admin approve the user 
    # so in order to solve that write only what the request included, ofc not the apporval status
    def update(self, instance, validated_data):
        new_password = validated_data.pop('new_password', None)
        validated_data.pop('current_password', None)

        for field, value in validated_data.items():
            setattr(instance, field, value)
        fields = list(validated_data.keys())

        if new_password:
            instance.set_password(new_password)
            fields.append('password')

        instance.save(update_fields=fields)
        return instance

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
    latitude = serializers.DecimalField(max_digits=None, decimal_places=None, required=False, allow_null=True)
    longitude = serializers.DecimalField(max_digits=None, decimal_places=None, required=False, allow_null=True)
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
            raise serializers.ValidationError('Passwords do not match.')

        # check the longitude latitude is given as a pair 
        lat = attrs.get('latitude')
        lon = attrs.get('longitude')
        if (lat is None) != (lon is None):
            raise serializers.ValidationError(
                {'longitude': 'Latitude and longitude must be provided together.'}
            )
        
        # check lat long range and round to 5 decimal
        if lat is not None:
            if not -90 <= lat <= 90:
                raise serializers.ValidationError({'latitude': 'Latitude must be between -90 and 90.'})
            if not -180 <= lon <= 180:
                raise serializers.ValidationError({'longitude': 'Longitude must be between -180 and 180.'})
            for field in ('latitude', 'longitude'):
                if attrs.get(field) is not None:
                    attrs[field] = attrs[field].quantize(Decimal('0.00001'), rounding=ROUND_HALF_UP)

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