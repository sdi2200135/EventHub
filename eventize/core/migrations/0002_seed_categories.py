from django.db import migrations
from django.utils.text import slugify

CATEGORIES = [
    'Music',
    'Theater',
    'Sports',
    'Conference',
    'Seminar',
    'Arts & Culture',
    'Technology',
    'Food & Drink',
    'Community',
    'Charity',
]


def seed_categories(apps, schema_editor):
    Category = apps.get_model('core', 'Category')
    for name in CATEGORIES:
        if Category.objects.filter(name=name).exists():
            continue
        Category.objects.create(
            name=name,
            slug=slugify(name, allow_unicode=True),
        )


def unseed_categories(apps, schema_editor):
    Category = apps.get_model('core', 'Category')
    Category.objects.filter(name__in=CATEGORIES).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_categories, reverse_code=unseed_categories),
    ]
