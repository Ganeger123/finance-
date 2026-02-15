# Panacée FinSys – Django API

Backend API for the Panacée FinSys frontend. Run this so the frontend (Vite dev server) can call `/api/*` via proxy without CORS issues.

## Quick start (local)

1. **Create virtualenv and install deps**
   ```bash
   cd backend_django
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # macOS/Linux:
   # source venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Migrations and run server**
   ```bash
   python manage.py migrate
   python manage.py runserver 8000
   ```

3. **Start the frontend** (from project root)
   ```bash
   npm run dev
   ```
   Open http://localhost:3000 or http://localhost:3001. Login with:
   - **Admin:** hachllersocials@gmail.com / 12122007  
   - **Staff:** staff@finsys.ht / staff123  

The Vite dev server proxies `^/api/` to `http://localhost:8000`, so you must run this Django server on port **8000**.

## API endpoints (auth)

- `POST /api/auth/login` – form body: `username`, `password` → `{ access_token, refresh_token, token_type }`
- `POST /api/auth/register` – JSON: `{ email, password, full_name?, role? }` → user
- `POST /api/auth/refresh` – query `?refresh_token=...` or JSON body → new tokens
- `GET /api/auth/me` – header `Authorization: Bearer <token>` → current user
- `GET /api/health-check` – health check

## Environment

- `SECRET_KEY` – used for JWT and Django (defaults to a dev key).
- `BACKEND_CORS_ORIGINS` – optional comma-separated list of extra CORS origins.
- `DEBUG` – set to `False` in production.
