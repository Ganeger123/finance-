from django.apps import AppConfig

def create_default_users(sender, **kwargs):
    from .models import User
    try:
        if not User.objects.filter(email='hachllersocials@gmail.com').exists():
            User.objects.create_superuser(
                email='hachllersocials@gmail.com',
                password='12122007',
                full_name='Administrator',
                role='super_admin',
                status='approved',
            )
        if not User.objects.filter(email='staff@finsys.ht').exists():
            User.objects.create_user(
                email='staff@finsys.ht',
                password='staff123',
                full_name='Staff User',
                role='admin',
                status='approved',
            )
    except Exception:
        pass

class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'
    verbose_name = 'API'

    def ready(self):
        from django.db.models.signals import post_migrate
        post_migrate.connect(create_default_users, sender=self)
