# Deployment Guide - Vercel & Render

This project has a separate **Frontend** and **Backend** architecture:
- **Frontend (Vite/React)** → Deploy on **Vercel**
- **Backend (Django)** → Deploy on **Render** (already configured) or Railway

## 🚀 Deployment Steps

### STEP 1: Deploy Backend to Render (Django)

Your backend is already configured for Render. Follow this:

1. **Go to:** https://render.com
2. **Create Account** (if not already done)
3. **Connect GitHub Repository** (your panacefintech repo)
4. **Create New Web Service:**
   - Name: `panace-api`
   - Environment: `Python`
   - Build Command: `pip install -r requirements.txt && python manage.py migrate`
   - Start Command: `gunicorn config.wsgi:application`
   - Region: Choose closest to your location

5. **Set Environment Variables** in Render:
   ```
   SECRET_KEY=your-secure-random-key
   DEBUG=False
   ALLOWED_HOSTS=*.onrender.com,panace-web.onrender.com
   BACKEND_CORS_ORIGINS=https://panace-web.vercel.app
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-app-password
   ADMIN_EMAIL=admin@example.com
   ```

6. **Deploy** - Render will automatically deploy on git push

7. **Note the URL:** `https://panace-api-xxxx.onrender.com`

### STEP 2: Update Frontend Environment Variables

Update your `.env.local` (or create one in Vercel):

```env
VITE_API_BASE_URL=https://panace-api-xxxx.onrender.com/api
GEMINI_API_KEY=your-gemini-key
```

Replace `panace-api-xxxx` with your actual Render domain.

### STEP 3: Deploy Frontend to Vercel

1. **Go to:** https://vercel.com
2. **Import Project:** 
   - Select your `panacefintech` GitHub repository
   - Framework: **Vite**

3. **Configure Build Settings:**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Set Environment Variables** in Vercel:
   - Add `VITE_API_BASE_URL` = `https://panace-api-xxxx.onrender.com/api`

5. **Deploy** - Click "Deploy"

6. **Get Frontend URL:** `https://panace-web-xxxx.vercel.app`

### STEP 4: Update CORS on Backend

Now that you have both URLs, update the backend's `BACKEND_CORS_ORIGINS`:

```
BACKEND_CORS_ORIGINS=https://panace-web-xxxx.vercel.app
```

Redeploy Render with this updated value.

---

## 🔧 Troubleshooting Vercel 500 Error

### Cause 1: Missing Environment Variables
**Fix:** Add `VITE_API_BASE_URL` to Vercel Environment Variables

### Cause 2: Backend Not Running
**Fix:** Ensure Render backend is deployed and running
- Check Render dashboard for errors
- View Render logs: `Settings → Logs`

### Cause 3: API URL Mismatch
**Fix:** Verify CORS configuration:
```bash
# Check in backend settings
BACKEND_CORS_ORIGINS=https://your-vercel-domain.vercel.app
```

### Cause 4: Build Failed
**Fix:** Check Vercel build logs:
1. Go to Vercel dashboard
2. Click your deployment
3. View "Build Logs" tab
4. Look for error messages like missing dependencies

---

## 📋 Deployment Checklist

- [ ] Backend deployed on Render
- [ ] Render environment variables set correctly
- [ ] Frontend `.env.local` updated with Render API URL
- [ ] Frontend deployed on Vercel
- [ ] Vercel environment variables set (`VITE_API_BASE_URL`)
- [ ] CORS configured to allow Vercel domain
- [ ] Test login page loads
- [ ] Test API call (add expense)
- [ ] Check browser console for errors
- [ ] Check network tab (no CORS errors)

---

## 🧪 Testing After Deployment

### Test Login Flow:
```bash
# Open browser console
# Go to https://your-vercel-domain.vercel.app
# Try login
# Check console for errors
```

### Check Network Requests:
1. Open DevTools (F12)
2. Go to Network tab
3. Try adding an expense
4. Verify API calls go to Render backend
5. Check response status (should be 2xx, not 5xx)

### Check CORS Issues:
If you see CORS errors in console:
1. Check Vercel deployment domain
2. Update `BACKEND_CORS_ORIGINS` on Render
3. Redeploy Render
4. Wait 2 minutes for changes to propagate
5. Hard refresh browser (Ctrl+Shift+R)

---

## 🚨 If You Still Get 500 Error

1. **Check Render Logs:**
   ```bash
   # Go to https://render.com
   # Select panace-api service
   # Click "Logs" tab
   # Look for error messages
   ```

2. **Check Vercel Logs:**
   ```bash
   # Go to https://vercel.com
   # Select your project
   # Click deployment
   # View "Function Logs" tab
   ```

3. **Test Backend Directly:**
   ```bash
   # Open in browser:
   https://panace-api-xxxx.onrender.com/api/health-check
   # Should return: {"status": "healthy", "project_name": "..."}
   ```

4. **Test Frontend Build Locally:**
   ```bash
   npm run build
   npm run preview
   # Should load without errors on localhost:4173
   ```

---

## 📞 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Cannot connect to backend" | Check VITE_API_BASE_URL in Vercel env vars |
| "CORS error" | Add Vercel domain to BACKEND_CORS_ORIGINS on Render |
| "Login fails with 500" | Check Render backend logs for database errors |
| "Network timeout" | Render free tier may be sleeping; redeploy/wake it up |
| "Build fails on Vercel" | Check Vercel build logs for missing dependencies |

---

## 📚 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Browser                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │  Vercel Frontend       │
        │  (Vite React App)      │
        │  panace-web.vercel.app │
        └────────┬───────────────┘
                 │
        API Calls (HTTPS)
                 │
                 ▼
        ┌────────────────────────┐
        │  Render Backend        │
        │  (Django)              │
        │  panace-api.onrender.com│
        └────────┬───────────────┘
                 │
                 ▼
        ┌────────────────────────┐
        │  PostgreSQL            │
        │  (Database)            │
        └────────────────────────┘
```

---

## ⚡ Performance Tips

1. **Use Vercel's Edge Functions** for static assets
2. **Enable Caching** on Vercel (default 3600s for most files)
3. **Monitor Build Times** - keep under 60 seconds
4. **Optimize Images** - use next/image or similar
5. **Set appropriate Cache-Control headers** (in vercel.json)

---

## 🔐 Security Checklist

- [ ] `DEBUG=False` in production (Render)
- [ ] `SECRET_KEY` is unique and strong
- [ ] `ALLOWED_HOSTS` only includes your domains
- [ ] `BACKEND_CORS_ORIGINS` is whitelisted (not "*")
- [ ] Environment variables NOT in git (use .env.local, .env.example)
- [ ] HTTPS enabled (Vercel & Render provide this)
- [ ] No API keys exposed in frontend code

---

**Issues? Check logs on both Vercel and Render dashboards!**
