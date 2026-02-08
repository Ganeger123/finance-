# Internal Financial Management System (HTG) - Backend

Production-ready FastAPI backend for managing expenses and income in Haitian Gourdes.

## Features
- **JWT Authentication**: Secure login and role-based access control (Admin/Standard).
- **Expense Tracking**: Register expenses with categories and 6-digit HTG validation.
- **Income Management**: Track income from formations (auto-calculated) and platform.
- **Search & Filter**: Powerful search by category, type, and date range.
- **Admin Dashboard**: Real-time totals, net results, and financial observation.

## Setup Instructions

### 1. Prerequisites
- Python 3.8+
- PostgreSQL

### 2. Environment Setup
Create a `.env` file in the `backend/` directory:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/finance_db
SECRET_KEY=your-super-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

### 3. Installation
```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Running the API
```powershell
.\venv\Scripts\activate
uvicorn app.main:app --reload
```

The documentation will be available at `http://localhost:8000/docs`.

### 5. Database Migrations (Optional)
To set up migrations:
```bash
alembic init migrations
```
Then configure `alembic.ini` and run `alembic revision --autogenerate` and `alembic upgrade head`.
