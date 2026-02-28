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

## TTS (озвучка в Кабинете)

Озвучка текста голосом (цитаты чая, ответы эксперта). Приоритет: **Azure Speech** → **Yandex SpeechKit** → Google Cloud TTS → Edge TTS.

### Azure Speech (Светлана, F0 без карты)

1. [Azure Portal](https://portal.azure.com) → Create resource → **Speech**
2. Выберите Free tier (F0): 500 000 символов/месяц бесплатно, карта не обязательна
3. Keys and Endpoint → скопируйте Key 1 и Region (например `westeurope`)
4. Добавьте в `.env` или Vercel → Settings → Environment Variables:

```env
AZURE_SPEECH_KEY=ваш_ключ
AZURE_SPEECH_REGION=westeurope
```

Голос: `ru-RU-SvetlanaNeural` (женский русский).

### Yandex SpeechKit (Алена, 1 млн символов/мес бесплатно)

1. [Yandex Cloud](https://console.cloud.yandex.ru) → Создать каталог (folder)
2. Включить сервис **SpeechKit** в каталоге
3. Создать API-ключ: IAM → Сервисные аккаунты → Создать → Выдать роль `ai.speechkit-stt.user` и `ai.speechkit-tts.user`
4. Скопировать ID каталога (folder) и API-ключ
5. Добавьте в `.env` или Vercel:

```env
YANDEX_SPEECHKIT_API_KEY=ваш_api_ключ
YANDEX_SPEECHKIT_FOLDER_ID=ваш_id_каталога
```

Голос: `alena` (женский русский).

### Google Cloud TTS (fallback)

1. [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Enable **Cloud Text-to-Speech API**
2. Credentials → Create credentials → API key
3. Добавьте в `.env` или Vercel:

```env
GOOGLE_TTS_API_KEY=ваш_api_ключ
```

Бесплатно: 4 млн символов/месяц (WaveNet). Голос: `ru-RU-Wavenet-A`.

Без ключей используется Edge TTS (может не работать на Vercel из‑за WebSocket).

**Примечание:** Для Yandex SpeechKit нужны оба параметра — API-ключ и ID каталога.

