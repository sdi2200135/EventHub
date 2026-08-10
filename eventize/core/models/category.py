# core/models/category.py

from django.db import models
from django.utils.text import slugify

class Category(models.Model):
    # name
    name = models.CharField(max_length=100, unique=True)
    # slug as we want the category name to be part of the url
    slug = models.SlugField(max_length=120, unique=True, blank=True, allow_unicode=True)

    class Meta:
        verbose_name_plural = "Categories"
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name, allow_unicode=True)
        return super().save(*args, **kwargs)

    def __str__(self):
        return self.name