from rest_framework import serializers
from .models import User, Transaction, Income, Expense, Workspace, Vendor, AuditLog, ExpenseForm, ExpenseField, ExpenseEntry

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'role', 'status', 'is_active', 'created_at', 'updated_at', 'password']

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

class WorkspaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workspace
        fields = '__all__'

class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = '__all__'

class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = '__all__'

class IncomeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Income
        fields = '__all__'

class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = '__all__'

class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = '__all__'

class ExpenseFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseField
        fields = '__all__'

class ExpenseFormSerializer(serializers.ModelSerializer):
    fields = ExpenseFieldSerializer(many=True, read_only=True)
    
    class Meta:
        model = ExpenseForm
        fields = ['id', 'name', 'description', 'workspace', 'created_at', 'fields']

class ExpenseEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseEntry
        fields = '__all__'
