# Backend Rebuild - Complete Documentation

## 🎯 Overview

The backend has been completely rebuilt and restructured according to enterprise-grade financial SaaS standards. The system now includes:

✅ **Robust Authentication** - JWT-based with user approval workflow
✅ **Role-Based Access Control** - Super Admin, Admin, and User roles
✅ **Account Approval Workflow** - Users must be approved by admins before login
✅ **Audit Logging** - Complete tracking of all user actions
✅ **Rate Limiting** - Protection against brute force and abuse
✅ **Email Notifications** - Automated emails for registrations, approvals, rejections
✅ **Transaction Management** - Unified income/expense tracking
✅ **Advanced Security** - Password hashing, token versioning, token invalidation

---

## 📊 Database Models

### User Model
```python
- id: Primary Key
- email: Unique, Index
- hashed_password: Bcrypt hashed
- full_name: User's name
- role: SUPER_ADMIN | ADMIN | USER (default: USER)
- status: PENDING | APPROVED | REJECTED (default: PENDING)
- is_active: Boolean (default: True)
- created_at: DateTime
- updated_at: DateTime
- last_login: DateTime (nullable)
- token_version: Integer (for token invalidation)
```

### Transaction Model
```python
- id: Primary Key
- title: Transaction title
- description: Optional details
- amount: Float (in HTG)
- category: String
- type: INCOME | EXPENSE
- date: DateTime
- created_at: DateTime
- updated_at: DateTime
- user_id: Foreign Key -> User
- workspace_id: Foreign Key -> Workspace (optional)
- vendor_id: Foreign Key -> Vendor (optional)
```

### Vendor Model
```python
- id: Primary Key
- name: Unique vendor name
- description: Optional
- commission_rate: Float
- total_commission_paid: Float
- created_at: DateTime
- updated_at: DateTime
```

### AuditLog Model
```python
- id: Primary Key
- action: String (LOGIN, REGISTER, CREATE_TRANSACTION, APPROVE_USER, etc.)
- user_email: Email of user performing action
- user_id: Foreign Key -> User
- ip_address: IP address of request
- details: JSON or text details
- timestamp: DateTime
```

---

## 🔐 Authentication Flow

### Registration
1. User registers with email, password, full_name
2. Account status set to **PENDING**
3. Welcome email sent (informing about pending approval)
4. User **cannot** login until approved

### Admin Approval
1. Admin views pending users via `/api/admin/pending-users`
2. Admin approves/rejects user
3. User receives email notification
4. **Only approved users can login**

### Login
1. User provides email and password
2. System checks:
   - User exists
   - Password is correct
   - Status is APPROVED
   - Account is ACTIVE
3. JWT tokens generated (access + refresh)
4. Last login timestamp updated
5. Login action logged in audit trail

### Token Management
- **Access Token**: 1440 minutes (24 hours)
- **Refresh Token**: 7 days
- **Token Versioning**: Increment on logout to invalidate all tokens
- **Token Invalidation**: Logout increments token_version, making old tokens invalid

---

## 📡 API Endpoints

### Authentication Routes
```
POST   /api/auth/register         - Register new user
POST   /api/auth/login            - Login user
POST   /api/auth/logout           - Logout user
POST   /api/auth/refresh          - Refresh access token
GET    /api/auth/me               - Get current user info
```

**Rate Limiting:**
- Register: 3/hour
- Login: 5/minute

### Admin Routes
```
GET    /api/admin/pending-users   - List pending users
GET    /api/admin/all-users       - List all users
POST   /api/admin/approve/{id}    - Approve pending user
POST   /api/admin/reject/{id}     - Reject pending user
POST   /api/admin/create-admin/{id} - Promote user to admin (super_admin only)
POST   /api/admin/deactivate-user/{id} - Deactivate user
GET    /api/admin/audit-logs      - View audit logs
```

**Access Control:**
- Requires ADMIN or SUPER_ADMIN role
- `/api/admin/create-admin` requires SUPER_ADMIN role

### Transaction Routes
```
POST   /api/transactions/          - Create new transaction
GET    /api/transactions/          - List user's transactions
GET    /api/transactions/{id}      - Get specific transaction
PUT    /api/transactions/{id}      - Update transaction
DELETE /api/transactions/{id}      - Delete transaction

GET    /api/transactions/stats/summary          - Overall statistics
GET    /api/transactions/stats/monthly-summary  - Monthly breakdown
```

**Filters:**
- `type_filter`: Filter by income/expense
- `category_filter`: Filter by category
- `skip` / `limit`: Pagination

---

## 🔒 Security Features

### Password Hashing
- Bcrypt with salt rounds
- 72-byte limit (bcrypt standard)
- Passwords hashed on registration and password reset

### JWT Tokens
```
Access Token Payload:
{
  "sub": "user@email.com",
  "role": "admin",
  "status": "approved",
  "version": 1,
  "exp": 1234567890,
  "type": "access"
}

Refresh Token Payload:
{
  "sub": "user@email.com", 
  "version": 1,
  "exp": 1234567890,
  "type": "refresh"
}
```

### Token Invalidation
- Logout increments `token_version`
- Any token with mismatched version is rejected
- Prevents use of stolen tokens

### Rate Limiting
- Prevents brute force attacks
- Prevents spam registrations
- Returns 429 Too Many Requests

### Audit Logging
- Every action logged with user, timestamp, IP, details
- Track changes for compliance and debugging
- Available to admins via `/api/admin/audit-logs`

---

## 📧 Email Notifications

### Registration Email
Sent when user registers. Content:
- Welcome message
- Status: pending approval
- Link to check status

### Approval Email
Sent when admin approves user. Content:
- Account approved
- Instructions to login
- Dashboard URL

### Rejection Email
Sent when admin rejects user. Content:
- Application rejected
- Support contact info

---

## 🎯 Default Users

The system creates default users on startup:

### Super Admin
- **Email**: `hachllersocials@gmail.com`
- **Password**: `12122007`
- **Role**: SUPER_ADMIN
- **Status**: APPROVED
- **Purpose**: Full system access, can manage admins

### Admin
- **Email**: `staff@finsys.ht`
- **Password**: `staff123`
- **Role**: ADMIN
- **Status**: APPROVED
- **Purpose**: Can approve/reject users, view audit logs

---

## 🚀 Features by User Role

### SUPER_ADMIN
- ✅ Full system access
- ✅ Approve/reject users
- ✅ Create/remove admins
- ✅ View audit logs
- ✅ Deactivate users
- ✅ Create transactions
- ✅ View all data

### ADMIN
- ✅ Approve/reject users
- ✅ View audit logs
- ✅ Deactivate users
- ✅ Create transactions
- ✅ View all data
- ❌ Cannot create admins

### USER
- ✅ Create transactions (income/expense)
- ✅ View own transactions
- ✅ Delete own transactions
- ✅ View own statistics
- ✅ Generate own reports
- ❌ Cannot see other users' data
- ❌ Cannot access admin functions

---

## 📊 Statistics & Reports

### Transaction Summary
```
GET /api/transactions/stats/summary
Returns:
{
  "total_income": 50000,
  "total_expense": 15000,
  "net_profit": 35000,
  "margin_percent": 70.0
}
```

### Monthly Breakdown
```
GET /api/transactions/stats/monthly-summary?year=2026
Returns:
{
  "year": 2026,
  "monthly_data": [
    {
      "month": 1,
      "income": 5000,
      "expense": 1500,
      "profit": 3500,
      "margin_percent": 70.0
    },
    ...
  ]
}
```

---

## 🔧 Configuration

### Environment Variables
```bash
# Database
DATABASE_URL=sqlite:///./finance.db

# Security
SECRET_KEY=your-super-secret-key-change-it-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Email (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_TLS=true
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAILS_FROM_EMAIL=your-email@gmail.com
EMAILS_FROM_NAME=Panacée FinSys

# CORS
BACKEND_CORS_ORIGINS=http://localhost:3000,http://localhost:5173,...
```

---

## 🐛 Error Handling

### Common Errors

**401 Unauthorized**
- Invalid credentials
- Token expired
- Token version mismatch

**403 Forbidden**
- Account not approved
- Account inactive
- Insufficient permissions
- Too many requests (rate limited)

**404 Not Found**
- User/Transaction/Vendor not found
- Invalid resource ID

**400 Bad Request**
- Missing required fields
- Invalid data format
- Duplicate email

---

## 🧪 Testing the Backend

### 1. Start the server
```bash
cd backend
python -m uvicorn app.main:app --reload
```

### 2. Visit Swagger UI
```
http://localhost:8000/docs
```

### 3. Test Registration
```bash
POST /api/auth/register
{
  "email": "testuser@email.com",
  "password": "securepassword123",
  "full_name": "Test User"
}
```

### 4. Approve User (as admin)
```bash
# Get user ID from database or registration response
POST /api/admin/approve/{user_id}
Authorization: Bearer <admin_token>
```

### 5. Login User
```bash
POST /api/auth/login
Form Data:
  username: testuser@email.com
  password: securepassword123
```

### 6. Create Transaction
```bash
POST /api/transactions/
Authorization: Bearer <user_token>
{
  "title": "Office Supplies",
  "description": "Monthly office supplies",
  "amount": 500.0,
  "category": "Office",
  "type": "expense",
  "date": "2026-02-10"
}
```

---

## 📚 API Documentation

Full interactive API docs available at:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

---

## ✨ Key Improvements

1. **User Approval Workflow**: No more unapproved accounts accessing the system
2. **Comprehensive Audit Trail**: Track every action for compliance
3. **Rate Limiting**: Prevents automated attacks
4. **Email Integration**: Users stay informed about account status
5. **Role-Based Access**: Different permissions for different users
6. **Token Versioning**: Advanced security against token replay attacks
7. **Transaction Management**: Unified system for income and expenses
8. **Professional Error Handling**: Clear error messages for debugging

---

## 🚨 Important Notes

⚠️ **Production Security**
- Change `SECRET_KEY` in production
- Use environment variables for all secrets
- Set up proper SMTP for email delivery
- Use HTTPS in production
- Set proper CORS origins

⚠️ **Database**
- Update `DATABASE_URL` for PostgreSQL in production
- Run migrations: `alembic upgrade head`
- Backup database regularly

⚠️ **Email Configuration**
- Set up Gmail App Password (not regular password)
- Or configure your email provider's SMTP settings
- Test email delivery before going live

---

## ✅ Backend is Ready!

The backend is fully restructured and ready for the frontend. All authentication, authorization, and business logic are now properly implemented following enterprise standards.

**Next Steps:**
1. Update frontend to login with user approval workflow
2. Add transaction creation forms
3. Implement statistics dashboard
4. Add report generation (PDF)

---

**Last Updated**: February 10, 2026
**Version**: 2.0.0 (Complete Rebuild)
**Status**: Production Ready ✅
