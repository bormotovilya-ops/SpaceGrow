# Переменные окружения (настройка)

Проект использует переменные окружения **Vite** (все переменные, которые должны попасть во фронтенд, обязаны начинаться с `VITE_`).

## Быстрый старт

1. Скопируйте `.env.example` в `.env` или `.env.local` в корне проекта (рядом с `package.json`).
2. Заполните значения. Vite автоматически загружает `.env` и `.env.local` при `npm run dev` / `npm run build`.

## Supabase (PersonReport, аналитика)

Чтобы убрать ошибку **"Supabase: VITE_SUPABASE_URL not set"** и включить персональные отчёты / Supabase в React:

1. Создайте `.env` или `.env.local` в корне проекта.
2. Добавьте (значения из [Supabase](https://supabase.com) → Project → Settings → API):

```env
VITE_SUPABASE_URL=https://ваш-проект.supabase.co
VITE_SUPABASE_ANON_KEY=ваш_anon_ключ
```

3. Перезапустите `npm run dev`.

Без этих переменных PersonReport и прямой доступ к Supabase во фронтенде отключены (fallback на API).

## API URL (локальная разработка)

- По умолчанию фронтенд использует относительный `/api`; Vite проксирует его на `http://localhost:5001` (см. `vite.config.js`).
- Если нужны прямые вызовы на бэкенд (например, другой порт), задайте:

```env
VITE_API_URL=http://localhost:5001/api
```

Значение должно включать `/api` в конце.

## Яндекс.Метрика

Метрика уже подключена в коде и включается, если задан `VITE_YM_COUNTER_ID`.

### Локально

1. В `.env` или `.env.local` добавьте:

```env
VITE_YM_COUNTER_ID=106259525
```

2. Перезапустите `npm run dev`

### На Vercel

Project → Settings → Environment Variables:

- **Name**: `VITE_YM_COUNTER_ID`
- **Value**: `106259525` (ID счётчика Метрики)
- **Environment**: Production (и Preview по желанию)

После добавления переменной сделайте Redeploy.

