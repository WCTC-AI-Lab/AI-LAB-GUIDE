@echo off
echo [%date% %time%] Starting Auto-Update Check...

:: 1. Navigate to your exact project folder (Change this path!)
:: The /d flag ensures it changes drives if necessary (e.g., from C: to D:)
cd /d "C:\Users\AI-Lab\Desktop\AI-LAB-GUIDE\"

:: 2. Fetch the latest history from GitHub (doesn't change your local files yet)
git fetch origin master

:: 3. Count how many commits the local branch is behind the remote
FOR /F "tokens=*" %%i IN ('git rev-list HEAD...origin/master --count') DO SET NEW_COMMITS=%%i

:: 4. If 0 commits behind, exit gracefully
IF "%NEW_COMMITS%"=="0" (
    echo [%date% %time%] App is already up to date. No action needed.
    exit /b 0
)

echo [%date% %time%] Found %NEW_COMMITS% new updates. Pulling code...

:: 5. Pull the actual code
git pull origin master

:: 6. (Optional) Rebuild frontend if you are tracking source files instead of /dist
cd frontend
call npm install
call npm run build
cd ..

:: 7. Update Python dependencies just in case requirements.txt changed
echo [%date% %time%] Checking for new Python dependencies...
call venv\Scripts\pip.exe install -r requirements.txt

:: 8. Restart the background service so it uses the new code
echo [%date% %time%] Restarting PM2 service...
call pm2 restart AILabGuide

echo [%date% %time%] Update Complete!
exit /b 0