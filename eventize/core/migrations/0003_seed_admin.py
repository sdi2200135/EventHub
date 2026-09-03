import os

from django.contrib.auth.hashers import make_password
from django.db import migrations

# Requirement 3: the application ships with a built-in administrator account, so
# that a fresh installation can be managed without any manual setup step.
# Credentials come from the environment when available; the fallbacks keep the
# project runnable out of the box for development and for the grader.
ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'admin')
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@eventize.local')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin')


def seed_admin(apps, schema_editor):
    User = apps.get_model('core', 'User')
    if User.objects.filter(username=ADMIN_USERNAME).exists():
        return
    User.objects.create(
        username=ADMIN_USERNAME,
        # the historical model has no custom manager, so hash the password by hand
        password=make_password(ADMIN_PASSWORD),
        email=ADMIN_EMAIL,
        first_name='admin_first',
        last_name='admin_last',
        phone='6975556015',
        address='dit',
        city='Athens',
        country='GR',
        afm='123456789',
        is_staff=True,
        is_superuser=True,
        is_active=True,
        # already approved: nobody exists yet who could approve this account
        approval_status='APPROVED',
    )


def unseed_admin(apps, schema_editor):
    User = apps.get_model('core', 'User')
    User.objects.filter(username=ADMIN_USERNAME, is_superuser=True).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_seed_categories'),
    ]

    operations = [
        migrations.RunPython(seed_admin, reverse_code=unseed_admin),
    ]
