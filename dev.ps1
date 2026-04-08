# dev.ps1 — start the AI Lab Guide dev environment
#
# Backend:  project venv Python on port 5001 (avoids clash with PM2 prod on 5000)
# Frontend: Vite dev server on port 5173 (proxies /api -> 5001)
#
# First time on a new machine?  Run auto_update.bat or see README.md.
#
# Usage:  .\dev.ps1
# Stop:   Ctrl+C in each window, or close the terminal windows.

$PYTHON = Join-Path $PSScriptRoot "venv\Scripts\python.exe"
$ROOT = $PSScriptRoot

if (-not (Test-Path $PYTHON)) {
    Write-Host "ERROR: Project venv not found. Run auto_update.bat or see README.md." -ForegroundColor Red
    exit 1
}

Write-Host "Starting backend on port 5001..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ROOT'; & '$PYTHON' app.py"

Write-Host "Starting frontend Vite dev server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ROOT\frontend'; npm run dev"

Write-Host ""
Write-Host "Backend:  http://localhost:5001" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host ""
Write-Host "Both servers are running in separate windows. Close them or press Ctrl+C to stop." -ForegroundColor Yellow
