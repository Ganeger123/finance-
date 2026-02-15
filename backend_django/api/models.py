from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **kwargs):
        if not email:
            raise ValueError('Email required')
        email = self.normalize_email(email)
        user = self.model(email=email, **kwargs)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **kwargs):
        kwargs.setdefault('role', 'super_admin')
        kwargs.setdefault('status', 'approved')
        kwargs.setdefault('is_staff', True)
        kwargs.setdefault('is_superuser', True)
        return self.create_user(email, password, **kwargs)

class User(AbstractUser):
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = UserManager()

    email = models.EmailField(unique=True)
    username = None
    full_name = models.CharField(max_length=255, blank=True, null=True)
    role = models.CharField(max_length=20, default='user')  # super_admin, admin, user
    status = models.CharField(max_length=20, default='pending')
    token_version = models.IntegerField(default=1)
    is_locked = models.BooleanField(default=False)

    class Meta:
        db_table = 'api_user'

    def __str__(self):
        return self.email

    @property
    def is_admin(self):
        return self.role in ('admin', 'super_admin')


class ActivityLog(models.Model):
    """Audit trail: cannot be deleted. Logs LOGIN, LOGOUT, PASSWORD_RESET, PASSWORD_CHANGED, FORM_SUBMITTED, etc."""
    user_id = models.IntegerField(null=True, blank=True, db_index=True)
    user_email = models.CharField(max_length=255, blank=True)
    user_name = models.CharField(max_length=255, blank=True)
    action = models.CharField(max_length=50, db_index=True)  # LOGIN, LOGOUT, PASSWORD_RESET, PASSWORD_CHANGED, FORM_SUBMITTED, LOGIN_FAILED
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    device = models.CharField(max_length=500, blank=True)
    status = models.CharField(max_length=20, default='Success', db_index=True)  # Success, Failed
    details = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'activity_logs'
        ordering = ['-created_at']
        verbose_name = 'Activity Log'
        verbose_name_plural = 'Activity Logs'


class FormLog(models.Model):
    """Track every form submission for admin dashboard."""
    user_id = models.IntegerField(db_index=True)
    user_email = models.CharField(max_length=255, blank=True)
    form_name = models.CharField(max_length=255)
    data_summary = models.TextField(blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'form_logs'
        ordering = ['-submitted_at']


class SupportTicket(models.Model):
    STATUS_OPEN = 'open'
    STATUS_CLOSED = 'closed'
    STATUS_CHOICES = [(STATUS_OPEN, 'Open'), (STATUS_CLOSED, 'Closed')]

    user_id = models.IntegerField(db_index=True)
    user_email = models.CharField(max_length=255, blank=True)
    message = models.TextField()
    status = models.CharField(max_length=20, default=STATUS_OPEN, choices=STATUS_CHOICES, db_index=True)
    admin_reply = models.TextField(blank=True)
    replied_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'support_tickets'
        ordering = ['-created_at']


class AdminSettings(models.Model):
    """Key-value settings: email_alerts_enabled, password_min_length, etc."""
    key = models.CharField(max_length=100, unique=True, db_index=True)
    value = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'admin_settings'

    @classmethod
    def get(cls, key, default=None):
        try:
            return cls.objects.get(key=key).value
        except cls.DoesNotExist:
            return default

    @classmethod
    def set(cls, key, value):
        obj, _ = cls.objects.get_or_create(key=key, defaults={'value': str(value)})
        obj.value = str(value)
        obj.save()


class Workspace(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    owner_id = models.IntegerField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'workspaces'
        ordering = ['name']


class ExpenseForm(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    workspace_id = models.IntegerField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'expense_forms'
        ordering = ['name']


class ExpenseField(models.Model):
    form_id = models.IntegerField(db_index=True)
    label = models.CharField(max_length=255)
    field_type = models.CharField(max_length=20, default='text')  # text, number, date, select
    required = models.BooleanField(default=False)
    options = models.JSONField(null=True, blank=True)  # for select

    class Meta:
        db_table = 'expense_fields'
        ordering = ['id']


class ExpenseEntry(models.Model):
    form_id = models.IntegerField(db_index=True)
    workspace_id = models.IntegerField(db_index=True)
    creator_id = models.IntegerField(db_index=True)
    data = models.JSONField(default=dict)  # { field_id: value }
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'expense_entries'
        ordering = ['-created_at']


class Expense(models.Model):
    """Simple expense record (category, amount, comment)."""
    user_id = models.IntegerField(db_index=True)
    workspace_id = models.IntegerField(null=True, blank=True, db_index=True)
    category = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    comment = models.TextField(blank=True)
    date = models.DateField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'expenses'
        ordering = ['-date', '-created_at']


class Income(models.Model):
    """Income record (type, amount, students, etc.)."""
    user_id = models.IntegerField(db_index=True)
    workspace_id = models.IntegerField(null=True, blank=True, db_index=True)
    type = models.CharField(max_length=255)  # e.g. FORMATION_CAMERA, PLATFORM
    subtype = models.CharField(max_length=255, blank=True)  # e.g. INSCRIPTION, PARTICIPATION
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    student_count = models.IntegerField(default=0)
    comment = models.TextField(blank=True)
    date = models.DateField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'income'
        ordering = ['-date', '-created_at']
