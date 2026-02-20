# Admin Panel Setup & Testing Guide

## ✅ Current Status

The admin panel at `http://localhost:3003/admin` is **fully functional** with real authentication and all features working.

### Backend Services ✓
- **Django API Server**: Running on `http://localhost:8000`
- **Database**: SQLite with all migrations applied (22 migrations including ErrorLog table)
- **Authentication**: JWT tokens working properly
- **Admin Endpoints**: All secured with `@require_admin` decorator

### Frontend Services ✓
- **Vite Dev Server**: Running on `http://localhost:3003`
- **Routing**: Admin routes configured at `/admin/*` 
- **Authentication**: AdminLayout validates JWT tokens and admin role before rendering

---

## 🔐 Admin Credentials

Test the admin dashboard with these credentials:

| Email | Password | Role |
|-------|----------|------|
| `hachllersocials@gmail.com` | `12122007` | super_admin |
| `staff@finsys.ht` | `staff123` | admin |

---

## 📍 Admin Panel Routes

All admin routes are protected by JWT authentication and role validation:

| Route | Feature | Status |
|-------|---------|--------|
| `/admin` | Dashboard with stats & charts | ✅ Working |
| `/admin/users` | User management (lock/unlock) | ✅ Working |
| `/admin/activity` | Audit logs with filtering & export | ✅ Working |
| `/admin/errors` | Frontend error logs (NEW) | ✅ Working |
| `/admin/forms` | Form submission monitoring | ✅ Working |
| `/admin/support` | Support ticket management | ✅ Working |
| `/admin/settings` | System configuration | ✅ Working |

---

## 🚀 Starting the Services

### 1. Start the Django Backend

```bash
cd backend_django
venv\Scripts\activate
python manage.py runserver 8000
```

The server will start on `http://localhost:8000` and log "System check identified no issues (0 silenced)."

### 2. Start the Frontend Dev Server

```bash
npm run dev
```

The server will start on `http://localhost:3003` (ports 3001 and 3002 are already in use).

### 3. Access the Admin Panel

Open in your browser: **`http://localhost:3003/admin`**

You'll be redirected to the login page. Use the admin credentials above to log in.

---

## 🔑 Authentication Flow

1. **Login Page** → Enters email/password
2. **/api/auth/login** → Receives JWT tokens (access + refresh)
3. **Token Storage** → Saved to `localStorage['token']`
4. **AdminLayout Hook** → Runs on `/admin` routes
   - Reads token from localStorage
   - Calls `/api/auth/me` to fetch user info
   - Validates user role is `admin` or `super_admin`
   - If not admin: redirects to `/` (login)
   - If admin: renders dashboard with user's name/email in topbar

---

## 📊 Admin Dashboard Features

### Dashboard Tab
- **Stats Cards**: Total users, active sessions, forms today, security alerts
- **Login Trend**: 7-day area chart showing login activity
- **Recent Activity**: Latest 15 logs from activity audit trail

### Users Tab
- **List All Users**: Email, name, role, status
- **Search & Filter**: By email/name or status
- **Actions**: Lock/unlock user, view details, reset password
- **Confirmation Dialogs**: Prevents accidental actions

### Activity Logs Tab
- **View All Actions**: Timestamps, user, action type, IP, device, status
- **Filters**: By action (LOGIN, CREATE, UPDATE, DELETE), status (Success/Failed), user
- **Export**: Download logs as CSV file
- **Pagination**: 20 items per page

### Error Logs Tab *(NEW - ADDED)*
- **View Frontend Errors**: Errors caught by frontend error-log endpoint
- **Display**: Timestamp, user, error message, endpoint, status code, IP
- **Search**: Across error message, user email, endpoint
- **Pagination**: 15 items per page
- **Database Table**: `error_logs` (created in migration 0005)

### Forms Tab
- **Monitor Submissions**: User, form name, submission date
- **Expandable Details**: View JSON data for each submission
- **Pagination**: 15 items per page

### Support Tab
- **View Tickets**: Open/closed status, messages, timestamps
- **Reply to Tickets**: Send admin response (auto-closes)
- **Status Filtering**: By open/closed
- **Conversation View**: Ticket + admin reply side-by-side

### Settings Tab
- **Email Alerts**: Enable/disable admin notifications
- **Security**: Min password length configuration
- **Admin Profile**: Admin email for alerts
- **Persist Settings**: Saved to backend `/api/admin/settings`

---

## 🔧 Recent Fixes Applied

### 1. Django TEMPLATES Configuration
**Issue**: Admin panel required Django templates for template rendering.
**Fix**: Added `TEMPLATES` configuration to `backend_django/config/settings.py`

### 2. ErrorLog Table Migration
**Issue**: Error logs endpoint returned 500 because table didn't exist.
**Fix**: Created migration `0005_errorlog_alter_activitylog_options_user_groups_and_more.py` to add the `error_logs` table.

### 3. Error Logs Endpoint Decorator
**Issue**: `error_logs_list` view lacked authentication decorators.
**Fix**: Added `@require_http_methods(["GET"])` and `@require_admin` decorators to secure the endpoint.

---

## 🧪 Testing the Admin Panel

### Test Login
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "hachllersocials@gmail.com", "password": "12122007"}'
```
Returns: `{ "access_token": "...", "refresh_token": "...","token_type": "bearer" }`

### Test Admin Endpoints
```bash
# With Bearer token from login above
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/admin/activity-logs?page=1&page_size=5

curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/admin/users

curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/admin/error-logs?page=1&page_size=5
```

### Test UI Features
1. **Login** → Use admin credentials
2. **Navigate** → Click each sidebar item
3. **Search/Filter** → Use filter controls
4. **Actions** → Test lock/unlock user
5. **Export** → Download activity logs as CSV
6. **Pagination** → Go to next page

---

## 📝 API Endpoints

All endpoints require JWT token in header: `Authorization: Bearer <token>`

### Admin-Only Endpoints
- `GET /api/admin/activity-logs` - List activity logs (pagination, filters)
- `GET /api/admin/activity-logs/export` - Export logs as CSV
- `GET /api/admin/form-logs` - List form submissions
- `GET /api/admin/error-logs` - List frontend error logs **(NEW)**
- `GET /api/admin/users` - List all users
- `POST /api/admin/users/<id>/lock` - Lock/unlock user
- `GET /api/admin/support-tickets` - List support tickets
- `POST /api/admin/support-tickets/<id>/respond` - Respond to ticket
- `GET /api/admin/settings` - Get system settings
- `POST /api/admin/settings` - Update system settings

### Authentication Endpoints
- `POST /api/auth/login` - Login (email/password)
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/refresh` - Refresh JWT token
- `GET /api/health-check` - Health check

---

## 🐛 Troubleshooting

### Admin Panel Shows Login Page
- **Cause**: JWT token missing or invalid
- **Fix**: Clear `localStorage['token']` and login again

### "Admin privileges required" error
- **Cause**: Logged-in user role is not 'admin' or 'super_admin'
- **Fix**: Use the admin credentials provided above

### Error logs page returns 500
- **Cause**: Database migration not applied
- **Fix**: Run `python manage.py migrate` in backend_django directory

### CORS errors on API calls
- **Cause**: Frontend cannot reach backend
- **Fix**: Ensure Django server is running on port 8000 and Vite proxy is configured

### Vite server won't start on port 3003
- **Cause**: Port 3003 in use
- **Fix**: Kill the process or use a different port by modifying vite.config.ts

---

## 📦 Deployment

### Frontend (Vercel)
```bash
npm run build  # Creates dist/ folder
# Deploy dist/ folder to Vercel
```

### Backend (Render)
```bash
# Push to Git repo
git push origin main
# Render auto-deploys from Git
```

See `VERCEL_FIX.md` and `DEPLOYMENT_GUIDE.md` for detailed setup.

---

## 🎯 Next Steps

1. **Done**: Admin panel fully functional with real authentication
2. **Done**: All CRUD operations working (lock/unlock users, etc)
3. **Done**: Error logging to frontend
4. **Next**: Monitor admin panel in production (Render + Vercel)
5. **Next**: Add additional admin features as needed

---

## ✨ Summary

✅ **Admin authentication is real** (validates JWT + role)
✅ **All admin pages are working** (dashboard, users, activity, errors, forms, support, settings)
✅ **Admin actions are functional** (lock/unlock users, respond to tickets, update settings)
✅ **Error logging works** (frontend errors logged to /error-log endpoint)
✅ **Database is complete** (all migrations applied including ErrorLog table)

**Admin panel is ready to use!** 🚀
