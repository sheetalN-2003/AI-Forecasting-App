@echo off
echo Starting AI Forecasting App...

:: Start Backend
echo Starting Backend...
start cmd /k "cd backend && venv\Scripts\activate && uvicorn app.main:app --reload --port 8000"

:: Wait a moment for backend to initialize
timeout /t 3 /nobreak > nul

:: Start Frontend
echo Starting Frontend...
start cmd /k "cd frontend && npm run dev"

echo Done! Backend will be at http://localhost:8000/docs and Frontend at http://localhost:5173
pause
