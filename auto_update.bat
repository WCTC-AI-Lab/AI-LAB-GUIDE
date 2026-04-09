@echo off
:: ── Logging — all output goes to auto_update.log ─────────────────────────────
cd /d "C:\Users\AI-Lab\Desktop\AI-LAB-GUIDE\"
call :run > auto_update.log 2>&1
exit /b %ERRORLEVEL%

:run
echo [%date% %time%] Starting Auto-Update Check...

:: ── HuggingFace auth (needed to download SAM3 weights on first use) ──────────
:: Token lives in secrets.bat (gitignored) — never committed to source control.
:: Create it once on each machine:  echo set HF_TOKEN=hf_YOUR_TOKEN > secrets.bat
IF EXIST "secrets.bat" (
    call secrets.bat
    echo [%date% %time%] HuggingFace token loaded from secrets.bat.
) ELSE (
    echo [%date% %time%] WARNING: secrets.bat not found. SAM3 model download may fail.
    echo [%date% %time%]          Create secrets.bat with: set HF_TOKEN=hf_YOUR_TOKEN_HERE
)

:: ── Ensure we are on master and discard any local changes ────────────────────
:: Using reset --hard instead of pull so local changes / merge conflicts
:: can never block the update. secrets.bat is gitignored so it is untouched.
echo [%date% %time%] Switching to master branch...
git checkout master
git fetch origin master
echo [%date% %time%] Resetting to origin/master...
git reset --hard origin/master

:: ── One-time bootstrap (safe to run on every reboot) ─────────────────────────

:: Create the Python venv if it doesn't exist yet
IF NOT EXIST "venv\Scripts\python.exe" (
    echo [%date% %time%] Creating Python virtual environment...
    python -m venv venv
    echo [%date% %time%] Installing Python dependencies...
    call venv\Scripts\pip.exe install -r requirements.txt
)

:: Install PyTorch CUDA if not already present (requires special index URL)
venv\Scripts\python.exe -c "import torch" 2>NUL || (
    echo [%date% %time%] Installing PyTorch with CUDA support...
    call venv\Scripts\pip.exe install torch==2.10.0+cu130 torchaudio==2.10.0+cu130 torchvision==0.25.0+cu130 --index-url https://download.pytorch.org/whl/cu130
)

:: Install SAM3 from our fork if not already present
:: Fork includes Windows fix: triton import wrapped in try/except with scipy fallback
venv\Scripts\python.exe -c "import sam3" 2>NUL || (
    echo [%date% %time%] Installing SAM3...
    call venv\Scripts\pip.exe install --no-deps "git+https://github.com/jroberts-fellow/sam3-AI-LAB-GUIDE.git"
)

:: ── Rebuild frontend ──────────────────────────────────────────────────────────
echo [%date% %time%] Rebuilding frontend...
cd frontend
call npm install
call npm run build
cd ..

:: ── Update Python dependencies in case requirements.txt changed ──────────────
echo [%date% %time%] Checking for new Python dependencies...
call venv\Scripts\pip.exe install -r requirements.txt

:: ── Start or restart the background service ──────────────────────────────────
echo [%date% %time%] Starting/restarting PM2 service...
pm2 describe AILabGuide >NUL 2>&1
IF %ERRORLEVEL%==0 (
    call pm2 restart AILabGuide
) ELSE (
    call pm2 start "venv\Scripts\waitress-serve.exe --host 0.0.0.0 --port 5000 app:app" --name AILabGuide
    call pm2 save
)

echo [%date% %time%] Done!
exit /b 0
