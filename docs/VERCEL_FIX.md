# 🚨 Quick Fix for Vercel 500 Error

Your Vercel deployment is failing because of a **configuration mismatch**. Here's the immediate fix:

## ⚡ Quick Steps (Do This Now)

### 1. Update Vercel Environment Variables

Go to: `https://vercel.com/your-username/panace-finsys`

1. Click **Settings**
2. Go to **Environment Variables**
3. Add/Update these:

```
VITE_API_BASE_URL=https://panace-api-xxxx.onrender.com/api
```

(Replace `panace-api-xxxx` with your actual Render domain)

### 2. Redeploy on Vercel

```bash
# Option A: Push to git (auto-deploys)
git push

# Option B: Manual redeploy in Vercel dashboard
# Click "Deployments" → Latest → "Redeploy"
```

### 3. Test

After deploy completes (~2-3 minutes):
1. Go to https://panace-finsys.vercel.app (or your Vercel domain)
2. Open DevTools (F12)
3. Check Console tab for errors
4. Check Network tab - API calls should go to panace-api-xxxx.onrender.com

---

## 🔍 Verify Your Setup

### ✅ Check Backend is Running
```bash
# Open this in browser:
https://panace-api-xxxx.onrender.com/api/health-check

# Should see:
# {"status": "healthy", "project_name": "Panacée Financial Management"}
```

### ✅ Check Frontend Loads
```bash
# Should load without 500 error:
https://panace-finsys.vercel.app
```

### ✅ Check Network Connection
1. Open DevTools (F12)
2. Go to Console tab
3. Try to login
4. Look for errors about:
   - `Cannot connect to localhost:8000` → Environment var is wrong
   - `CORS error` → Backend CORS not configured
   - `Network error` → Backend not running

---

## 🛠️ If Still Getting 500 Error

### Check Vercel Logs
```bash
# Go to: https://vercel.com
# Project → Deployments → Latest deploy
# Click "Function Logs" tab
# Look for what's crashing
```

### Check Render Logs
```bash
# Go to: https://render.com
# Select panace-api service
# Click "Logs" tab
# Look for Python/Django errors
```

### Check if Backend is Deployed
- Go to https://render.com
- Look for "panace-api" service
- If not there → Deploy it first (see DEPLOYMENT_GUIDE.md)
- If there → Check if Status is "Live" (not "Deploying")

---

## 📝 Current Status

After fixing, your setup should be:

```
Frontend:
- URL: https://panace-finsys.vercel.app (or custom domain)
- Environment: VITE_API_BASE_URL=https://panace-api-xxxx.onrender.com/api
- Status: ✅ Should show login page

Backend:
- URL: https://panace-api-xxxx.onrender.com
- Database: Included in Render
- Status: ✅ Should respond to /api/health-check

User Flow:
1. User goes to Vercel frontend
2. Frontend loads React app
3. User logs in via /api/auth/login
4. Request goes to Render backend
5. Backend returns JWT token
6. User can now use app
```

---

## 💡 Why This Happened

Your old `vercel.json` had:
```json
{
    "builds": [{"src": "backend/main.py", "use": "@vercel/python"}]
}
```

This told Vercel to run Python/backend code, but:
1. Your backend is FastAPI (old), not current Django
2. `backend/main.py` doesn't exist anymore
3. You shouldn't deploy backend on Vercel (it's meant for frontend)

**Solution:** Changed vercel.json to deploy only the **frontend** and point to **Render** backend.

---

## ✅ Success Indicators

When everything works, you should see:

1. **Homepage loads** - No errors
2. **Login page appears** - Can enter credentials
3. **Network tab shows** - API calls to panace-api-xxxx.onrender.com
4. **Console is clean** - No red errors
5. **Login works** - Can log in and see dashboard

---

**Still stuck? Check DEPLOYMENT_GUIDE.md for detailed troubleshooting!**
