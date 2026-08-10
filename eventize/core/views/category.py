# core/views/category.py
from rest_framework import viewsets
from rest_framework.permissions import SAFE_METHODS, BasePermission

from core.models import Category
from core.permissions import IsAdmin
from core.serializers import CategorySerializer


class IsAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return IsAdmin().has_permission(request, view)


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all().order_by('name')
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnly]
