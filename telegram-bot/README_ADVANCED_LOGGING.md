# Расширенная система логирования

## Быстрый старт

### 1. Обновление базы данных

```bash
# Запуск миграций (уже выполнено)
python run_migrations.py

# Проверка работоспособности
python test_database.py
```

### 2. Запуск backend с новыми эндпоинтами

```bash
cd backend
python app.py
```

### 3. Тестирование API

```bash
# Создание сессии
curl -X POST http://localhost:5000/api/track-session \
  -H "Content-Type: application/json" \
  -d '{"cookie_id": "test123", "action": "start"}'

# Логирование просмотра контента
curl -X POST http://localhost:5000/api/log/content-view \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": 1,
    "content_type": "section",
    "content_id": "about",
    "time_spent": 120,
    "cookie_id": "test123"
  }'
```

## Основные возможности

### Логирование событий

| Тип события | Эндпоинт | Описание |
|-------------|----------|----------|
| Источник | `/api/log/source-visit` | UTM, referrer, источник трафика |
| MiniApp | `/api/log/miniapp-open` | Открытие приложения, устройство |
| Контент | `/api/log/content-view` | Просмотр секций, время, прокрутка |
| AI | `/api/log/ai-interaction` | Разговоры с AI (кроме экспертов) |
| Диагностика | `/api/log/diagnostic-complete` | Завершение тестов |
| Игры | `/api/log/game-action` | Действия в калькуляторах/квизах |
| CTA | `/api/log/cta-click` | Клики по кнопкам действия |
| PDF/Путь | `/api/log/personal-path-view` | Просмотр персонального контента |

### Аналитика

```bash
# Сегмент пользователя
curl http://localhost:5000/api/analytics/user-segment/123

# Воронка конверсии
curl http://localhost:5000/api/analytics/conversion-funnel

# Предпочтения контента
curl http://localhost:5000/api/analytics/content-preferences/123
```

### Сегментация

```bash
# Обновление сегментов всех пользователей
python -c "from telegram_bot.user_segmentation import update_all_segments; print(update_all_segments())"

# Автоматические действия на основе сегментов
python -c "from telegram_bot.user_segmentation import run_automated_actions; print(run_automated_actions())"
```

## Структура данных

### Сессия (site_sessions)
```json
{
  "id": 1,
  "cookie_id": "abc123",
  "tg_user_id": 987654321,
  "source": "telegram",
  "utm_source": "channel",
  "device_type": "mobile",
  "session_start": "2026-01-23T10:00:00",
  "page_views": 5,
  "events_count": 12
}
```

### Событие (site_events)
```json
{
  "id": 1,
  "session_id": 1,
  "event_type": "content",
  "event_name": "content_view",
  "event_category": "engagement",
  "time_spent": 120,
  "scroll_depth": 85,
  "section": "about",
  "created_at": "2026-01-23T10:02:00"
}
```

## Сегменты пользователей

### Критерии определения

| Сегмент | Условия |
|---------|---------|
| newcomer | < 3 сессий ИЛИ < 15 событий И не прошел диагностику |
| engaged | 3-9 сессий ИЛИ 15-49 событий |
| converter | Прошел диагностику |
| loyal | ≥ 10 сессий ИЛИ ≥ 50 событий |

### Уровни вовлеченности

- **low**: < 3 сессий или < 15 событий
- **medium**: 3-9 сессий или 15-49 событий
- **high**: ≥ 10 сессий или ≥ 50 событий

## Frontend интеграция

### JavaScript пример

```javascript
// Инициализация трекера
const tracker = {
  sessionId: null,
  userId: window.Telegram?.WebApp?.initDataUnsafe?.user?.id,
  cookieId: getCookie('session_id'),

  // Логирование сессии
  async startSession() {
    const response = await fetch('/api/track-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cookie_id: this.cookieId,
        action: 'start',
        tg_user_id: this.userId
      })
    });
    const data = await response.json();
    this.sessionId = data.session_id;
  },

  // Логирование просмотра контента
  async trackContentView(contentId, timeSpent, scrollDepth) {
    await fetch('/api/log/content-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: this.sessionId,
        content_type: 'section',
        content_id: contentId,
        time_spent: timeSpent,
        scroll_depth: scrollDepth,
        cookie_id: this.cookieId,
        tg_user_id: this.userId
      })
    });
  }
};

// Автоматическое логирование
window.addEventListener('load', () => tracker.startSession());
```

## Мониторинг и поддержка

### Проверка работоспособности

```bash
# Размер базы данных
ls -lh telegram-bot/bot_users.db

# Количество записей
sqlite3 telegram-bot/bot_users.db "SELECT COUNT(*) FROM site_events;"

# Активные сессии
sqlite3 telegram-bot/bot_users.db "SELECT COUNT(*) FROM site_sessions WHERE session_end IS NULL;"
```

### Очистка тестовых данных

```sql
-- Удаление тестовых событий
DELETE FROM site_events WHERE created_at >= '2026-01-23';
DELETE FROM site_sessions WHERE session_start >= '2026-01-23';
```

### Производительность

```sql
-- Создание индексов (уже выполнено в миграциях)
-- Анализ производительности
ANALYZE;

-- Оптимизация
VACUUM;
```

## Расширение системы

### Добавление нового типа событий

1. **Добавить метод в Database** (`telegram-bot/db.py`):
```python
def log_new_event_type(self, session_id, param1, param2, tg_user_id=None):
    return self.log_event(
        session_id=session_id,
        event_type='new_type',
        event_name='new_event',
        custom_data={'param1': param1, 'param2': param2},
        tg_user_id=tg_user_id
    )
```

2. **Добавить API эндпоинт** (`backend/app.py`):
```python
@app.route('/api/log/new-event-type', methods=['POST'])
def log_new_event_type():
    # Валидация и логика
    pass
```

3. **Обновить документацию** (`docs/API_ENDPOINTS.md`)

### Кастомная сегментация

```python
# В user_segmentation.py добавить новый критерий
def custom_segmentation_logic(user_analytics):
    if user_analytics['total_events'] > 100:
        return 'power_user'
    return 'regular'
```

## Troubleshooting

### Проблема: События не логируются

```bash
# Проверить API
curl http://localhost:5000/api/health

# Проверить базу данных
sqlite3 telegram-bot/bot_users.db ".tables"

# Проверить логи backend
tail -f backend/logs/app.log
```

### Проблема: Неверные сегменты

```bash
# Пересчитать сегменты
python -c "
from telegram_bot.user_segmentation import UserSegmentation
seg = UserSegmentation()
print('Сегмент пользователя 123:', seg.db.get_user_segment(123))
"
```

### Проблема: Медленная работа

```bash
# Оптимизировать базу данных
sqlite3 telegram-bot/bot_users.db "VACUUM; ANALYZE;"

# Проверить индексы
sqlite3 telegram-bot/bot_users.db ".indexes"
```

## Заключение

Система готова к продакшену и обеспечивает:
- Полное отслеживание пользовательского поведения
- Автоматическую сегментацию
- Масштабируемую архитектуру
- Готовые инструменты аналитики

**Внедряйте и оптимизируйте конверсию! 🚀**