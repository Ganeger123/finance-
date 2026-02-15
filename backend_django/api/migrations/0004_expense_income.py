# Generated migration for Expense and Income models

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0003_workspace_expenseform_expensefield_expenseentry'),
    ]

    operations = [
        migrations.CreateModel(
            name='Expense',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('user_id', models.IntegerField(db_index=True)),
                ('workspace_id', models.IntegerField(blank=True, db_index=True, null=True)),
                ('category', models.CharField(max_length=255)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=14)),
                ('comment', models.TextField(blank=True)),
                ('date', models.DateField(db_index=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'db_table': 'expenses',
                'ordering': ['-date', '-created_at'],
            },
        ),
        migrations.CreateModel(
            name='Income',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('user_id', models.IntegerField(db_index=True)),
                ('workspace_id', models.IntegerField(blank=True, db_index=True, null=True)),
                ('type', models.CharField(max_length=255)),
                ('subtype', models.CharField(blank=True, max_length=255)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=14)),
                ('student_count', models.IntegerField(default=0)),
                ('comment', models.TextField(blank=True)),
                ('date', models.DateField(db_index=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'db_table': 'income',
                'ordering': ['-date', '-created_at'],
            },
        ),
    ]
