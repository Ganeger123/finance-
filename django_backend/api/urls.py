from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LoginView, UserViewSet, WorkspaceViewSet, TransactionViewSet, 
    IncomeViewSet, ExpenseViewSet, VendorViewSet, ExpenseFormViewSet, 
    ExpenseEntryViewSet, HealthCheckView, DashboardViewSet
)
from rest_framework_simplejwt.views import TokenRefreshView

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'workspaces', WorkspaceViewSet)
router.register(r'transactions', TransactionViewSet)
router.register(r'income', IncomeViewSet)
router.register(r'expenses', ExpenseViewSet)
router.register(r'dashboard', DashboardViewSet, basename='dashboard')
router.register(r'vendors', VendorViewSet)
router.register(r'expense-forms', ExpenseFormViewSet)
router.register(r'expense-entries', ExpenseEntryViewSet)

urlpatterns = [
    path('auth/login', LoginView.as_view(), name='login'),
    path('auth/register', UserViewSet.as_view({'post': 'register'}), name='register'),
    path('auth/refresh', TokenRefreshView.as_view(), name='token_refresh'),
    path('health-check', HealthCheckView.as_view(), name='health_check'),
    path('', include(router.urls)),
]
