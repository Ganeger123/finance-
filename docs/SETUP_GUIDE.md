# FinCore Application - Complete Setup & Deployment Guide

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- Node.js 16+
- Git

### Step 1: Environment Setup

#### Backend (.env)
```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` with your settings:
```
JWT_SECRET=your-super-secret-key
DATABASE_URL=sqlite:///./fincore.db
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
ADMIN_EMAIL=lindamorency123@gmail.com
```

#### Frontend (.env.local)
Create `.env.local` in the project root:
```
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

### Step 2: Install Dependencies

**Backend:**
```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate  # Windows
source .venv/bin/activate      # macOS/Linux
pip install -r requirements.txt
```

**Frontend:**
```bash
npm install
```

### Step 3: Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

Frontend: http://127.0.0.1:5173
Backend: http://127.0.0.1:8000

## 🔐 Security Features Implemented

### ✅ Role-Based Access Control (RBAC)
- Users have a `role` field: "user" or "admin"
- Assigned automatically on signup (default: "user")
- Protected admin routes require admin role
- Frontend prevents access to admin pages for non-admins

### ✅ Email Notifications
Email sent on:
- User registration
- User login
- User logout
- Password changed
- Transaction created (income/expense)
- Account approval

### ✅ System Logging
All admin actions logged:
- User approvals/rejections
- Password resets
- User deletions
- Transactions created
- Login/logout events

### ✅ Authentication
- JWT token-based authentication
- Password hashing with bcrypt
- Token validation on all protected endpoints
- Token included in Authorization header

### ✅ CORS Configuration
Configured for:
- `http://localhost:5173` (local dev)
- `http://127.0.0.1:5173`
- `http://localhost:8085` (alternative port)
- Production domains (add as needed)

## 📋 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Transactions
- `GET /api/expenses/` - Get user expenses
- `POST /api/expenses/` - Create expense (sends email)
- `GET /api/income/` - Get user income
- `POST /api/income/` - Create income (sends email)
- `GET /api/dashboard/stats` - Get dashboard stats

### Profile
- `POST /api/profile/photo` - Upload profile photo
- `PUT /api/profile/name` - Update username
- `GET /api/profile/me` - Get profile info

### Admin (role="admin" required)
- `GET /api/admin/users/` - List users
- `POST /api/admin/users/{id}/approve` - Approve user
- `POST /api/admin/users/{id}/reject` - Reject user
- `POST /api/admin/users/{id}/delete` - Delete user
- `POST /api/admin/users/{id}/reset-password` - Reset password
- `GET /api/admin/logs` - View system logs

## 🐛 Troubleshooting

### Vite Proxy Error
```
[vite] http proxy error: /api/auth/register
```
**Solution:**
1. Ensure backend is running on port 8000
2. Check `vite.config.ts` proxy configuration
3. Check browser DevTools Network tab for exact error
4. Verify backend CORS settings

### Backend Not Reachable
```bash
# Check backend is running
curl http://127.0.0.1:8000/

# Check port is available
netstat -ano | findstr :8000  # Windows
lsof -i :8000                  # macOS/Linux
```

### Token Expired
- Token expires after 24 hours
- Frontend automatically refreshes token on 401 error
- Clear localStorage if stuck: `localStorage.clear()`

### Email Not Sending
1. Check SMTP credentials in `.env`
2. For Gmail: use app-specific password, not regular password
3. Check firewall allows port 587
4. Check admin email is valid

### Database Locked (SQLite)
```bash
# Delete and recreate database
rm backend/fincore.db
# Restart backend to recreate schema
```

## 📊 Testing Workflow

### Register & Login
1. Register at http://127.0.0.1:5173
2. Admin must approve from admin panel
3. User can then login

### Create Transaction
1. Login as approved user
2. Click "Add Expense" or "Add Income"
3. Fill form and submit
4. Email notification sent automatically
5. Transaction appears in dashboard

### Admin Functions
1. Login with admin credentials
2. Navigate to Users page
3. Approve pending users
4. View system logs
5. Reset user passwords

## 🔧 Configuration Reference

### Database Models
- **User**: id, email, name, password (hashed), role, status, photo_url
- **Transaction**: id, user_id, type, amount, category, date, comment
- **SystemLog**: id, user_id, action, details, ip_address, timestamp

### User Statuses
- `pending` - Awaiting admin approval
- `approved` - Active account
- `rejected` - User cannot login

### User Roles
- `user` - Regular user
- `admin` - Administrator
- `super_admin` - Super administrator

## 📱 Frontend Features

### Protected Routes
- `/` (Dashboard) - Requires login
- `/admin/*` - Requires admin role
- Login redirects to dashboard if already authenticated

### Error Handling
- Network errors show helpful messages
- API errors display user-friendly notifications
- Token errors trigger re-login

### Dark Mode
- Configured in ThemeContext
- Persisted in localStorage

## 🚢 Deployment

### Docker Deployment
```dockerfile
# Backend
FROM python:3.9
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install -r requirements.txt
COPY backend/ .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Production Checklist
- [ ] Change JWT_SECRET to strong random value
- [ ] Set DATABASE_URL to PostgreSQL (not SQLite)
- [ ] Configure SMTP credentials
- [ ] Update CORS_ORIGINS for production domain
- [ ] Set DEBUG=False
- [ ] Use HTTPS only
- [ ] Set proper Secret Key
- [ ] Configure allowed hosts

## 📞 Support

For issues:
1. Check logs: `backend/server_error.log`
2. Check browser console for frontend errors
3. Verify environment variables are set
4. Check CORS headers in Network tab

---

**Last Updated: February 17, 2026**
