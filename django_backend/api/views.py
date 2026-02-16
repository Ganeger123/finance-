import logging
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, permissions, status, response
from rest_framework.decorators import action
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.utils import timezone

from .models import (
    User, Transaction, Income, Expense, Workspace, Vendor, 
    AuditLog, ExpenseForm, ExpenseField, ExpenseEntry, 
    UserRole, UserStatus
)
from .serializers import (
    UserSerializer, TransactionSerializer, IncomeSerializer, 
    ExpenseSerializer, WorkspaceSerializer, VendorSerializer, 
    AuditLogSerializer, ExpenseFormSerializer, ExpenseEntrySerializer
)

logger = logging.getLogger(__name__)

# --- Authentication ---

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add custom claims matching FastAPI payload
        token['sub'] = user.email
        token['role'] = user.role
        token['status'] = user.status
        token['version'] = user.token_version
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        # Match FastAPI response format
        data['access_token'] = data.pop('access')
        data['refresh_token'] = data.pop('refresh')
        data['token_type'] = 'bearer'
        
        # Log login
        user = self.user
        user.last_login = timezone.now()
        user.save()
        
        AuditLog.objects.create(
            action="LOGIN",
            user_email=user.email,
            user=user,
            timestamp=timezone.now()
        )
        
        return data

class LoginView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

from .services import EmailService, AuditService

# --- ViewSets ---

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def get_permissions(self):
        if self.action == 'register':
            return [permissions.AllowAny()]
        return super().get_permissions()

    @action(detail=False, methods=['post'])
    def register(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save(status=UserStatus.PENDING, role=UserRole.USER)
        
        # Log audit
        AuditService.log_action(user, "REGISTER", f"User {user.email} registered", request.META.get('REMOTE_ADDR'))
        
        # Send email (async wait would be better but let's stick to sync for simplicity and parity)
        EmailService.send_welcome_email(user.email, user.full_name)
        
        return response.Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return response.Response(serializer.data)

class WorkspaceViewSet(viewsets.ModelViewSet):
    queryset = Workspace.objects.all()
    serializer_class = WorkspaceSerializer

    def get_queryset(self):
        return self.queryset.filter(owner=self.request.user)

from django.db.models import Sum

class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.all()
    serializer_class = TransactionSerializer

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        user_id = request.user.id
        income = Transaction.objects.filter(user_id=user_id, type='income').aggregate(total=Sum('amount'))['total'] or 0.0
        expense = Transaction.objects.filter(user_id=user_id, type='expense').aggregate(total=Sum('amount'))['total'] or 0.0
        
        return Response({
            "total_income": income,
            "total_expense": expense,
            "balance": income - expense
        })

class DashboardViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]
    
    def list(self, request):
        user_id = request.user.id
        income = Transaction.objects.filter(user_id=user_id, type='income').aggregate(total=Sum('amount'))['total'] or 0.0
        expense = Transaction.objects.filter(user_id=user_id, type='expense').aggregate(total=Sum('amount'))['total'] or 0.0
        
        # Also include recent transactions or other stats
        return Response({
            "income": income,
            "expense": expense,
            "profit": income - expense
        })

class IncomeViewSet(viewsets.ModelViewSet):
    queryset = Income.objects.all()
    serializer_class = IncomeSerializer

    def get_queryset(self):
        return self.queryset.filter(creator=self.request.user)

    def perform_create(self, serializer):
        serializer.save(creator=self.request.user)

class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer

    def get_queryset(self):
        return self.queryset.filter(creator=self.request.user)

    def perform_create(self, serializer):
        serializer.save(creator=self.request.user)

class VendorViewSet(viewsets.ModelViewSet):
    queryset = Vendor.objects.all()
    serializer_class = VendorSerializer

class ExpenseFormViewSet(viewsets.ModelViewSet):
    queryset = ExpenseForm.objects.all()
    serializer_class = ExpenseFormSerializer

class ExpenseEntryViewSet(viewsets.ModelViewSet):
    queryset = ExpenseEntry.objects.all()
    serializer_class = ExpenseEntrySerializer
    
    def perform_create(self, serializer):
        serializer.save(creator=self.request.user)

# --- Health Check ---
from rest_framework.views import APIView
from rest_framework.response import Response

class HealthCheckView(APIView):
    permission_classes = [permissions.AllowAny]
    def get(self, request):
        return Response({"status": "healthy"})
