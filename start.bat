@echo off
chcp 65001 >nul
echo === LAUNCH ALL PROJECT SYSTEMS ===

cd /d "%~dp0"
if not exist "package.json" (
  if exist "MYMiniapp\package.json" (
    cd /d "%~dp0MYMiniapp"
  ) else (
    echo ERROR: package.json not found. Run start.bat from CURSOR or MYMiniapp folder.
    pause
    exit /b 1
  )
)

set "PROJ=%CD%"

echo [1/3] Starting Frontend (Vite)...
start "Frontend (Vite)" /D "%PROJ%" cmd /k "npm run dev"

echo [2/3] Starting Backend API...
start "Backend API" /D "%PROJ%" cmd /k "npm run dev:server"

echo [3/3] Starting Telegram Bot...
if exist ".venv" (
  start "Telegram Bot" /D "%PROJ%\telegram-bot" cmd /k "call ..\.venv\Scripts\activate.bat && python bot.py"
) else (
  echo WARNING: .venv not found. Telegram bot not started.
)

echo.
echo ==================================================
echo All windows opened. If any closed immediately, check it for errors.
echo Open the app at: http://localhost:3001
echo ==================================================
timeout /t 4 /nobreak >nul
start "" "http://localhost:3001"
pause
