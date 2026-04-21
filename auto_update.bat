@echo off
:: Redirect all output to auto_update.log for debugging
cd /d "C:\Users\AI-Lab\Desktop\AI-LAB-GUIDE\"
call :run > auto_update.log 2>&1
exit /b %ERRORLEVEL%

:run
echo [%date% %time%] Starting auto-update...

:: --------------------------------------------------------------------------
:: Environment fix for Task Scheduler.
:: Task Scheduler does not always set HOMEPATH, which breaks PM2
:: (it defaults to C:\etc\.pm2 instead of the user's home).
:: --------------------------------------------------------------------------
if "%HOMEPATH%"=="" set "HOMEPATH=\Users\AI-Lab"
if "%HOMEDRIVE%"=="" set "HOMEDRIVE=C:"
set "PM2_HOME=C:\Users\AI-Lab\.pm2"
echo [%date% %time%] PM2_HOME=%PM2_HOME%

:: --------------------------------------------------------------------------
:: HuggingFace auth
:: Token lives in secrets.bat (gitignored). Create it once on each machine:
::   echo set HF_TOKEN=hf_YOUR_TOKEN_HERE > secrets.bat
:: --------------------------------------------------------------------------
IF EXIST "secrets.bat" (
    call secrets.bat
    echo [%date% %time%] HuggingFace token loaded.
) ELSE (
    echo [%date% %time%] WARNING: secrets.bat not found. SAM3 model download may fail.
)

:: --------------------------------------------------------------------------
:: Git - force local state to match origin/master exactly.
:: reset --hard means local changes and merge conflicts are impossible.
:: secrets.bat and auto_update.log are gitignored so they are untouched.
:: --------------------------------------------------------------------------
echo [%date% %time%] Syncing to origin/master...
git checkout master
git fetch origin master
git reset --hard origin/master
echo [%date% %time%] Git sync done.

:: --------------------------------------------------------------------------
:: One-time bootstrap (safe to run on every reboot)
:: --------------------------------------------------------------------------

IF NOT EXIST "venv\Scripts\python.exe" (
    echo [%date% %time%] Creating Python venv...
    python -m venv venv
)

:: --------------------------------------------------------------------------
:: PyTorch CUDA must be installed BEFORE requirements.txt, because timm
:: depends on torch and pip will pull in CPU-only torch from PyPI if torch
:: is not already present. We check for CUDA specifically, not just torch.
:: --------------------------------------------------------------------------
venv\Scripts\python.exe -c "import torch; assert torch.cuda.is_available()" 2>NUL || (
    echo [%date% %time%] Installing PyTorch with CUDA support...
    call venv\Scripts\pip.exe install torch==2.10.0+cu130 torchaudio==2.10.0+cu130 torchvision==0.25.0+cu130 --index-url https://download.pytorch.org/whl/cu130
)

:: --------------------------------------------------------------------------
:: Now install/update Python dependencies. torch is already present with
:: CUDA, so pip will skip pulling CPU torch when resolving timm's deps.
:: --------------------------------------------------------------------------
echo [%date% %time%] Installing/updating Python dependencies...
call venv\Scripts\pip.exe install -r requirements.txt

:: --------------------------------------------------------------------------
:: SAM3 from our Windows-patched fork (--no-deps because deps are in
:: requirements.txt already).
:: --------------------------------------------------------------------------
venv\Scripts\python.exe -c "import sam3" 2>NUL || (
    echo [%date% %time%] Installing SAM3 from fork...
    call venv\Scripts\pip.exe install --no-deps "git+https://github.com/jroberts-fellow/sam3-AI-LAB-GUIDE.git"
)

:: --------------------------------------------------------------------------
:: Rebuild frontend
:: --------------------------------------------------------------------------
echo [%date% %time%] Rebuilding frontend...
cd frontend
call npm install
call npm run build
cd ..

:: --------------------------------------------------------------------------
:: Start the app via PM2.
:: Always kill the daemon first to clear any broken socket state,
:: then start fresh from the ecosystem file.
:: --------------------------------------------------------------------------
echo [%date% %time%] Stopping PM2 daemon...
call pm2 kill
echo [%date% %time%] Killing any orphaned waitress processes...
taskkill /F /IM waitress-serve.exe >NUL 2>&1
echo [%date% %time%] Starting PM2 fresh...
call pm2 start ecosystem.config.js
call pm2 save
echo [%date% %time%] PM2 started.

echo [%date% %time%] Done! App running on http://localhost:5000
exit /b 0
