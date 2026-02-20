@echo off
cd /d "%~dp0"
if not exist venv (
  python -m venv venv
)
call venv\Scripts\activate.bat
pip install -q -r requirements.txt
python manage.py migrate --run-syncdb
echo.
echo Starting Django on http://localhost:8000 - keep this window open.
echo Then run "npm run dev" in the project root for the frontend.
echo.
python manage.py runserver 8000
