<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Panace FinSys - Financial Management Dashboard

A high-end, production-ready financial management system for tracking income and expenses in Haitian Gourdes (HTG).

## 🚀 Quick Start (Production)

### 1. Backend Setup
1. Navigate to `backend/`.
2. Activate your virtual environment: `.\venv\Scripts\activate` (Windows).
3. Install dependencies: `pip install -r requirements.txt`.
4. Configure `.env`:
   - `DATABASE_URL`: Set to `sqlite:///./finance.db` (Default) or PostgreSQL.
   - `SMTP_PASSWORD`: Your Gmail App Password for notifications.
5. Run the server: `python -m uvicorn app.main:app --reload`.

### 2. Frontend Setup
1. From the root directory: `npm install`.
2. Run the dashboard: `npm run dev`.
3. Open [http://localhost:3000](http://localhost:3000).

## 🔐 Credentials
- **Admin**: `hachllersocials@gmail.com`
- **Password**: `admin`

## 📧 Email Notifications
The system automatically sends a welcome email to every newly registered user. Ensure `SMTP_PASSWORD` is set in the `backend/.env` for this feature to work.

## 🌐 Deployment (Cloud)

### Render Blueprint (Recommended)
1. Click **New +** on your [Render Dashboard](https://dashboard.render.com/) and select **Blueprint**.
2. Connect this repository.
3. Render will automatically detect the `render.yaml` and set up your **PostgreSQL Database**, **FastAPI API**, and **React Dashboard**!

### Post-Deployment Setup
- **API URL**: Once the API service is live, copy its URL (e.g., `https://panace-api.onrender.com/api`) and paste it into the `VITE_API_BASE_URL` environment variable in the `panace-web` service settings.
- **SMTP**: Set your `SMTP_PASSWORD` in the `panace-api` environment variables to enable welcome emails.

## ✨ Features
- **HTG Native**: Built-in support for Gourde formatting and 6-digit constraints.
- **PDF Export**: Generate financial reports instantly with charts and tables.
- **RBAC**: Role-based access control for Admins and Staff.
- **Real-time Analytics**: Dashboard with interactive Recharts visualizations.
