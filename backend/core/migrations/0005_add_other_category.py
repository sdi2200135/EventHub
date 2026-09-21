from django.db import migrations
from django.utils.text import slugify

# a catch-all category for events that fit none of the seeded ones
NAME = 'Other'


def add_other_category(apps, schema_editor):
    Category = apps.get_model('core', 'Category')
    # the admin may already have created it by hand, so don't add it twice
    Category.objects.get_or_create(
        slug=slugify(NAME, allow_unicode=True),
        defaults={'name': NAME},
    )


def remove_other_category(apps, schema_editor):
    Category = apps.get_model('core', 'Category')
    # only while no event uses it, so reversing never strips an event's category
    Category.objects.filter(name=NAME, events__isnull=True).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0004_alter_eventphoto_image'),
    ]

    operations = [
        migrations.RunPython(add_other_category, reverse_code=remove_other_category),
    ]
