@echo off
:: ======================================================================
:: auto_update.bat  --  thin launcher
::
:: This script does ONLY three things:
::   1. Fix environment for Task Scheduler
::   2. Git sync to origin/master (overwrites everything, including bootstrap.bat)
::   3. Call bootstrap.bat (which is now the FRESH version from master)
::
:: All build/install/PM2 logic lives in bootstrap.bat so that new apps,
:: dependency changes, etc. take effect on the very same reboot they're
:: pushed -- no double-reboot needed.
::
:: This file should rarely change.
:: ======================================================================
cd /d "C:\Users\AI-Lab\Desktop\AI-LAB-GUIDE\"
call :run > auto_update.log 2>&1
exit /b %ERRORLEVEL%

:run
echo [%date% %time%] === auto_update.bat starting ===

:: --- Environment fix for Task Scheduler ---
if "%HOMEPATH%"=="" set "HOMEPATH=\Users\AI-Lab"
if "%HOMEDRIVE%"=="" set "HOMEDRIVE=C:"
set "PM2_HOME=C:\Users\AI-Lab\.pm2"
echo [%date% %time%] PM2_HOME=%PM2_HOME%

:: --- Load secrets (gitignored) ---
IF EXIST "secrets.bat" (
    call secrets.bat
    echo [%date% %time%] Secrets loaded.
) ELSE (
    echo [%date% %time%] WARNING: secrets.bat not found.
)

:: --- Git sync: force local to match origin/master exactly ---
echo [%date% %time%] Syncing to origin/master...
git checkout master
git fetch origin master
git reset --hard origin/master
echo [%date% %time%] Git sync done.

:: --- Hand off to bootstrap.bat (now the latest version from master) ---
echo [%date% %time%] Calling bootstrap.bat...
call bootstrap.bat
echo [%date% %time%] === auto_update.bat finished ===
exit /b 0
