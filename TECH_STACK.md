## TECH STACK / Технологический стек проекта

Краткий список основных технологий и внешних сервисов, которые используются в проекте SpaceGrowth. Разбит по слоям: фронтенд, бэкенд, БД, боты и инфраструктура.

---

## Фронтенд

- **Базовые технологии**
  - `React` (SPA, см. `src/`)
  - `Vite` как dev‑сервер и сборщик
  - `JavaScript` / `JSX`
  - Стили на чистом `CSS` + utility‑классы (`App.css`, `index.css`, `src/components/*.css`)

- **Инструменты и конфигурация**
  - `Node.js` + `npm` (см. `package.json`, `package-lock.json`)
  - `Vite` конфигурация (`vite.config.js`)
  - `PostCSS` и `Tailwind CSS` (`postcss.config.js`, `tailwind.config.js`)

- **Интеграции на фронте**
  - Клиент `Supabase` (`src/utils/supabaseClient.js`)
  - Логирование действий пользователя и запросов (`src/utils/logging.js`)
  - Отправка событий в `Яндекс.Метрику` (`src/analytics/yandexMetrica.js`)
  - Взаимодействие с Telegram‑API на стороне фронта (`src/utils/telegram.js`)

---

## Бэкенд (веб / API)

- **Python‑бэкенд**
  - Веб‑приложение на `Flask` (см. `backend/app.py`, зависимости в `backend/requirements.txt`)
  - Запуск локально: `python app.py` (порт 5000 по умолчанию)

- **Node / serverless API**
  - API‑функции для деплоя на Vercel (папка `api/`)
    - `api/test-db.js`
    - `api/user/[tg_user_id]/personal-report.js`
    - `api/user/by-cookie/[cookie_id]/personal-report.js`

- **Скрипты и утилиты**
  - Python‑скрипты для миграций/экспорта/импорта БД (`scripts/*.py`, `run_migrations.py`)
  - Node‑скрипты для генерации PDF, скриншотов и локального сервера (`scripts/generate-pdf*.js`, `scripts/generate-screenshots.cjs`, `scripts/server-local.js`)

---

## База данных и данные

- **Основная БД**
  - `Supabase` (PostgreSQL)
  - Используется для хранения пользователей, событий, сегментов и аналитики
  - Клиент в фронтенде: `src/utils/supabaseClient.js`
  - SQL‑скрипты и вспомогательные файлы:
    - `scripts/supabase_user_identities_utm.sql`
    - `telegram-bot/supabase_rpc_upsert_user_segment.sql`
    - `export/pg_import.sql`

- **SQLite / локальные данные**
  - Локальная SQLite‑БД (дамп `export/sqlite_dump.sql`)
  - Миграции SQLite → PostgreSQL: `scripts/migrate_sqlite_to_postgres.py`
  - Экспорт/импорт таблиц в CSV: `scripts/export_tables_csv.py`, `scripts/import_csv_to_pg.py`, CSV в `export/csv/`

---

## Telegram‑бот

- **Стек бота**
  - `Python` + Telegram‑библиотека (см. `telegram-bot/bot.py`, `telegram-bot/requirements.txt`)
  - Управление настройками и сегментацией пользователей (`telegram-bot/settings_manager.py`, `telegram-bot/user_segmentation.py`)
  - Планировщик уведомлений и рассылок (`telegram-bot/notifications.py`)

- **База данных бота**
  - Использование SQLite/Postgres (см. `telegram-bot/db.py`)
  - Инструкции по работе с БД: `telegram-bot/README_DB.md`, `telegram-bot/README_UNIFIED_DB.md`, `telegram-bot/КАК_ПОСМОТРЕТЬ_БД.md`

- **Интеграция с Supabase**
  - RPC‑функции и SQL‑скрипты для синхронизации сегментов и событий:
    - `telegram-bot/supabase_rpc_upsert_user_segment.sql`

---

## Инфраструктура и деплой

- **Vercel**
  - Основная платформа деплоя фронтенда и serverless‑API
  - Конфиг проекта: `vercel.json`
  - Подробные инструкции: `docs/ДЕПЛОЙ.md`, `docs/QUICK_DEPLOY.md`, `docs/GROQ_VERCEL_SETUP.md`, `docs/GIGACHAT_VERCEL_SETUP.md`

- **Railway**
  - Хостинг Telegram‑бота и/или связанных сервисов
  - Конфигурация: `telegram-bot/railway.json`
  - Инструкции: `telegram-bot/README.md`, `telegram-bot/ЗАПУСК_ЛОКАЛЬНО.md`

- **Домен**
  - Домен зарегистрирован и управляется через провайдера `REG.RU`
  - DNS‑записи домена указывают на проект на Vercel (фактическая настройка в панели REG.RU)

- **Прочая инфраструктура**
  - Скрипты для резервного копирования и восстановления БД: `run_migrations.py`, SQL‑дампы в `export/`
  - Локальный запуск вспомогательного Node‑сервера: `scripts/server-local.js`

---

## Внешние AI‑ и аналитические сервисы

- **AI‑провайдеры (через HTTP‑API)**
  - `GROQ` — LLM‑провайдер (см. `docs/БЫСТРАЯ_НАСТРОЙКА_GROQ.md`, `docs/ПРОБЛЕМА_С_GROQ.md`, `docs/ПРОВЕРКА_GROQ_АККАУНТ.md`, `docs/ПРОВЕРКА_GROQ_ТОКЕН.md`)


- **Логирование и мониторинг**
  - Расширенная система логирования запросов и ответов (см. `LOGGING_README.md`, `docs/ADVANCED_LOGGING_SYSTEM.md`)
  - Логи переписки:
    - Локально: файлы `logs/chat-YYYY-MM-DD.log`
    - В проде на Vercel: интеграция с `Google Sheets` (см. `docs/GOOGLE_SHEETS_LOGS_SETUP.md`)

- **Аналитика**
  - `Яндекс.Метрика`:
    - Включение через переменную окружения `VITE_YM_COUNTER_ID` (см. `docs/ENV_SETUP.md`)
    - Настройка целей: `docs/YANDEX_METRICA_GOALS.md`
  - Внутренняя аналитика по действиям пользователей через Supabase (CSV‑экспорт в `export/csv/`)

---

## Примечания

- Этот файл предназначен как «чек‑лист» по стеку для передачи подрядчикам и новым участникам команды.
- При добавлении новых сервисов или технологий рекомендуется дополнять соответствующий раздел и при необходимости создавать под‑разделы.

