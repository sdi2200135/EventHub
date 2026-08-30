# core/serializers/category.py
from rest_framework import serializers

from core.models import Category
from django.utils.text import slugify


class CategorySerializer(serializers.ModelSerializer):
    slug = serializers.SlugField(read_only=True)

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug']

    def validate_name(self, value):
        slug = slugify(value, allow_unicode=True)
        qs = Category.objects.filter(slug=slug)
        # in order to update change existing slug
        # exclude self so editing without a name change doesn't collide with its own slug
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        # check if a similar slug exists 
        if qs.exists():
            raise serializers.ValidationError('A category with a similar name exists.')
        return value