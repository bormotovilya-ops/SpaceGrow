@echo off
chcp 65001 > nul
set /p commit_msg="Введите описание изменений (commit message): "

echo.
echo [1/3] Добавление файлов...
git add .

echo [2/3] Создание коммита...
git commit -m "%commit_msg%"

echo [3/3] Отправка в облако (Push)...
git push

echo.
echo Готово! Изменения в Git.
pause