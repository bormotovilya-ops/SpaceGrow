@echo off
chcp 65001 > nul
echo === ЗАПУСК ВСЕХ СИСТЕМ ПРОЕКТА ===

:: Переход в папку Mini App (чтобы npm и TTS-сервер работали из правильного проекта)
cd /d "%~dp0MYMiniapp"
if not exist "package.json" (
  echo [ОШИБКА] Не найден package.json. Запускайте start.bat из папки CURSOR.
  pause
  exit /b 1
)

:: 1. ФРОНТЕНД (Vite)
echo [1/3] Запуск Mini App (Vite)...
start "Frontend (Vite)" cmd /k "npm run dev"

:: 2. БЭКЕНД СЕРВЕР (Node.js API)
echo [2/3] Запуск API Server...
:: Здесь мы вызываем ту самую команду dev:server из твоего package.json
start "Backend API" cmd /k "npm run dev:server"

:: 3. ТЕЛЕГРАМ БОТ (Python)
echo [3/3] Запуск Telegram Бота...
if exist ".venv" (
    :: Переходим в папку бота, активируем окружение и запускаем bot.py
    start "Telegram Bot" cmd /k "cd telegram-bot && ..\.venv\Scripts\activate && python bot.py"
) else (
    echo [!] ОШИБКА: Виртуальное окружение .venv не найдено. Бот не запущен.
)

echo.
echo ==================================================
echo Все окна открыты. Если какое-то окно сразу закрылось —
echo проверь в нём текст ошибки перед перезапуском.
echo.
echo Важно: открывай приложение по адресу http://localhost:3000
echo (голос Светлана работает только при запуске через Vite).
echo ==================================================
timeout /t 4 /nobreak > nul
start "" "http://localhost:3000"
pause