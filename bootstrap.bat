@echo off
:: ======================================================================
:: bootstrap.bat  --  build, install, and start everything
::
:: Called by auto_update.bat AFTER git sync, so this file is always the
:: latest version from master. Add new apps, dependencies, or PM2
:: entries here freely -- changes take effect on the next reboot.
:: ======================================================================
echo [%date% %time%] === bootstrap.bat starting ===

:: --------------------------------------------------------------------------
:: AI Lab Guide -- Python venv + dependencies
:: --------------------------------------------------------------------------
IF NOT EXIST "venv\Scripts\python.exe" (
    echo [%date% %time%] Creating Python venv...
    python -m venv venv
)

:: PyTorch CUDA must be installed BEFORE requirements.txt, because timm
:: depends on torch and pip will pull in CPU-only torch from PyPI otherwise.
venv\Scripts\python.exe -c "import torch; assert torch.cuda.is_available()" 2>NUL || (
    echo [%date% %time%] Installing PyTorch with CUDA support...
    call venv\Scripts\pip.exe install torch==2.10.0+cu130 torchaudio==2.10.0+cu130 torchvision==0.25.0+cu130 --index-url https://download.pytorch.org/whl/cu130
)

echo [%date% %time%] Installing/updating Python dependencies...
call venv\Scripts\pip.exe install -r requirements.txt

:: SAM3 from our Windows-patched fork
venv\Scripts\python.exe -c "import sam3" 2>NUL || (
    echo [%date% %time%] Installing SAM3 from fork...
    call venv\Scripts\pip.exe install --no-deps "git+https://github.com/jroberts-fellow/sam3-AI-LAB-GUIDE.git"
)

:: --------------------------------------------------------------------------
:: AI Lab Guide -- Frontend
:: --------------------------------------------------------------------------
echo [%date% %time%] Rebuilding frontend...
cd frontend
call npm install
call npm run build
cd ..

:: --------------------------------------------------------------------------
:: Teachable Trainer (image-classifier) -- separate repo + venv
:: --------------------------------------------------------------------------
set "TRAINER_DIR=C:\Users\AI-Lab\Desktop\image-classifier"

IF NOT EXIST "%TRAINER_DIR%\.git" (
    echo [%date% %time%] Cloning Teachable Trainer...
    git clone --depth 1 https://github.com/WCTC-AI-Lab/image-classifier.git "%TRAINER_DIR%"
) ELSE (
    echo [%date% %time%] Updating Teachable Trainer...
    :: Remove any stale git lock files from interrupted previous runs
    del /F /Q "%TRAINER_DIR%\.git\index.lock" 2>NUL
    del /F /Q "%TRAINER_DIR%\.git\HEAD.lock" 2>NUL
    :: Use -C instead of cd so we never leave this directory (cd would hold the
    :: folder open if git hangs, making it impossible to delete on next run)
    git -C "%TRAINER_DIR%" fetch origin main
    git -C "%TRAINER_DIR%" reset --hard origin/main
)

IF NOT EXIST "%TRAINER_DIR%\.venv\Scripts\python.exe" (
    echo [%date% %time%] Creating Teachable Trainer venv with Python 3.11...
    py -3.11 -m venv "%TRAINER_DIR%\.venv"
)

:: Install PyTorch CUDA before requirements.txt -- same reason as main venv.
:: Pin to a specific cu126 wheel to guarantee GPU build.
"%TRAINER_DIR%\.venv\Scripts\python.exe" -c "import torch; assert torch.cuda.is_available()" 2>NUL || (
    echo [%date% %time%] Installing PyTorch CUDA for Teachable Trainer...
    call "%TRAINER_DIR%\.venv\Scripts\pip.exe" install torch==2.6.0+cu126 torchvision==0.21.0+cu126 --index-url https://download.pytorch.org/whl/cu126
)

echo [%date% %time%] Installing Teachable Trainer dependencies...
call "%TRAINER_DIR%\.venv\Scripts\pip.exe" install -r "%TRAINER_DIR%\requirements.txt"

:: --------------------------------------------------------------------------
:: RAG Builder Studio (BotBuilder) -- separate repo + venv
:: --------------------------------------------------------------------------
set "RAG_DIR=C:\Users\AI-Lab\Desktop\BotBuilder"

IF NOT EXIST "%RAG_DIR%\.git" (
    echo [%date% %time%] Cloning RAG Builder Studio...
    git clone --depth 1 https://github.com/WCTC-AI-Lab/BotBuilder.git "%RAG_DIR%"
) ELSE (
    echo [%date% %time%] Updating RAG Builder Studio...
    :: Remove any stale git lock files from interrupted previous runs
    del /F /Q "%RAG_DIR%\.git\index.lock" 2>NUL
    del /F /Q "%RAG_DIR%\.git\HEAD.lock" 2>NUL
    git -C "%RAG_DIR%" fetch origin main
    git -C "%RAG_DIR%" reset --hard origin/main
)

IF NOT EXIST "%RAG_DIR%\.venv\Scripts\python.exe" (
    echo [%date% %time%] Creating RAG Builder Studio venv with Python 3.11...
    py -3.11 -m venv "%RAG_DIR%\.venv"
)

:: Install PyTorch CUDA before the editable install -- same reason as other venvs.
"%RAG_DIR%\.venv\Scripts\python.exe" -c "import torch; assert torch.cuda.is_available()" 2>NUL || (
    echo [%date% %time%] Installing PyTorch CUDA for RAG Builder...
    call "%RAG_DIR%\.venv\Scripts\pip.exe" install torch==2.6.0+cu126 torchvision==0.21.0+cu126 --index-url https://download.pytorch.org/whl/cu126
)

echo [%date% %time%] Installing RAG Builder Studio dependencies...
call "%RAG_DIR%\.venv\Scripts\pip.exe" install -e "%RAG_DIR%[local]"

:: --------------------------------------------------------------------------
:: Start everything via PM2
:: --------------------------------------------------------------------------
echo [%date% %time%] Stopping PM2 daemon...
call pm2 kill
echo [%date% %time%] Killing any orphaned processes...
taskkill /F /IM waitress-serve.exe >NUL 2>&1
echo [%date% %time%] Starting PM2 fresh...
call pm2 start ecosystem.config.js
call pm2 save
echo [%date% %time%] PM2 started.

echo [%date% %time%] === bootstrap.bat finished ===
echo [%date% %time%] App running on http://localhost:5000
exit /b 0
