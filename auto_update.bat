@echo off
echo [%date% %time%] Starting Auto-Update Check...

:: Navigate to the project folder
:: /d flag ensures it changes drives if necessary (e.g., from C: to D:)
cd /d "C:\Users\AI-Lab\Desktop\AI-LAB-GUIDE\"

:: ── HuggingFace auth (needed to download SAM3 weights on first use) ──────────
:: Token lives in secrets.bat (gitignored) — never committed to source control.
:: Create secrets.bat once on each machine:
::   echo set HF_TOKEN=hf_YOUR_TOKEN_HERE > secrets.bat
IF EXIST "secrets.bat" (
    call secrets.bat
) ELSE (
    echo [%date% %time%] WARNING: secrets.bat not found. SAM3 model download may fail.
    echo [%date% %time%]          Create secrets.bat with: set HF_TOKEN=hf_YOUR_TOKEN_HERE
)

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

:: ── Pull latest code from GitHub ─────────────────────────────────────────────

:: Fetch latest history from GitHub (doesn't change local files yet)
git fetch origin master

:: Count how many commits the local branch is behind the remote
FOR /F "tokens=*" %%i IN ('git rev-list HEAD...origin/master --count') DO SET NEW_COMMITS=%%i

:: If 0 commits behind, exit gracefully
IF "%NEW_COMMITS%"=="0" (
    echo [%date% %time%] App is already up to date. No action needed.
    exit /b 0
)

echo [%date% %time%] Found %NEW_COMMITS% new updates. Pulling code...
git pull origin master

:: Rebuild frontend (source files are tracked, not /dist)
echo [%date% %time%] Rebuilding frontend...
cd frontend
call npm install
call npm run build
cd ..

:: Update Python dependencies in case requirements.txt changed
echo [%date% %time%] Checking for new Python dependencies...
call venv\Scripts\pip.exe install -r requirements.txt

:: Restart the background service so it picks up the new code
echo [%date% %time%] Restarting PM2 service...
call pm2 restart AILabGuide

echo [%date% %time%] Update complete!
exit /b 0
