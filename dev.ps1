# dev.ps1 — start the SAM Playground dev environment
#
# Backend:  SAM3 venv Python on port 5001 (avoids clash with PM2 prod on 5000)
# Frontend: Vite dev server on port 5173 (proxies /api -> 5001)
#
# Usage:  .\dev.ps1
# Stop:   Ctrl+C in each window, or close the terminal windows.

$SAM_PYTHON = "C:\Users\AI-Lab\Desktop\SAM3\venv\Scripts\python.exe"
$ROOT = $PSScriptRoot

Write-Host "Starting backend on port 5001 (SAM3 venv)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ROOT'; & '$SAM_PYTHON' app.py"

Write-Host "Starting frontend Vite dev server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ROOT\frontend'; npm run dev"

Write-Host ""
Write-Host "Backend:  http://localhost:5001" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host ""
Write-Host "Both servers are running in separate windows. Close them or press Ctrl+C to stop." -ForegroundColor Yellow
