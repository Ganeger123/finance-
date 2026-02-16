from django.db import models
from django.utils import timezone
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager

class UserRole(models.TextChoices):
    SUPER_ADMIN = "super_admin", "Super Admin"
    ADMIN = "admin", "Admin"
    USER = "user", "User"

class UserStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('role', UserRole.SUPER_ADMIN)
        extra_fields.setdefault('status', UserStatus.APPROVED)
        return self.create_user(email, password, **extra_fields)

class User(AbstractBaseUser):
    email = models.EmailField(unique=True, db_index=True)
    password = models.CharField(max_length=255, db_column='hashed_password')
    full_name = models.CharField(max_length=255, null=True, blank=True)
    role = models.CharField(max_length=20, choices=UserRole.choices, default=UserRole.USER)
    status = models.CharField(max_length=20, choices=UserStatus.choices, default=UserStatus.PENDING)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    # last_login is already in AbstractBaseUser
    token_version = models.IntegerField(default=1)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    class Meta:
        db_table = 'users'
        managed = False

    def __str__(self):
        return self.email

class Workspace(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, db_index=True)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='workspaces', db_column='owner_id')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'workspaces'
        managed = False

class Vendor(models.Model):
    name = models.CharField(max_length=255, unique=True, db_index=True)
    description = models.TextField(null=True, blank=True)
    commission_rate = models.FloatField(default=0.0)
    total_commission_paid = models.FloatField(default=0.0)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'vendors'
        managed = False

class TransactionType(models.TextChoices):
    INCOME = "income", "Income"
    EXPENSE = "expense", "Expense"

class Transaction(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    amount = models.FloatField()
    category = models.CharField(max_length=255)
    type = models.CharField(max_length=20, choices=TransactionType.choices)
    date = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='transactions', db_column='user_id')
    workspace = models.ForeignKey(Workspace, on_delete=models.SET_NULL, null=True, related_name='transactions', db_column='workspace_id')
    vendor = models.ForeignKey(Vendor, on_delete=models.SET_NULL, null=True, related_name='transactions', db_column='vendor_id')

    class Meta:
        db_table = 'transactions'
        managed = False

class Income(models.Model):
    type = models.CharField(max_length=255)
    subtype = models.CharField(max_length=255, null=True, blank=True)
    amount = models.FloatField()
    student_count = models.IntegerField(default=0)
    date = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(default=timezone.now)
    
    creator = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, db_column='creator_id')
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='incomes', db_column='workspace_id')

    class Meta:
        db_table = 'incomes'
        managed = False

class Expense(models.Model):
    category = models.CharField(max_length=255)
    amount = models.FloatField()
    comment = models.TextField(null=True, blank=True)
    date = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(default=timezone.now)
    
    creator = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, db_column='creator_id')
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='expenses', db_column='workspace_id')

    class Meta:
        db_table = 'expenses'
        managed = False

class AuditLog(models.Model):
    action = models.CharField(max_length=255)
    user_email = models.CharField(max_length=255, null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    details = models.TextField(null=True, blank=True)
    timestamp = models.DateTimeField(default=timezone.now)
    
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='audit_logs', db_column='user_id')

    class Meta:
        db_table = 'audit_logs'
        managed = False

class ExpenseForm(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, db_column='workspace_id')
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'expense_forms'
        managed = False

class ExpenseField(models.Model):
    form = models.ForeignKey(ExpenseForm, on_delete=models.CASCADE, related_name='fields', db_column='form_id')
    label = models.CharField(max_length=255)
    field_type = models.CharField(max_length=50)
    required = models.BooleanField(default=False)
    options = models.JSONField(null=True, blank=True)

    class Meta:
        db_table = 'expense_fields'
        managed = False

class ExpenseEntry(models.Model):
    form = models.ForeignKey(ExpenseForm, on_delete=models.CASCADE, related_name='entries', db_column='form_id')
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, db_column='workspace_id')
    creator = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, db_column='creator_id')
    data = models.JSONField()
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'expense_entries'
        managed = False
