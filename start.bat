@echo off
echo Установка зависимостей...
call npm install
if %errorlevel% neq 0 (
    echo ОШИБКА: npm не найден. Установите Node.js с https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo Запуск приложения...
echo Приложение будет доступно на http://localhost:3000
echo.
call npm run dev

