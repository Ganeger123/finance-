# Panacée FinSys — Financial Management Dashboard

A comprehensive Fintech SaaS application for detailed financial analytics, transaction tracking, and user management. Designed for the Haitian market with HTG-based accounting and modern gradients.

## 📁 Project Structure

```text
panace-finsys/
├── frontend/       # React + Vite + Tailwind CSS
├── backend/        # Django + REST Framework + SQLite/Postgres
├── docs/           # Documentation and Setup Guides
├── .env.example    # Environment variables template
└── README.md
```

## 🛠️ Local Setup

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)

### Backend Setup
1. `cd backend`
2. `python -m venv venv`
3. `venv\Scripts\activate` (Windows) or `source venv/bin/activate` (Mac/Linux)
4. `pip install -r requirements.txt`
5. `python manage.py migrate`
6. `python manage.py runserver`

### Frontend Setup
1. `cd frontend`
2. `npm install`
3. `npm run dev`

## 🚀 Deployment

### Frontend (Vercel)
- The project is ready for Vercel. 
- Point your Vercel project to the `frontend/` directory.
- Set `VITE_API_URL` in the Vercel Dashboard.

### Backend (Render/Heroku)
- The project includes `render.yaml` for easy deployment on Render.
- Point Render to the `backend/` directory.
- Set `SECRET_KEY`, `DATABASE_URL`, and other env variables in the Render Dashboard.

## ⚙️ Environment Variables

Copy `.env.example` to `.env` in the respective folders and fill in your values.

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | Backend API URL (e.g. https://api.yourdomain.com/api) |
| `SECRET_KEY` | Django Secret Key |
| `DEBUG` | Set to False in production |
| `DATABASE_URL` | Postgres Connection String |
| `SMTP_*` | Email Settings for notifications |
