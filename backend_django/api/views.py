import json
import os
import datetime as dt
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from django.conf import settings

from .models import (
    User, ActivityLog, FormLog, ErrorLog, Workspace, ExpenseForm, 
    ExpenseField, ExpenseEntry, Expense, Income, Report
)
from .services import (
    get_client_ip,
    get_user_agent,
    log_activity,
    send_alert_to_admin,
    count_recent_failed_logins,
    generate_monthly_report_pdf
)
from .auth_utils import (
    create_access_token,
    create_refresh_token,
    decode_token,
)
from .rate_limit import check_rate_limit, incr_rate_limit
from django.db.models import Sum
from datetime import date

def _user_to_json(user):
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name or (user.email.split("@")[0] if user.email else ""),
        "role": user.role,
        "status": user.status,
    }

@require_http_methods(["GET"])
def health_check(request):
    return JsonResponse({
        "status": "healthy",
        "project_name": "Panacée Financial Management",
        "timestamp": timezone.now().isoformat()
    })

@require_http_methods(["GET"])
def metrics_view(request):
    """Simple system metrics for monitoring."""
    return JsonResponse({
        "total_users": User.objects.count(),
        "total_expenses_records": Expense.objects.count(),
        "total_income_records": Income.objects.count(),
        "total_audit_logs": ActivityLog.objects.count()
    })

def _parse_login_body(request):
    body = request.body.decode("utf-8")
    if "application/x-www-form-urlencoded" in request.META.get("CONTENT_TYPE", ""):
        from urllib.parse import parse_qs
        data = parse_qs(body)
        username = (data.get("username") or data.get("email") or [""])[0]
        password = (data.get("password") or [""])[0]
    else:
        try:
            data = json.loads(body) if body else {}
            username = data.get("username") or data.get("email") or ""
            password = data.get("password", "")
        except json.JSONDecodeError:
            return None, None
    return username, password

@require_http_methods(["POST"])
@csrf_exempt
def login(request):
    username, password = _parse_login_body(request)
    ip = get_client_ip(request)
    device = get_user_agent(request)
    time_str = timezone.now().strftime("%Y-%m-%d %H:%M")

    if not username or not password:
        log_activity(None, username or '', '', 'LOGIN_FAILED', request, status='Failed', details='Missing credentials')
        return JsonResponse({"detail": "Incorrect email or password"}, status=401)

    rate_key = f"login_attempt:{ip}"
    allowed, _ = check_rate_limit(rate_key, limit=10, window_seconds=600)
    if not allowed:
        return JsonResponse({"detail": "Too many login attempts. Try again later."}, status=429)

    user = User.objects.filter(email=username).first()
    if not user or not user.check_password(password):
        incr_rate_limit(rate_key, window_seconds=600)
        log_activity(user.id if user else None, username, getattr(user, 'full_name', '') or '', 'LOGIN_FAILED', request, status='Failed', details='Invalid password')
        failed_count = count_recent_failed_logins(ip)
        threshold = getattr(settings, 'FAILED_LOGIN_ALERT_THRESHOLD', 5)
        if failed_count >= threshold:
            send_alert_to_admin(
                'MULTIPLE_FAILED_LOGIN_ATTEMPTS',
                username, '', ip, device, time_str,
                extra=f'Failed attempts from this IP in last 15 min: {failed_count}'
            )
        return JsonResponse({"detail": "Incorrect email or password"}, status=401)

    if user.is_locked:
        log_activity(user.id, user.email, user.full_name or '', 'LOGIN_FAILED', request, status='Failed', details='Account locked')
        return JsonResponse({"detail": "Account is locked. Contact support."}, status=403)

    if user.status != "approved":
        log_activity(user.id, user.email, user.full_name or '', 'LOGIN_FAILED', request, status='Failed', details=f'Status: {user.status}')
        return JsonResponse({"detail": f"Account not approved yet. Status: {user.status}"}, status=403)

    if not user.is_active:
        log_activity(user.id, user.email, user.full_name or '', 'LOGIN_FAILED', request, status='Failed', details='Inactive')
        return JsonResponse({"detail": "Account is inactive"}, status=403)

    log_activity(user.id, user.email, user.full_name or '', 'LOGIN', request, status='Success')
    send_alert_to_admin('LOGIN', user.email, user.full_name or '', ip, device, time_str)

    access_token = create_access_token({
        "sub": user.email,
        "role": user.role,
        "status": user.status,
        "version": user.token_version,
    })
    refresh_token = create_refresh_token({"sub": user.email, "version": user.token_version})

    return JsonResponse({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    })

@require_http_methods(["POST"])
@csrf_exempt
def register(request):
    try:
        data = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON"}, status=400)

    email = data.get("email", "").strip()
    password = data.get("password", "")
    full_name = data.get("full_name", "").strip()
    role = data.get("role", "user")

    if not email or not password:
        return JsonResponse({"detail": "Email and password required"}, status=400)

    if User.objects.filter(email=email).exists():
        return JsonResponse({"detail": "The user with this email already exists in the system"}, status=400)

    try:
        from django.db import IntegrityError
        user = User.objects.create_user(
            email=email,
            password=password,
            full_name=full_name or email.split("@")[0],
            role=role if role in ("super_admin", "admin", "user") else "user",
            status="pending",
        )
        return JsonResponse(_user_to_json(user), status=201)
    except IntegrityError:
        return JsonResponse({"detail": "User already exists"}, status=400)

@require_http_methods(["POST"])
@csrf_exempt
def refresh(request):
    refresh_token_str = request.GET.get("refresh_token") or (json.loads(request.body).get("refresh_token") if request.body else None)
    if not refresh_token_str:
        return JsonResponse({"detail": "refresh_token required"}, status=400)

    try:
        payload = decode_token(refresh_token_str)
    except Exception:
        return JsonResponse({"detail": "Invalid refresh token"}, status=401)

    if payload.get("type") != "refresh":
        return JsonResponse({"detail": "Invalid token type"}, status=401)

    email = payload.get("sub")
    if not email:
        return JsonResponse({"detail": "Invalid refresh token"}, status=401)

    user = User.objects.filter(email=email).first()
    if not user or user.token_version != payload.get("version"):
        return JsonResponse({"detail": "Token version mismatch"}, status=401)

    access_token = create_access_token({
        "sub": user.email,
        "role": user.role,
        "status": user.status,
        "version": user.token_version,
    })
    new_refresh = create_refresh_token({"sub": user.email, "version": user.token_version})

    return JsonResponse({
        "access_token": access_token,
        "refresh_token": new_refresh,
        "token_type": "bearer",
    })

def _get_user_from_request(request):
    auth = request.META.get("HTTP_AUTHORIZATION")
    if not auth or not auth.startswith("Bearer "):
        return None
    token = auth[7:]
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            return None
        user = User.objects.filter(email=payload.get("sub")).first()
        if not user or user.token_version != payload.get("version"):
            return None
        return user
    except Exception:
        return None

@require_http_methods(["GET"])
def me(request):
    user = _get_user_from_request(request)
    if not user:
        return JsonResponse({"detail": "Not authenticated"}, status=401)
    return JsonResponse(_user_to_json(user))

@require_http_methods(["POST"])
@csrf_exempt
def logout(request):
    user = _get_user_from_request(request)
    if user:
        log_activity(user.id, user.email, user.full_name or '', 'LOGOUT', request, status='Success')
        user.token_version += 1
        user.save(update_fields=['token_version'])
    return JsonResponse({"message": "Logged out successfully"})

@require_http_methods(["POST"])
@csrf_exempt
def password_change(request):
    user = _get_user_from_request(request)
    if not user:
        return JsonResponse({"detail": "Not authenticated"}, status=401)
    try:
        data = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON"}, status=400)
    old_password = data.get("old_password", "")
    new_password = data.get("new_password", "")
    if not old_password or not new_password:
        return JsonResponse({"detail": "old_password and new_password required"}, status=400)
    if not user.check_password(old_password):
        log_activity(user.id, user.email, user.full_name or '', 'PASSWORD_CHANGED', request, status='Failed', details='Wrong old password')
        return JsonResponse({"detail": "Current password is incorrect"}, status=400)
    user.set_password(new_password)
    user.save(update_fields=['password'])
    log_activity(user.id, user.email, user.full_name or '', 'PASSWORD_CHANGED', request, status='Success')
    send_alert_to_admin('PASSWORD_CHANGED', user.email, user.full_name or '', get_client_ip(request), get_user_agent(request), timezone.now().strftime("%Y-%m-%d %H:%M"))
    return JsonResponse({"message": "Password changed successfully"})

@require_http_methods(["POST"])
@csrf_exempt
def password_reset_request(request):
    try:
        data = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON"}, status=400)
    email = data.get("email", "").strip()
    if not email:
        return JsonResponse({"detail": "email required"}, status=400)
    user = User.objects.filter(email=email).first()
    log_activity(user.id if user else None, email, getattr(user, 'full_name', '') or '', 'PASSWORD_RESET', request, status='Success' if user else 'Failed')
    if user:
        send_alert_to_admin('PASSWORD_RESET', user.email, user.full_name or '', get_client_ip(request), get_user_agent(request), timezone.now().strftime("%Y-%m-%d %H:%M"))
    return JsonResponse({"message": "If an account exists with this email, you will receive reset instructions."})

def _require_auth(request):
    user = _get_user_from_request(request)
    if not user:
        return None, JsonResponse({"detail": "Not authenticated"}, status=401)
    return user, None

@require_http_methods(["GET", "POST"])
@csrf_exempt
def expenses_view(request):
    user, err = _require_auth(request)
    if err:
        return err
    if request.method == "POST":
        try:
            data = json.loads(request.body) if request.body else {}
        except json.JSONDecodeError:
            return JsonResponse({"detail": "Invalid JSON"}, status=400)
        e = Expense.objects.create(
            user_id=user.id,
            workspace_id=data.get("workspace_id"),
            category=data.get("category", "AUTRE"),
            amount=data.get("amount", 0),
            date=data.get("date", date.today().isoformat()),
            comment=data.get("comment", "")
        )
        log_activity(user.id, user.email, user.full_name or '', 'CREATE_EXPENSE', request, status='Success', details=f"Amount: {e.amount}")
        return JsonResponse({"id": e.id, "category": e.category, "amount": float(e.amount), "date": e.date.isoformat()}, status=201)
    expenses = Expense.objects.filter(user_id=user.id).order_by("-date")
    return JsonResponse([{"id": e.id, "category": e.category, "amount": float(e.amount), "date": e.date.isoformat()} for e in expenses], safe=False)

@require_http_methods(["DELETE"])
@csrf_exempt
def expense_delete(request, expense_id):
    user, err = _require_auth(request)
    if err:
        return err
    e = Expense.objects.filter(id=expense_id, user_id=user.id).first()
    if not e:
        return JsonResponse({"detail": "Not found"}, status=404)
    e.delete()
    return JsonResponse({"message": "Deleted"})

@require_http_methods(["GET", "POST"])
@csrf_exempt
def income_view(request):
    user, err = _require_auth(request)
    if err:
        return err
    if request.method == "POST":
        try:
            data = json.loads(request.body) if request.body else {}
        except json.JSONDecodeError:
            return JsonResponse({"detail": "Invalid JSON"}, status=400)
        i = Income.objects.create(
            user_id=user.id,
            workspace_id=data.get("workspace_id"),
            type=data.get("type") or data.get("category", "AUTRE"),
            subtype=data.get("subtype", ""),
            amount=data.get("amount", 0),
            date=data.get("date", date.today().isoformat()),
            comment=data.get("comment", ""),
            student_count=data.get("student_count", 0)
        )
        log_activity(user.id, user.email, user.full_name or '', 'CREATE_INCOME', request, status='Success', details=f"Amount: {i.amount}")
        return JsonResponse({"id": i.id, "type": i.type, "amount": float(i.amount), "date": i.date.isoformat()}, status=201)
    income = Income.objects.filter(user_id=user.id).order_by("-date")
    return JsonResponse([{"id": i.id, "type": i.type, "amount": float(i.amount), "date": i.date.isoformat(), "comment": i.comment} for i in income], safe=False)

@require_http_methods(["DELETE"])
@csrf_exempt
def income_delete(request, income_id):
    user, err = _require_auth(request)
    if err:
        return err
    i = Income.objects.filter(id=income_id, user_id=user.id).first()
    if not i:
        return JsonResponse({"detail": "Not found"}, status=404)
    i.delete()
    return JsonResponse({"message": "Deleted"})

@require_http_methods(["GET", "POST"])
@csrf_exempt
def workspaces_view(request):
    user, err = _require_auth(request)
    if err:
        return err
    if request.method == "POST":
        try:
            data = json.loads(request.body) if request.body else {}
        except json.JSONDecodeError:
            return JsonResponse({"detail": "Invalid JSON"}, status=400)
        ws = Workspace.objects.create(owner_id=user.id, name=data.get("name", "New Workspace"))
        return JsonResponse({"id": ws.id, "name": ws.name}, status=201)
    workspaces = Workspace.objects.filter(owner_id=user.id)
    return JsonResponse([{"id": w.id, "name": w.name} for w in workspaces], safe=False)

@require_http_methods(["DELETE"])
@csrf_exempt
def workspaces_delete(request, workspace_id):
    user, err = _require_auth(request)
    if err:
        return err
    ws = Workspace.objects.filter(id=workspace_id, owner_id=user.id).first()
    if not ws:
        return JsonResponse({"detail": "Not found"}, status=404)
    ws.delete()
    return JsonResponse({"message": "Deleted"})

@require_http_methods(["GET", "POST"])
@csrf_exempt
def expense_forms_view(request):
    user, err = _require_auth(request)
    if err:
        return err
    if request.method == "POST":
        try:
            data = json.loads(request.body) if request.body else {}
        except json.JSONDecodeError:
            return JsonResponse({"detail": "Invalid JSON"}, status=400)
        workspace_id = data.get("workspace_id")
        if not workspace_id:
            return JsonResponse({"detail": "workspace_id required"}, status=400)
        ws = Workspace.objects.filter(id=workspace_id, owner_id=user.id).first()
        if not ws:
            return JsonResponse({"detail": "Workspace not found"}, status=404)
        f = ExpenseForm.objects.create(workspace_id=ws.id, name=data.get("name", "Form"), description=data.get("description", ""))
        for field in data.get("fields", []):
            ExpenseField.objects.create(
                form_id=f.id,
                label=field.get("label") or "Field",
                field_type=field.get("field_type") or "text",
                required=bool(field.get("required")),
                options=field.get("options"),
            )
        fields = ExpenseField.objects.filter(form_id=f.id).order_by('id')
        return JsonResponse({
            "id": f.id, "name": f.name, "description": f.description or "",
            "workspace_id": f.workspace_id, "created_at": f.created_at.isoformat(),
            "fields": [{"id": fl.id, "form_id": fl.form_id, "label": fl.label, "field_type": fl.field_type, "required": fl.required, "options": fl.options or []} for fl in fields]
        }, status=201)
    workspace_id = request.GET.get("workspace_id")
    if not workspace_id:
        return JsonResponse({"detail": "workspace_id required"}, status=400)
    ws = Workspace.objects.filter(id=int(workspace_id)).first()
    if not ws or ws.owner_id != user.id:
        return JsonResponse({"detail": "Forbidden"}, status=403)
    forms = ExpenseForm.objects.filter(workspace_id=ws.id).order_by('name')
    out = []
    for f in forms:
        fields = ExpenseField.objects.filter(form_id=f.id).order_by('id')
        out.append({
            "id": f.id, "name": f.name, "description": f.description or "",
            "workspace_id": f.workspace_id, "created_at": f.created_at.isoformat(),
            "fields": [{"id": fl.id, "form_id": fl.form_id, "label": fl.label, "field_type": fl.field_type, "required": fl.required, "options": fl.options or []} for fl in fields]
        })
    return JsonResponse(out, safe=False)

@require_http_methods(["GET", "POST"])
@csrf_exempt
def expense_entries_view(request):
    user, err = _require_auth(request)
    if err:
        return err
    if request.method == "GET":
        form_id = request.GET.get("form_id")
        if not form_id:
            return JsonResponse({"detail": "form_id required"}, status=400)
        form = ExpenseForm.objects.filter(id=int(form_id)).first()
        if not form:
            return JsonResponse({"detail": "Form not found"}, status=404)
        ws = Workspace.objects.filter(id=form.workspace_id).first()
        if not ws or ws.owner_id != user.id:
            return JsonResponse({"detail": "Forbidden"}, status=403)
        entries = ExpenseEntry.objects.filter(form_id=form.id).order_by('-created_at')
        out = [{"id": e.id, "form_id": e.form_id, "workspace_id": e.workspace_id, "data": e.data, "created_at": e.created_at.isoformat()} for e in entries]
        return JsonResponse(out, safe=False)
    try:
        data = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON"}, status=400)
    form_id = data.get("form_id")
    workspace_id = data.get("workspace_id")
    entry_data = data.get("data") or {}
    if form_id is None:
        return JsonResponse({"detail": "form_id required"}, status=400)
    form = ExpenseForm.objects.filter(id=form_id).first()
    if not form:
        return JsonResponse({"detail": "Form not found"}, status=404)
    ws = Workspace.objects.filter(id=workspace_id or form.workspace_id).first()
    if not ws or ws.owner_id != user.id:
        return JsonResponse({"detail": "Forbidden"}, status=403)
    e = ExpenseEntry.objects.create(form_id=form_id, workspace_id=ws.id, creator_id=user.id, data=entry_data)
    FormLog.objects.create(user_id=user.id, user_email=user.email, form_name=form.name, data_summary=json.dumps(entry_data)[:2000])
    log_activity(user.id, user.email, user.full_name or '', 'FORM_SUBMITTED', request, status='Success', details=form.name)
    send_alert_to_admin('FORM_SUBMITTED', user.email, user.full_name or '', get_client_ip(request), get_user_agent(request), timezone.now().strftime("%Y-%m-%d %H:%M"), extra=f"Form: {form.name}")
    return JsonResponse({"id": e.id, "form_id": e.form_id, "workspace_id": e.workspace_id, "data": e.data, "created_at": e.created_at.isoformat()}, status=201)

@require_http_methods(["DELETE"])
@csrf_exempt
def expense_entries_delete(request, entry_id):
    user, err = _require_auth(request)
    if err:
        return err
    e = ExpenseEntry.objects.filter(id=entry_id).first()
    if not e:
        return JsonResponse({"detail": "Not found"}, status=404)
    ws = Workspace.objects.filter(id=e.workspace_id).first()
    if not ws or ws.owner_id != user.id:
        return JsonResponse({"detail": "Forbidden"}, status=403)
    e.delete()
    return JsonResponse({"message": "Deleted"})

@require_http_methods(["GET"])
def notifications_list(request):
    user, err = _require_auth(request)
    if err:
        return err
    limit = min(int(request.GET.get("limit", 50)), 100)
    logs = ActivityLog.objects.filter(user_id=user.id).order_by('-created_at')[:limit]
    out = [
        {
            "id": log.id,
            "action": log.action,
            "status": log.status,
            "details": log.details or "",
            "created_at": log.created_at.isoformat(),
        }
        for log in logs
    ]
    return JsonResponse(out, safe=False)

@require_http_methods(["GET"])
def monthly_report_pdf_view(request):
    user = _get_user_from_request(request)
    if not user:
        return JsonResponse({"detail": "Not authenticated"}, status=401)
    try:
        year = int(request.GET.get("year", dt.datetime.now().year))
        month = int(request.GET.get("month", dt.datetime.now().month))
    except ValueError:
        return JsonResponse({"detail": "Invalid year or month"}, status=400)
    expenses = Expense.objects.filter(user_id=user.id, date__year=year, date__month=month)
    income = Income.objects.filter(user_id=user.id, date__year=year, date__month=month)
    total_exp = sum(e.amount for e in expenses)
    total_inc = sum(i.amount for i in income)
    transactions = sorted(list(expenses) + list(income), key=lambda x: x.date, reverse=True)
    pdf_buffer = generate_monthly_report_pdf(
        user_name=user.full_name or user.email,
        year=year, month=month,
        total_income=float(total_inc),
        total_expenses=float(total_exp),
        transactions=transactions,
        profile_photo_path=user.profile_photo.path if user.profile_photo and os.path.exists(user.profile_photo.path) else None
    )
    from django.http import HttpResponse
    response = HttpResponse(pdf_buffer, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="Report_{year}_{month}.pdf"'
    log_activity(user.id, user.email, user.full_name or '', 'REPORT_GENERATED', request, details=f"Month: {month}, Year: {year}")
    return response

@require_http_methods(["GET"])
def real_dashboard_summary(request):
    user = _get_user_from_request(request)
    if not user:
        return JsonResponse({"detail": "Not authenticated"}, status=401)
    try:
        year = int(request.GET.get("year", dt.datetime.now().year))
    except ValueError:
        year = dt.datetime.now().year
    expenses_qs = Expense.objects.filter(user_id=user.id, date__year=year)
    income_qs = Income.objects.filter(user_id=user.id, date__year=year)
    total_exp = expenses_qs.aggregate(Sum('amount'))['amount__sum'] or 0
    total_inc = income_qs.aggregate(Sum('amount'))['amount__sum'] or 0
    monthly_stats = []
    for m in range(1, 13):
        m_exp = expenses_qs.filter(date__month=m).aggregate(Sum('amount'))['amount__sum'] or 0
        m_inc = income_qs.filter(date__month=m).aggregate(Sum('amount'))['amount__sum'] or 0
        monthly_stats.append({"month": m, "income": float(m_inc), "expense": float(m_exp)})
    return JsonResponse({
        "total_income": float(total_inc),
        "total_expenses": float(total_exp),
        "net_result": float(total_inc - total_exp),
        "monthly_stats": monthly_stats
    })

@require_http_methods(["GET"])
def stub_expense_categories(request):
    user, err = _require_auth(request)
    if err:
        return err
    cats = list(Expense.objects.filter(user_id=user.id).values_list("category", flat=True).distinct())
    defaults = ["Salaire fixe", "Commission vendeur", "Annonce publicitaire", "Transport", "AUTRE"]
    merged = list(dict.fromkeys(cats + defaults))
    return JsonResponse(merged, safe=False)

@require_http_methods(["GET"])
def stub_users(request):
    user, err = _require_auth(request)
    if err:
        return err
    return JsonResponse([], safe=False)

@require_http_methods(["GET"])
def stub_vendors(request):
    user, err = _require_auth(request)
    if err:
        return err
    return JsonResponse([], safe=False)

@require_http_methods(["POST"])
@csrf_exempt
def form_submit(request):
    user, err = _require_auth(request)
    if err:
        return err
    try:
        data = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON"}, status=400)
    form_name = data.get("form_name", "Form").strip() or "Form"
    data_summary = data.get("data_summary", "")
    if isinstance(data_summary, dict):
        data_summary = json.dumps(data_summary)[:2000]
    FormLog.objects.create(
        user_id=user.id,
        user_email=user.email,
        form_name=form_name,
        data_summary=str(data_summary)[:2000],
    )
    log_activity(user.id, user.email, user.full_name or '', 'FORM_SUBMITTED', request, status='Success', details=form_name)
    send_alert_to_admin('FORM_SUBMITTED', user.email, user.full_name or '', get_client_ip(request), get_user_agent(request), timezone.now().strftime("%Y-%m-%d %H:%M"))
    return JsonResponse({"message": "Form submitted", "form_name": form_name})

@require_http_methods(["POST"])
@csrf_exempt
def error_log_create(request):
    try:
        data = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON"}, status=400)
    user_id = None
    user_email = ""
    try:
        token = request.META.get('HTTP_AUTHORIZATION', '').replace('Bearer ', '')
        if token:
            decoded = decode_token(token)
            if decoded:
                user_email = decoded.get('sub')
                user = User.objects.filter(email=user_email).first()
                user_id = user.id if user else None
                user_email = user.email if user else ""
    except:
        pass
    ErrorLog.objects.create(
        user_id=user_id, user_email=user_email,
        error_message=data.get("error_message", "Unknown error")[:1000],
        error_stack=data.get("error_stack", "")[:5000],
        endpoint=data.get("endpoint", "")[:500],
        status_code=data.get("status_code"),
        details=data.get("details", "")[:1000],
        ip_address=get_client_ip(request),
    )
    return JsonResponse({"message": "Error logged"}, status=201)

@require_http_methods(["POST"])
@csrf_exempt
def support_ticket_create(request):
    user, err = _require_auth(request)
    if err:
        return err
    try:
        data = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON"}, status=400)
    message = data.get("message", "").strip()
    if not message:
        return JsonResponse({"detail": "message required"}, status=400)
    from .models import SupportTicket
    ticket = SupportTicket.objects.create(user_id=user.id, user_email=user.email, message=message, status=SupportTicket.STATUS_OPEN)
    return JsonResponse({"id": ticket.id, "message": ticket.message, "status": ticket.status, "created_at": ticket.created_at.isoformat()}, status=201)

@require_http_methods(["POST"])
@csrf_exempt
def assistant_query_view(request):
    user = _get_user_from_request(request)
    if not user: return JsonResponse({"detail": "Not authenticated"}, status=401)
    try:
        data = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError: return JsonResponse({"detail": "Invalid JSON"}, status=400)
    query = data.get("query", "").lower().strip()
    if not query: return JsonResponse({"detail": "query required"}, status=400)
    now = dt.datetime.now()
    expenses = Expense.objects.filter(user_id=user.id, date__year=now.year, date__month=now.month)
    income = Income.objects.filter(user_id=user.id, date__year=now.year, date__month=now.month)
    total_exp = sum(e.amount for e in expenses)
    total_inc = sum(i.amount for i in income)
    if "spend" in query or "expense" in query:
        response = f"You have spent ${total_exp:,.2f} this month."
    elif "income" in query or "earn" in query:
        response = f"Your total income for this month is ${total_inc:,.2f}."
    elif "save" in query or "net" in query:
        response = f"Your net savings this month is ${(total_inc - total_exp):,.2f}."
    elif "biggest" in query:
        biggest = expenses.order_by('-amount').first()
        response = f"Your biggest expense this month was {biggest.category} for ${biggest.amount:,.2f}." if biggest else "No expenses found."
    else:
        response = "I can only help with basic questions about spending, income, and savings."
    return JsonResponse({"response": response})

@require_http_methods(["POST"])
@csrf_exempt
def profile_update(request):
    user = _get_user_from_request(request)
    if not user: return JsonResponse({"detail": "Not authenticated"}, status=401)
    try: data = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError: return JsonResponse({"detail": "Invalid JSON"}, status=400)
    user.full_name = data.get("full_name", user.full_name)
    user.save(update_fields=['full_name'])
    return JsonResponse(_user_to_json(user))

@require_http_methods(["POST"])
@csrf_exempt
def profile_photo_upload(request):
    user = _get_user_from_request(request)
    if not user: return JsonResponse({"detail": "Not authenticated"}, status=401)
    photo = request.FILES.get("photo")
    if not photo: return JsonResponse({"detail": "No photo provided"}, status=400)
    user.profile_photo = photo
    user.save(update_fields=['profile_photo'])
    return JsonResponse({"message": "Photo uploaded", "url": user.profile_photo.url if user.profile_photo else ""})
