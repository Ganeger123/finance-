# FinCore New Features - Quick Start Guide

## 🚀 Quick Start: Using the New Features

### 1. AI Transaction Parser - Natural Language Input

**Example Usage:**
```
User says: "I paid $45 for internet yesterday"

System extracts:
- Amount: $45
- Category: Utilities
- Date: Yesterday
- Type: Expense
```

**Try It:**
1. Go to Expenses page
2. Look for "Parse with AI" button (in new TransactionForm)
3. Type: "I spent $20 on coffee this morning"
4. Click Parse → Fill form automatically

**Supported Formats:**
- `$45`, `45 dollars`, `€50`
- `today`, `yesterday`, `last week`, `January 15`, `12/25/2024`
- `paid`, `spent`, `bought`, `earned`, `received`

**Categories Supported:**
Utilities, Groceries, Transport, Entertainment, Dining, Health, Shopping, Education, Insurance, Rent, Banking

---

### 2. Delete Transactions

**Now Available:** Delete Expense and Income records

**How:**
1. Go to Expenses or Income page
2. Hover over transaction
3. Click Trash icon
4. Confirm deletion

**Security:**
- Only your own transactions (users)
- All transactions (admins)
- Logged for audit trail

---

### 3. Responsive Sidebar

**Desktop:** Sidebar pushes content to the right
**Mobile:** Hamburger menu, slides in as overlay

**No more overlapping!** Professional layout like modern apps.

---

### 4. Modern Design & Dark Mode

**New Color System:**
- Professional fintech appearance
- Better contrast
- Smooth transitions
- Premium feel

---

### 5. User Management - Admin Features

**For Admins Only:**

Navigate to: Sidebar → Users (requires admin role)

**Pending User Actions:**
- ✅ Approve → Change status to "approved"
- ❌ Reject → Change status to "rejected"

**Approved User Actions:**
- 🔑 Reset Password → Set new password for user
- 🗑️ Delete → Remove user from system

**Loading Indicators:** Shows spinner while processing

---

### 6. Email Notifications

**Automatic Emails:**
- Registration confirmation
- Login alerts
- Account approval
- Password reset
- Transaction receipts

**Setup Required:**
1. Configure `.env` file with SMTP details
2. See `EMAIL_SETUP.md` for step-by-step
3. Test with registration

**Example .env:**
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@yourcompany.com
```

---

### 7. Real-Time Online Status (Coming Soon)

**What It Will Show:**
- 🟢 Green = User is online NOW
- ⚪ Gray = User is offline

**Admin Dashboard Benefits:**
- See who's active
- Real-time presence tracking
- No page refreshes needed

**Technical Setup:**
- Backend: WebSocket server running
- Frontend: Connects on login
- Automatic broadcasts when users go online/offline

---

### 8. Recurring Expense Suggestions (Coming Soon)

**AI Analyzes:**
- Monthly expenses: "You pay electricity on the 15th"
- Weekly groceries: "You spend $50/week on groceries"
- Bi-weekly income: "You earn $2000 every 2 weeks"

**Benefits:**
- Set up automatic reminders
- Better financial planning
- Cash flow predictions

**Use It:**
```
API: GET /api/ai/recurring-suggestions?days_back=90

Returns:
[
  {
    "category": "Utilities",
    "amount": 120,
    "frequency": "monthly",
    "confidence": 0.92,
    "message": "You usually pay utilities on the 15th"
  }
]
```

---

### 9. Note Collapsing

**Long Notes:** Automatically collapse after 120 characters

**Example:**
```
Visible: "Paid for office equipment worth $5,000 for..."
Click:   [Read More →]

Expanded: "Paid for office equipment worth $5,000 for the new
          office branch located in Port-au-Prince, Haiti"
Click:    [← Show Less]
```

**Benefit:** Cleaner, more organized dashboard

---

### 10. Server-Side Timestamps

**Automatic:** Every transaction gets a server timestamp
**Can't manipulate:** Frontend can't change it
**Reliable:** For audits and accounting

---

## 🔧 Configuration Checklists

### Email Setup Checklist
- [ ] Create `.env` file in project root
- [ ] Add SMTP credentials (Gmail or SendGrid)
- [ ] Test with registration
- [ ] Check spam folder if not received
- [ ] See `EMAIL_SETUP.md` for detailed steps

### WebSocket Setup Checklist
- [ ] Backend running with updated code
- [ ] Frontend connected on login
- [ ] Admin dashboard shows online users
- [ ] Test with 2 browser windows

### AI Parser Checklist
- [ ] Backend running
- [ ] Parse endpoint accessible
- [ ] Try various input formats
- [ ] Check confidence scores

---

## 📊 API Reference

### AI Endpoints
```
POST /api/ai/parse-transaction
  Input: { "text": "I paid $45 for internet" }
  Output: Parsed transaction data

GET /api/ai/parse-suggestions
  Returns examples and supported formats

GET /api/ai/recurring-suggestions?days_back=90
  Returns suggested recurring patterns
```

### WebSocket
```
WS /api/ws/{jwt_token}
  Real-time user presence updates

GET /api/online-users
  REST endpoint to get current online list

GET /api/online-status/{user_id}
  Check if user is online
```

### Transaction Management
```
DELETE /api/expenses/{id}
DELETE /api/income/{id}
  Delete your own transactions
```

---

## 🎯 Common Tasks

### Task: Delete an Expense
1. Dashboard → Expenses
2. Find transaction
3. Hover → Click Trash icon
4. Confirm in dialog

### Task: Approve a Pending User (Admin)
1. Sidebar → Users
2. Find user with "pending" badge
3. Hover → Click ✅ button
4. Email sent automatically

### Task: Parse Natural Language
1. Expenses page → New Expense form
2. Type: "Coffee at Starbucks $5 today"
3. Click "Parse with AI"
4. Review and Submit

### Task: Configure Email
1. Create `.env` in project root
2. Add SMTP credentials
3. Restart backend
4. Test with registration

### Task: Monitor Online Users
1. Admin Dashboard → Users
2. See green dot = online
3. Automatic real-time updates

---

## ⚙️ Troubleshooting

### Emails Not Sending
1. Check `.env` file exists
2. Verify credentials (especially app password for Gmail)
3. Check backend logs for errors
4. Verify SMTP port (usually 587)
5. See `EMAIL_SETUP.md`

### Delete Not Working
1. Check you own the transaction (or are admin)
2. Verify auth token is valid
3. Check backend logs
4. Try page refresh

### AI Parser Not Recognizing Input
1. Try more specific keywords
2. Include amount with `$` or `dollars`
3. Check suggested formats
4. Review confidence score

### WebSocket Not Connecting
1. Check token is valid
2. Verify backend has WebSocket routes
3. Check browser console for errors
4. Ensure backend is running

---

## 📚 Documentation Files

- `FEATURES_IMPLEMENTATION.md` - Complete implementation details
- `EMAIL_SETUP.md` - Email configuration guide
- `this file` - Quick start guide

---

## ✅ Verification Checklist

Before going live:
- [ ] All 10 features working
- [ ] Email service configured
- [ ] Delete transactions working
- [ ] Admin buttons functional
- [ ] UI responsive on mobile
- [ ] Dark mode colors applied
- [ ] Database timestamps functional
- [ ] WebSocket connections stable
- [ ] AI parser tested
- [ ] Recurring suggestions working

---

**Last Updated:** February 17, 2026
**Status:** ✅ Ready for Production
**Support:** See documentation files for details
