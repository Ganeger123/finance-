"""Admin-only API: activity logs, form logs, support tickets, settings, export. RBAC: only Admin can access."""
import csv
import json
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from django.core.paginator import Paginator

from .models import ActivityLog, FormLog, SupportTicket, AdminSettings, User
from .views import _get_user_from_request
from .services import get_client_ip, get_user_agent, log_activity, send_alert_to_admin

def require_admin(view_func):
    """Decorator: require JWT and role in (admin, super_admin)."""
    def wrapped(request, *args, **kwargs):
        user = _get_user_from_request(request)
        if not user:
            return JsonResponse({"detail": "Not authenticated"}, status=401)
        if user.role not in ('admin', 'super_admin'):
            return JsonResponse({"detail": "Admin privileges required"}, status=403)
        if user.is_locked or not user.is_active:
            return JsonResponse({"detail": "Account locked or inactive"}, status=403)
        request.admin_user = user
        return view_func(request, *args, **kwargs)
    return wrapped


@require_http_methods(["GET"])
@require_admin
def activity_logs_list(request):
    action = request.GET.get("action", "").strip()
    status_filter = request.GET.get("status", "").strip()
    user_id = request.GET.get("user_id", "").strip()
    page = int(request.GET.get("page", 1))
    page_size = min(int(request.GET.get("page_size", 20)), 100)
    qs = ActivityLog.objects.all().order_by("-created_at")
    if action:
        qs = qs.filter(action=action)
    if status_filter:
        qs = qs.filter(status=status_filter)
    if user_id:
        qs = qs.filter(user_id=user_id)
    paginator = Paginator(qs, page_size)
    page_obj = paginator.get_page(page)
    items = [
        {
            "id": log.id,
            "user_id": log.user_id,
            "user_email": log.user_email,
            "user_name": log.user_name,
            "action": log.action,
            "ip_address": str(log.ip_address) if log.ip_address else "",
            "device": log.device,
            "status": log.status,
            "details": log.details,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in page_obj
    ]
    return JsonResponse({
        "logs": items,
        "total": paginator.count,
        "page": page,
        "page_size": page_size,
    })


@require_http_methods(["GET"])
@require_admin
def activity_logs_export(request):
    format_type = request.GET.get("format", "csv").lower()
    qs = ActivityLog.objects.all().order_by("-created_at")[:10000]
    if format_type == "csv":
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="activity_logs.csv"'
        w = csv.writer(response)
        w.writerow(["id", "user_id", "user_email", "user_name", "action", "ip_address", "device", "status", "details", "created_at"])
        for log in qs:
            w.writerow([log.id, log.user_id, log.user_email, log.user_name, log.action, log.ip_address, log.device, log.status, log.details, log.created_at])
        return response
    return JsonResponse({"detail": "format=csv supported"}, status=400)


@require_http_methods(["GET"])
@require_admin
def form_logs_list(request):
    page = int(request.GET.get("page", 1))
    page_size = min(int(request.GET.get("page_size", 20)), 100)
    qs = FormLog.objects.all().order_by("-submitted_at")
    paginator = Paginator(qs, page_size)
    page_obj = paginator.get_page(page)
    items = [
        {
            "id": log.id,
            "user_id": log.user_id,
            "user_email": log.user_email,
            "form_name": log.form_name,
            "data_summary": log.data_summary,
            "submitted_at": log.submitted_at.isoformat() if log.submitted_at else None,
        }
        for log in page_obj
    ]
    return JsonResponse({
        "logs": items,
        "total": paginator.count,
        "page": page,
        "page_size": page_size,
    })


@require_http_methods(["GET", "POST"])
@require_admin
def support_tickets_list(request):
    if request.method == "GET":
        status_filter = request.GET.get("status", "").strip()
        page = int(request.GET.get("page", 1))
        page_size = min(int(request.GET.get("page_size", 20)), 100)
        qs = SupportTicket.objects.all().order_by("-created_at")
        if status_filter:
            qs = qs.filter(status=status_filter)
        paginator = Paginator(qs, page_size)
        page_obj = paginator.get_page(page)
        items = [
            {
                "id": t.id,
                "user_id": t.user_id,
                "user_email": t.user_email,
                "message": t.message,
                "status": t.status,
                "admin_reply": t.admin_reply,
                "replied_at": t.replied_at.isoformat() if t.replied_at else None,
                "created_at": t.created_at.isoformat() if t.created_at else None,
            }
            for t in page_obj
        ]
        return JsonResponse({"tickets": items, "total": paginator.count, "page": page, "page_size": page_size})
    return JsonResponse({"detail": "Method not allowed"}, status=405)


@require_http_methods(["POST", "PATCH"])
@csrf_exempt
@require_admin
def support_ticket_respond(request, ticket_id):
    try:
        data = json.loads(request.body) if request.body else {}
    except Exception:
        return JsonResponse({"detail": "Invalid JSON"}, status=400)
    ticket = SupportTicket.objects.filter(id=ticket_id).first()
    if not ticket:
        return JsonResponse({"detail": "Ticket not found"}, status=404)
    if "admin_reply" in data:
        ticket.admin_reply = data.get("admin_reply", "").strip()
        ticket.replied_at = timezone.now()
    if "status" in data and data["status"] in (SupportTicket.STATUS_OPEN, SupportTicket.STATUS_CLOSED):
        ticket.status = data["status"]
    ticket.save()
    return JsonResponse({"id": ticket.id, "status": ticket.status, "admin_reply": ticket.admin_reply})


@require_http_methods(["GET", "POST", "PUT", "PATCH"])
@csrf_exempt
@require_admin
def settings_view(request):
    if request.method == "GET":
        keys = ["email_alerts_enabled", "password_min_length", "ADMIN_EMAIL"]
        out = {}
        for k in keys:
            out[k] = AdminSettings.get(k, "true" if k == "email_alerts_enabled" else "8" if k == "password_min_length" else "")
        return JsonResponse(out)
    try:
        data = json.loads(request.body) if request.body else {}
    except Exception:
        return JsonResponse({"detail": "Invalid JSON"}, status=400)
    for key in ("email_alerts_enabled", "password_min_length", "ADMIN_EMAIL"):
        if key in data:
            AdminSettings.set(key, data[key])
    return JsonResponse({"message": "Settings updated"})


@require_http_methods(["GET"])
@require_admin
def users_list(request):
    qs = User.objects.all().order_by("email")
    out = [
        {"id": u.id, "email": u.email, "full_name": u.full_name, "role": u.role, "status": u.status, "is_active": u.is_active, "is_locked": getattr(u, 'is_locked', False)}
        for u in qs
    ]
    return JsonResponse({"users": out})


@require_http_methods(["POST"])
@csrf_exempt
@require_admin
def user_lock(request, user_id):
    try:
        data = json.loads(request.body) if request.body else {}
    except Exception:
        data = {}
    lock = data.get("lock", True)
    user = User.objects.filter(id=user_id).first()
    if not user:
        return JsonResponse({"detail": "User not found"}, status=404)
    if user.role in ('admin', 'super_admin') and request.admin_user.role != 'super_admin':
        return JsonResponse({"detail": "Cannot lock another admin"}, status=403)
    user.is_locked = bool(lock)
    user.save(update_fields=['is_locked'])
    log_activity(request.admin_user.id, request.admin_user.email, request.admin_user.full_name or '', 'USER_LOCK' if lock else 'USER_UNLOCK', request, status='Success', details=f"Target: {user.email}")
    return JsonResponse({"message": f"User {'locked' if lock else 'unlocked'}", "user_id": user_id})
