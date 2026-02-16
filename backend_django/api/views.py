import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from django.conf import settings

from .models import User
from .auth_utils import (
    create_access_token,
    create_refresh_token,
    decode_token,
)
from .services import (
    get_client_ip,
    get_user_agent,
    log_activity,
    send_alert_to_admin,
    count_recent_failed_logins,
)
from .models import (
    User, ActivityLog, FormLog, ErrorLog, Workspace, ExpenseForm, 
    ExpenseField, ExpenseEntry, Expense, Income
)
from .rate_limit import check_rate_limit, incr_rate_limit

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
    })


def _parse_login_body(request):
    body = request.body.decode("utf-8")
    if "application/x-www-form-urlencoded" in request.META.get("CONTENT_TYPE", ""):
        from urllib.parse import parse_qs
        data = parse_qs(body)
        username = (data.get("username") or [""])[0]
        password = (data.get("password") or [""])[0]
    else:
        try:
            data = json.loads(body) if body else {}
            username = data.get("username", "")
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
        return User.objects.filter(email=payload.get("sub")).first()
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
    """Request password reset: send token/link by email (simplified: we just log and email admin; no token in this stub)."""
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


# ---- Stub endpoints so frontend does not 404 after login (extend later with real logic) ----
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
        category = (data.get("category") or "").strip() or "AUTRE"
        try:
            amount = float(data.get("amount", 0))
        except (TypeError, ValueError):
            return JsonResponse({"detail": "Invalid amount"}, status=400)
        comment = (data.get("comment") or "").strip()
        date_str = data.get("date") or timezone.now().date().isoformat()
        workspace_id = data.get("workspace_id")
        try:
            from datetime import datetime
            date = datetime.strptime(date_str[:10], "%Y-%m-%d").date()
        except (ValueError, TypeError):
            date = timezone.now().date()
        obj = Expense.objects.create(
            user_id=user.id,
            workspace_id=workspace_id,
            category=category,
            amount=amount,
            comment=comment,
            date=date,
        )
        return JsonResponse({
            "id": obj.id,
            "category": obj.category,
            "amount": float(obj.amount),
            "comment": obj.comment,
            "date": obj.date.isoformat(),
            "created_at": obj.created_at.isoformat(),
        }, status=201)
    workspace_id = request.GET.get("workspace_id")
    qs = Expense.objects.filter(user_id=user.id)
    if workspace_id:
        try:
            qs = qs.filter(workspace_id=int(workspace_id))
        except ValueError:
            pass
    qs = qs.order_by("-date", "-created_at")
    out = [
        {
            "id": e.id,
            "category": e.category,
            "amount": float(e.amount),
            "comment": e.comment,
            "date": e.date.isoformat(),
            "created_at": e.created_at.isoformat(),
        }
        for e in qs
    ]
    return JsonResponse(out)


@require_http_methods(["DELETE", "PUT", "PATCH"])
@csrf_exempt
def expense_delete(request, expense_id):
    user, err = _require_auth(request)
    if err:
        return err
    obj = Expense.objects.filter(id=expense_id, user_id=user.id).first()
    if not obj:
        return JsonResponse({"detail": "Not found"}, status=404)
    
    if request.method in ("PUT", "PATCH"):
        # Update expense
        try:
            data = json.loads(request.body) if request.body else {}
        except json.JSONDecodeError:
            return JsonResponse({"detail": "Invalid JSON"}, status=400)
        
        if "category" in data:
            obj.category = (data.get("category") or "").strip() or obj.category
        if "amount" in data:
            try:
                obj.amount = float(data.get("amount"))
            except (TypeError, ValueError):
                return JsonResponse({"detail": "Invalid amount"}, status=400)
        if "comment" in data:
            obj.comment = (data.get("comment") or "").strip()
        if "date" in data:
            try:
                from datetime import datetime
                obj.date = datetime.strptime(data.get("date", "")[:10], "%Y-%m-%d").date()
            except (ValueError, TypeError):
                pass  # Keep existing date if invalid
        
        obj.save()
        log_activity(user.id, user.email, user.full_name or '', 'UPDATE', request, details=f'Updated expense {expense_id}')
        
        return JsonResponse({
            "id": obj.id,
            "category": obj.category,
            "amount": float(obj.amount),
            "comment": obj.comment,
            "date": obj.date.isoformat(),
            "created_at": obj.created_at.isoformat(),
        }, status=200)
    
    # DELETE
    obj.delete()
    log_activity(user.id, user.email, user.full_name or '', 'DELETE', request, details=f'Deleted expense {expense_id}')
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
        itype = (data.get("type") or "PLATFORM").strip()
        subtype = (data.get("subtype") or data.get("feeType") or "").strip()
        try:
            amount = float(data.get("amount", 0))
        except (TypeError, ValueError):
            return JsonResponse({"detail": "Invalid amount"}, status=400)
        student_count = int(data.get("student_count", 0) or 0)
        comment = (data.get("comment") or "").strip()
        date_str = data.get("date") or timezone.now().date().isoformat()
        workspace_id = data.get("workspace_id")
        try:
            from datetime import datetime
            date = datetime.strptime(date_str[:10], "%Y-%m-%d").date()
        except (ValueError, TypeError):
            date = timezone.now().date()
        obj = Income.objects.create(
            user_id=user.id,
            workspace_id=workspace_id,
            type=itype,
            subtype=subtype,
            amount=amount,
            student_count=student_count,
            comment=comment,
            date=date,
        )
        return JsonResponse({
            "id": obj.id,
            "type": obj.type,
            "subtype": obj.subtype or "",
            "amount": float(obj.amount),
            "student_count": obj.student_count,
            "comment": obj.comment,
            "date": obj.date.isoformat(),
            "created_at": obj.created_at.isoformat(),
        }, status=201)
    workspace_id = request.GET.get("workspace_id")
    qs = Income.objects.filter(user_id=user.id)
    if workspace_id:
        try:
            qs = qs.filter(workspace_id=int(workspace_id))
        except ValueError:
            pass
    qs = qs.order_by("-date", "-created_at")
    out = [
        {
            "id": i.id,
            "type": i.type,
            "subtype": i.subtype or "",
            "amount": float(i.amount),
            "student_count": i.student_count,
            "comment": i.comment,
            "date": i.date.isoformat(),
            "created_at": i.created_at.isoformat(),
        }
        for i in qs
    ]
    return JsonResponse(out)


@require_http_methods(["DELETE", "PUT", "PATCH"])
@csrf_exempt
def income_delete(request, income_id):
    user, err = _require_auth(request)
    if err:
        return err
    obj = Income.objects.filter(id=income_id, user_id=user.id).first()
    if not obj:
        return JsonResponse({"detail": "Not found"}, status=404)
    
    if request.method in ("PUT", "PATCH"):
        # Update income
        try:
            data = json.loads(request.body) if request.body else {}
        except json.JSONDecodeError:
            return JsonResponse({"detail": "Invalid JSON"}, status=400)
        
        if "type" in data:
            obj.type = (data.get("type") or "").strip() or obj.type
        if "subtype" in data:
            obj.subtype = (data.get("subtype") or "").strip()
        if "amount" in data:
            try:
                obj.amount = float(data.get("amount"))
            except (TypeError, ValueError):
                return JsonResponse({"detail": "Invalid amount"}, status=400)
        if "student_count" in data:
            try:
                obj.student_count = int(data.get("student_count", 0) or 0)
            except (TypeError, ValueError):
                pass
        if "comment" in data:
            obj.comment = (data.get("comment") or "").strip()
        if "date" in data:
            try:
                from datetime import datetime
                obj.date = datetime.strptime(data.get("date", "")[:10], "%Y-%m-%d").date()
            except (ValueError, TypeError):
                pass  # Keep existing date if invalid
        
        obj.save()
        log_activity(user.id, user.email, user.full_name or '', 'UPDATE', request, details=f'Updated income {income_id}')
        
        return JsonResponse({
            "id": obj.id,
            "type": obj.type,
            "subtype": obj.subtype or "",
            "amount": float(obj.amount),
            "student_count": obj.student_count,
            "comment": obj.comment,
            "date": obj.date.isoformat(),
            "created_at": obj.created_at.isoformat(),
        }, status=200)
    
    # DELETE
    obj.delete()
    log_activity(user.id, user.email, user.full_name or '', 'DELETE', request, details=f'Deleted income {income_id}')
    return JsonResponse({"message": "Deleted"})

@require_http_methods(["GET", "POST"])
@csrf_exempt
def workspaces_view(request):
    user, err = _require_auth(request)
    if err:
        return err
    if request.method == "GET":
        qs = Workspace.objects.filter(owner_id=user.id).order_by('name')
        out = [{"id": w.id, "name": w.name, "slug": w.slug, "owner_id": w.owner_id, "created_at": w.created_at.isoformat()} for w in qs]
        return JsonResponse(out)
    try:
        data = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON"}, status=400)
    name = (data.get("name") or "").strip()
    slug = (data.get("slug") or "").strip()
    if not name:
        return JsonResponse({"detail": "name required"}, status=400)
    if not slug:
        slug = name.lower().replace(" ", "-").replace("/", "-")[:100]
    if Workspace.objects.filter(slug=slug).exists():
        return JsonResponse({"detail": "Workspace with this slug already exists"}, status=400)
    w = Workspace.objects.create(name=name, slug=slug, owner_id=user.id)
    return JsonResponse({"id": w.id, "name": w.name, "slug": w.slug, "owner_id": w.owner_id, "created_at": w.created_at.isoformat()}, status=201)

@require_http_methods(["DELETE"])
@csrf_exempt
def workspaces_delete(request, workspace_id):
    user, err = _require_auth(request)
    if err:
        return err
    w = Workspace.objects.filter(id=workspace_id, owner_id=user.id).first()
    if not w:
        return JsonResponse({"detail": "Not found"}, status=404)
    w.delete()
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
        name = (data.get("name") or "").strip()
        workspace_id = data.get("workspace_id")
        if not name or workspace_id is None:
            return JsonResponse({"detail": "name and workspace_id required"}, status=400)
        ws = Workspace.objects.filter(id=workspace_id, owner_id=user.id).first()
        if not ws:
            return JsonResponse({"detail": "Workspace not found"}, status=404)
        f = ExpenseForm.objects.create(name=name, description=(data.get("description") or ""), workspace_id=workspace_id)
        for field in data.get("fields") or []:
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
    if not ws:
        return JsonResponse({"detail": "Workspace not found"}, status=404)
    if ws.owner_id != user.id:
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
    return JsonResponse(out)

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
        return JsonResponse(out)
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
    form = ExpenseForm.objects.filter(id=e.form_id).first()
    ws = Workspace.objects.filter(id=e.workspace_id).first()
    if not ws or ws.owner_id != user.id:
        return JsonResponse({"detail": "Forbidden"}, status=403)
    e.delete()
    return JsonResponse({"message": "Deleted"})


@require_http_methods(["GET"])
def notifications_list(request):
    """Recent activity for the current user (for Notifications page)."""
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
    return JsonResponse(out)


@require_http_methods(["GET"])
def stub_dashboard_summary(request):
    user, err = _require_auth(request)
    if err:
        return err
    return JsonResponse({"total_income": 0, "total_expenses": 0, "net": 0})

@require_http_methods(["GET"])
def stub_expense_categories(request):
    user, err = _require_auth(request)
    if err:
        return err
    cats = list(Expense.objects.filter(user_id=user.id).values_list("category", flat=True).distinct())
    defaults = ["Salaire fixe", "Commission vendeur", "Annonce publicitaire", "Transport", "AUTRE"]
    merged = list(dict.fromkeys(cats + defaults))
    return JsonResponse(merged)

@require_http_methods(["GET"])
def stub_users(request):
    user, err = _require_auth(request)
    if err:
        return err
    return JsonResponse([])

@require_http_methods(["GET"])
def stub_vendors(request):
    user, err = _require_auth(request)
    if err:
        return err
    return JsonResponse([])


@require_http_methods(["POST"])
@csrf_exempt
def form_submit(request):
    """Track form submission: save to FormLog, notify admin by email."""
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
        import json as _json
        data_summary = _json.dumps(data_summary)[:2000]
    FormLog.objects.create(
        user_id=user.id,
        user_email=user.email,
        form_name=form_name,
        data_summary=str(data_summary)[:2000],
    )
    log_activity(user.id, user.email, user.full_name or '', 'FORM_SUBMITTED', request, status='Success', details=form_name)
    send_alert_to_admin(
        'FORM_SUBMITTED',
        user.email,
        user.full_name or '',
        get_client_ip(request),
        get_user_agent(request),
        timezone.now().strftime("%Y-%m-%d %H:%M"),
        extra=f"Form: {form_name}\nSummary: {data_summary[:500]}",
    )
    return JsonResponse({"message": "Form submitted", "form_name": form_name})


@require_http_methods(["POST"])
@csrf_exempt
def error_log_create(request):
    """Frontend error logging endpoint. Endpoint logs frontend errors without requiring auth."""
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
                user_id = decoded.get('sub')
                user = User.objects.filter(id=user_id).first()
                user_email = user.email if user else ""
    except:
        pass  # If token decoding fails, still log the error with null user_id
    
    error_message = data.get("error_message", "Unknown error")[:1000]
    error_stack = data.get("error_stack", "")[:5000]
    endpoint = data.get("endpoint", "")[:500]
    status_code = data.get("status_code")
    details = data.get("details", "")[:1000]
    
    ErrorLog.objects.create(
        user_id=user_id,
        user_email=user_email,
        error_message=error_message,
        error_stack=error_stack,
        endpoint=endpoint,
        status_code=status_code,
        details=details,
        ip_address=get_client_ip(request),
    )
    
    return JsonResponse({"message": "Error logged"}, status=201)



@require_http_methods(["POST"])
@csrf_exempt
def support_ticket_create(request):
    """Any authenticated user can create a support ticket."""
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
    ticket = SupportTicket.objects.create(
        user_id=user.id,
        user_email=user.email,
        message=message,
        status=SupportTicket.STATUS_OPEN,
    )
    return JsonResponse({
        "id": ticket.id,
        "message": ticket.message,
        "status": ticket.status,
        "created_at": ticket.created_at.isoformat(),
    }, status=201)
