# Логи чата в Google Sheets (Vercel + локально)

Этот проект умеет сохранять историю переписки в Google Sheets (подходит для Vercel, где файлы на диске не являются постоянным хранилищем).

## 1) Создайте Google Sheet

- Создайте таблицу Google Sheets (любое имя)
- Создайте лист с названием `Logs` (или используйте другое имя и задайте его в переменной `GSHEETS_SHEET_NAME`)

## 2) Создайте Service Account и ключ

1. Откройте Google Cloud Console
2. Создайте проект (или используйте существующий)
3. Включите API: **Google Sheets API**
4. Создайте **Service Account**
5. Создайте ключ **JSON** для Service Account и скачайте его

Из JSON файла вам нужны поля:
- `client_email`
- `private_key`

## 3) Дайте доступ сервисному аккаунту к таблице

В Google Sheets нажмите “Поделиться” и добавьте email сервисного аккаунта (из `client_email`) как **Редактор**.

## 4) Настройте переменные окружения

### На Vercel

Project → Settings → Environment Variables:

- `GSHEETS_LOGGING_ENABLED` = `true`
- `GSHEETS_SPREADSHEET_ID` = `<ID_ТАБЛИЦЫ>`
- `GSHEETS_SHEET_NAME` = `Logs` (опционально)
- `GSHEETS_SERVICE_ACCOUNT_EMAIL` = `<client_email>`
- `GSHEETS_PRIVATE_KEY` = `<private_key>`

Где взять `GSHEETS_SPREADSHEET_ID`:
- Это часть URL таблицы между `/d/` и `/edit`

Важно для `GSHEETS_PRIVATE_KEY`:
- В Vercel вставляйте ключ как строку, переносы строк должны быть экранированы `\n`
- Код сам сделает замену `\\n` → реальный перевод строки

### Локально

Можно задать в PowerShell перед запуском:

```powershell
$env:GSHEETS_LOGGING_ENABLED="true"
$env:GSHEETS_SPREADSHEET_ID="..."
$env:GSHEETS_SHEET_NAME="Logs"
$env:GSHEETS_SERVICE_ACCOUNT_EMAIL="..."
$env:GSHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
npm run dev:all
```

## Что именно записывается

Каждое сообщение добавляется новой строкой:
- `timestamp`
- `ip`
- `userAgent`
- `messageCount`
- `source` (`groq`/`mock`)
- `message`
- `response`
- `shouldAddCTA`

## Если Google Sheets недоступен

Если Google Sheets не настроен или временно недоступен, логирование падает обратно на локальный файл `logs/chat-YYYY-MM-DD.log` (в Vercel это может не сохраняться постоянно).

