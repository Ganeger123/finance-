# Generated migration for ActivityLog, FormLog, SupportTicket, AdminSettings, User.is_locked

from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='is_locked',
            field=models.BooleanField(default=False),
        ),
        migrations.CreateModel(
            name='ActivityLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('user_id', models.IntegerField(blank=True, db_index=True, null=True)),
                ('user_email', models.CharField(blank=True, max_length=255)),
                ('user_name', models.CharField(blank=True, max_length=255)),
                ('action', models.CharField(db_index=True, max_length=50)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('device', models.CharField(blank=True, max_length=500)),
                ('status', models.CharField(db_index=True, default='Success', max_length=20)),
                ('details', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
            ],
            options={
                'db_table': 'activity_logs',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='FormLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('user_id', models.IntegerField(db_index=True)),
                ('user_email', models.CharField(blank=True, max_length=255)),
                ('form_name', models.CharField(max_length=255)),
                ('data_summary', models.TextField(blank=True)),
                ('submitted_at', models.DateTimeField(auto_now_add=True, db_index=True)),
            ],
            options={
                'db_table': 'form_logs',
                'ordering': ['-submitted_at'],
            },
        ),
        migrations.CreateModel(
            name='SupportTicket',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('user_id', models.IntegerField(db_index=True)),
                ('user_email', models.CharField(blank=True, max_length=255)),
                ('message', models.TextField()),
                ('status', models.CharField(db_index=True, default='open', max_length=20)),
                ('admin_reply', models.TextField(blank=True)),
                ('replied_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
            ],
            options={
                'db_table': 'support_tickets',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='AdminSettings',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('key', models.CharField(db_index=True, max_length=100, unique=True)),
                ('value', models.TextField(blank=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'admin_settings',
            },
        ),
    ]
