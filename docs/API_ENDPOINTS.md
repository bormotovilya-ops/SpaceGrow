# API Эндпоинты для работы с базой данных

## Обзор

Добавлены новые API эндпоинты для работы с единой базой пользователей, объединяющей данные из Telegram, MiniApp и сайта.

## Базовые эндпоинты

### `GET /api/health`
Проверка работоспособности API
```json
{
  "status": "ok",
  "message": "Backend is running"
}
```

### `GET /api/menu`
Получение данных меню (существующий эндпоинт)

## Новые эндпоинты для расширенного логирования

### `POST /api/log/source-visit`
Логирование источника посещения
```json
{
  "session_id": 123,
  "source": "telegram|vk|direct|search|landing",
  "cookie_id": "abc123",
  "utm_params": {
    "utm_source": "telegram",
    "utm_medium": "channel",
    "utm_campaign": "promo"
  },
  "referrer": "https://t.me/channel",
  "tg_user_id": 987654321
}
```

### `POST /api/log/miniapp-open`
Логирование открытия MiniApp
```json
{
  "session_id": 123,
  "device": "iPhone 12",
  "page_id": "diagnostics",
  "cookie_id": "abc123",
  "tg_user_id": 987654321
}
```

### `POST /api/log/content-view`
Логирование просмотра контента
```json
{
  "session_id": 123,
  "content_type": "section|article|video",
  "content_id": "about_us",
  "content_title": "О компании",
  "section": "main",
  "time_spent": 120,
  "scroll_depth": 75,
  "cookie_id": "abc123",
  "tg_user_id": 987654321
}
```

### `POST /api/log/ai-interaction`
Логирование взаимодействия с AI (исключая экспертные разговоры)
```json
{
  "session_id": 123,
  "messages_count": 5,
  "topics": ["diagnostics", "pricing"],
  "duration": 180,
  "conversation_type": "general|diagnostic",
  "cookie_id": "abc123",
  "tg_user_id": 987654321
}
```

### `POST /api/log/diagnostic-complete`
Логирование завершения диагностики
```json
{
  "session_id": 123,
  "results": {"score": 85, "category": "A"},
  "start_time": "2026-01-23T10:00:00",
  "end_time": "2026-01-23T10:15:00",
  "progress": {"completed": 100, "steps": 10},
  "cookie_id": "abc123",
  "tg_user_id": 987654321
}
```

### `POST /api/log/game-action`
Логирование игровых действий
```json
{
  "session_id": 123,
  "game_type": "calculator|quiz",
  "action_type": "start|complete|achievement",
  "action_data": {"level": 3, "attempts": 2},
  "score": 1500,
  "achievement": "speed_demon",
  "duration": 45,
  "cookie_id": "abc123",
  "tg_user_id": 987654321
}
```

### `POST /api/log/cta-click`
Логирование клика по CTA
```json
{
  "session_id": 123,
  "cta_type": "call|telegram|whatsapp|email",
  "cta_text": "Позвонить",
  "cta_location": "header|footer|content",
  "previous_step": "diagnostic_complete",
  "step_duration": 30,
  "cookie_id": "abc123",
  "tg_user_id": 987654321
}
```

### `POST /api/log/personal-path-view`
Логирование просмотра персонального пути/PDF
```json
{
  "session_id": 123,
  "open_time": "2026-01-23T10:00:00",
  "duration": 300,
  "downloaded": false,
  "cookie_id": "abc123",
  "tg_user_id": 987654321
}
```

## Эндпоинты аналитики и сегментации

### `GET /api/analytics/user-segment/{tg_user_id}`
Получение сегмента пользователя
```json
{
  "segment": "engaged",
  "engagement_level": "high",
  "conversion_potential": "high",
  "content_preference": ["likes_section", "ai_general"],
  "behavior_patterns": ["source_telegram", "active_afternoon"],
  "last_activity": "2026-01-23T15:30:00",
  "total_sessions": 8,
  "diagnostics_completed": true
}
```

### `POST /api/analytics/segment-users`
Получение пользователей по критериям сегмента
```json
{
  "criteria": {
    "segment": "engaged",
    "engagement_level": "high"
  }
}
```
Ответ:
```json
{
  "users": [987654321, 987654322],
  "count": 2
}
```

### `GET /api/analytics/conversion-funnel`
Получение воронки конверсии
```json
{
  "visitors": 1000,
  "engaged": 300,
  "diagnosed": 150,
  "converted": 50
}
```

### `GET /api/analytics/content-preferences/{tg_user_id}`
Получение предпочтений контента
```json
{
  "preferences": ["likes_section", "ai_general", "source_telegram"]
}
```

## Новые эндпоинты для аналитики и трекинга

### `POST /api/track-session`
Управление сессиями сайта

**Запрос:**
```json
{
  "cookie_id": "abc123def456",
  "action": "start|end",
  "session_id": 123,  // только для action: "end"
  "tg_user_id": 987654321  // опционально
}
```

**Ответ (start):**
```json
{
  "session_id": 123,
  "status": "started"
}
```

**Ответ (end):**
```json
{
  "success": true,
  "status": "ended"
}
```

### `POST /api/track-event`
Логирование событий пользователя

**Запрос:**
```json
{
  "session_id": 123,
  "event_type": "click|scroll|page_view|cta_click|diagnostic_step",
  "event_name": "button_click|scroll_to_bottom|page_loaded|cta_button_pressed",
  "page": "/diagnostics/step-1",
  "metadata": {
    "button_id": "start_diagnostic",
    "scroll_depth": 75,
    "time_spent": 120
  },
  "tg_user_id": 987654321  // опционально
}
```

**Ответ:**
```json
{
  "success": true
}
```

### `POST /api/link-identities`
Связывание Telegram пользователя с cookie

**Запрос:**
```json
{
  "tg_user_id": 987654321,
  "cookie_id": "abc123def456"
}
```

**Ответ:**
```json
{
  "success": true,
  "message": "Идентификаторы связаны"
}
```

## Эндпоинты для работы с пользователями

### `GET /api/user/{tg_user_id}`
Получение информации о пользователе

**Ответ:**
```json
{
  "user_id": 987654321,
  "username": "john_doe",
  "first_name": "John",
  "last_name": "Doe",
  "has_started_diagnostics": true,
  "cookie_id": "abc123def456",
  "source": "miniapp",
  "linked_at": "2026-01-23T17:00:00",
  "analytics": {
    "total_sessions": 5,
    "total_events": 23,
    "last_session": "2026-01-23T16:45:00",
    "diagnostics_completed": true,
    "identities_count": 2
  }
}
```

### `GET /api/user/by-cookie/{cookie_id}`
Поиск пользователя по cookie

**Ответ:**
```json
{
  "user_id": 987654321,
  "username": "john_doe",
  "cookie_id": "abc123def456",
  "source": "miniapp",
  "linked_at": "2026-01-23T17:00:00"
}
```

### `GET /api/user/{tg_user_id}/events?limit=100`
Получение событий пользователя

**Ответ:**
```json
{
  "events": [
    {
      "id": 1,
      "session_id": 123,
      "tg_user_id": 987654321,
      "event_type": "click",
      "event_name": "start_diagnostic",
      "page": "/diagnostics",
      "metadata": {
        "button_id": "start_button"
      },
      "created_at": "2026-01-23T17:00:00"
    }
  ]
}
```

## Эндпоинты для диагностики

### `POST /api/diagnostics`
Сохранение результатов диагностики

**Запрос:**
```json
{
  "tg_user_id": 987654321,
  "cookie_id": "abc123def456",  // опционально
  "result_data": {
    "step1": "answer1",
    "step2": "answer2",
    "score": 85,
    "recommendations": ["Рекомендация 1", "Рекомендация 2"]
  }
}
```

**Ответ:**
```json
{
  "success": true,
  "message": "Результаты диагностики сохранены"
}
```

### `GET /api/diagnostics/{tg_user_id}`
Получение результатов диагностики

**Ответ:**
```json
{
  "id": 1,
  "tg_user_id": 987654321,
  "cookie_id": "abc123def456",
  "result_json": "{\"step1\":\"answer1\",\"score\":85}",
  "result_data": {
    "step1": "answer1",
    "score": 85
  },
  "completed_at": "2026-01-23T17:00:00"
}
```

## Аналитические эндпоинты

### `GET /api/analytics/site`
Общая аналитика сайта

**Ответ:**
```json
{
  "total_users": 150,
  "total_sessions": 450,
  "total_events": 1250,
  "diagnostics_completed": 67,
  "active_sessions": 12
}
```

### `GET /api/user/{tg_user_id}/analytics`
Аналитика конкретного пользователя

**Ответ:**
```json
{
  "total_sessions": 5,
  "total_events": 23,
  "last_session": "2026-01-23T16:45:00",
  "diagnostics_completed": true,
  "identities_count": 2
}
```

## Использование в JavaScript

### Отслеживание сессий

```javascript
// При загрузке страницы
const cookieId = getCookie('user_session') || generateCookieId();
const sessionId = await startSession(cookieId);

// При уходе со страницы
window.addEventListener('beforeunload', () => {
  endSession(sessionId);
});
```

### Логирование событий

```javascript
// Клик по кнопке
async function trackClick(buttonId, page) {
  await fetch('/api/track-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: currentSessionId,
      event_type: 'click',
      event_name: buttonId,
      page: page,
      metadata: { button_id: buttonId }
    })
  });
}
```

### Связывание идентификаторов

```javascript
// При запуске MiniApp из Telegram
async function linkIdentities(tgUserId, cookieId) {
  await fetch('/api/link-identities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tg_user_id: tgUserId,
      cookie_id: cookieId
    })
  });
}
```

## Типы событий

### event_type
- `click` - клик по элементу
- `scroll` - прокрутка страницы
- `page_view` - просмотр страницы
- `cta_click` - клик по призыву к действию
- `diagnostic_step` - шаг диагностики
- `form_submit` - отправка формы
- `time_spent` - время на странице

### event_name
Конкретные названия событий, например:
- `start_diagnostic`
- `complete_step_1`
- `scroll_to_bottom`
- `cta_call_me`
- `submit_contact_form`

## Безопасность

- Все эндпоинты проверяют корректность данных
- Используется CORS для защиты от несанкционированного доступа
- Логирование всех действий для аудита
- Валидация входных данных

## Мониторинг

Для мониторинга работы системы используйте:
- `/api/analytics/site` - общая статистика
- `/api/user/{id}/analytics` - аналитика пользователя
- Логи сервера для отслеживания ошибок