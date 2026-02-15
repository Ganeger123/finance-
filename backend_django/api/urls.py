from django.urls import path
from django.http import JsonResponse
from . import views
from . import admin_views

def auth_health(request):
    return JsonResponse({"status": "ok", "message": "Auth router is working"})

urlpatterns = [
    path('health-check', views.health_check),
    path('auth/health', auth_health),
    path('auth/login', views.login),
    path('auth/logout', views.logout),
    path('auth/register', views.register),
    path('auth/refresh', views.refresh),
    path('auth/me', views.me),
    path('auth/password-change', views.password_change),
    path('auth/password-reset', views.password_reset_request),
    path('expenses/', views.expenses_view),
    path('expenses/<int:expense_id>/', views.expense_delete),
    path('expenses/categories', views.stub_expense_categories),
    path('income/', views.income_view),
    path('income/<int:income_id>/', views.income_delete),
    path('workspaces/', views.workspaces_view),
    path('workspaces/<int:workspace_id>/', views.workspaces_delete),
    path('expense-forms/', views.expense_forms_view),
    path('expense-forms/entries', views.expense_entries_view),
    path('expense-forms/entries/<int:entry_id>', views.expense_entries_delete),
    path('notifications/', views.notifications_list),
    path('form-submit', views.form_submit),
    path('dashboard/summary', views.stub_dashboard_summary),
    path('users/', views.stub_users),
    path('vendors/', views.stub_vendors),
    path('support-tickets', views.support_ticket_create),
    # Admin-only (RBAC)
    path('admin/activity-logs', admin_views.activity_logs_list),
    path('admin/activity-logs/export', admin_views.activity_logs_export),
    path('admin/form-logs', admin_views.form_logs_list),
    path('admin/support-tickets', admin_views.support_tickets_list),
    path('admin/support-tickets/<int:ticket_id>/respond', admin_views.support_ticket_respond),
    path('admin/settings', admin_views.settings_view),
    path('admin/users', admin_views.users_list),
    path('admin/users/<int:user_id>/lock', admin_views.user_lock),
]
