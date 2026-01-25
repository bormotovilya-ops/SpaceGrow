# Система логирования пользовательских действий

Комплексная система для отслеживания всех действий пользователей на сайте и в MiniApp с автоматической отправкой данных в backend для аналитики.

## 🚀 Быстрый старт

Система автоматически инициализируется при запуске приложения через `SessionInitializer`. Все события логируются в таблицы:
- `user_identities` - связи пользователей
- `site_sessions` - сессии
- `site_events` - события
- `diagnostics_results` - результаты диагностики

## 📋 Основные возможности

### 1. Автоматическая инициализация
```jsx
// В App.jsx уже добавлено
<SessionInitializer>
  <PageLogger pageId="main" pageTitle="Main Page">
    {/* Ваш контент */}
  </PageLogger>
</SessionInitializer>
```

### 2. Автоматическое логирование контента
```jsx
import { PageLogger, SectionLogger } from './components/LoggingWrapper'

function MyPage() {
  return (
    <PageLogger pageId="about" pageTitle="О компании">
      <SectionLogger sectionId="hero" sectionName="Главный экран">
        <h1>Контент с автоматическим логированием</h1>
      </SectionLogger>
    </PageLogger>
  )
}
```

### 3. Ручное логирование событий
```jsx
import { useLogEvent } from './hooks/useLogEvent'

function MyComponent() {
  const { logCTAClick, logContentView } = useLogEvent()

  const handleClick = async () => {
    await logCTAClick('telegram_contact', {
      ctaText: '@username',
      ctaLocation: 'header'
    })
  }

  return <button onClick={handleClick}>Связаться</button>
}
```

## 🎯 Типы отслеживаемых событий

### 1. Приход пользователя (Arrival)
```jsx
const { logArrival } = useLogEvent()

// Автоматически логируется при инициализации
// Определяет источник: telegram, vk, direct, search, referrer
```

### 2. Открытие MiniApp
```jsx
const { logMiniAppOpen } = useLogEvent()

// Автоматически логируется для Telegram WebApp
await logMiniAppOpen('main') // pageId
```

### 3. Просмотр контента
```jsx
const { logContentView } = useLogEvent()

await logContentView('article', 'article-123', {
  contentTitle: 'Заголовок статьи',
  section: 'blog',
  timeSpent: 120, // секунды
  scrollDepth: 75  // проценты
})
```

### 4. AI взаимодействие
```jsx
const { logAIInteraction } = useLogEvent()

await logAIInteraction(
  5, // количество сообщений
  ['sales', 'consultation'], // темы
  180, // длительность в секундах
  'consultation' // тип разговора
)
```

### 5. Диагностика/Тест
```jsx
const { logDiagnostics } = useLogEvent()

// Начало
await logDiagnostics('start')

// Прогресс
await logDiagnostics('progress', null, null, null, {
  completion_rate: 60.0
})

// Завершение
await logDiagnostics('complete', {
  results: { question1: 'answer1' },
  start_time: '2024-01-01T10:00:00Z',
  end_time: '2024-01-01T10:05:00Z',
  progress: { completion_rate: 100.0 }
})
```

### 6. Игровые действия
```jsx
const { logGameAction } = useLogEvent()

await logGameAction('calculator', 'complete', {
  final_score: 95,
  difficulty: 'hard'
}, {
  score: 95,
  achievement: 'math_master',
  duration: 300
})
```

### 7. CTA клики
```jsx
const { logCTAClick } = useLogEvent()

await logCTAClick('telegram_contact', {
  ctaText: 'Написать в Telegram',
  ctaLocation: 'header',
  previousStep: 'viewed_portfolio'
})
```

### 8. Персональный путь/PDF
```jsx
const { logPersonalPathView } = useLogEvent()

await logPersonalPathView(
  '2024-01-01T10:00:00Z', // время открытия
  120, // длительность просмотра
  true // скачан ли файл
)
```

## 🔧 Расширенные возможности

### Ручное отслеживание прокрутки
```jsx
import { useScrollTracker } from './components/LoggingWrapper'

function MyComponent() {
  const { trackScroll, trackTime } = useScrollTracker('content-id', 'article')

  useEffect(() => {
    const handleScroll = () => {
      const scrollPercent = calculateScrollPercent()
      trackScroll(scrollPercent)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [trackScroll])

  return <div>Контент</div>
}
```

### Кастомные события
```jsx
const { logEvent } = useLogEvent()

await logEvent('custom_category', 'custom_event', {
  page: 'current-page',
  metadata: { customData: 'value' },
  custom_data: { additional: 'data' }
})
```

## 📊 Структура данных

### User Identities
```sql
CREATE TABLE user_identities (
  tg_user_id INTEGER,
  cookie_id TEXT,
  source TEXT,
  linked_at TIMESTAMP
)
```

### Site Sessions
```sql
CREATE TABLE site_sessions (
  cookie_id TEXT,
  tg_user_id INTEGER,
  session_start TIMESTAMP,
  source TEXT, -- Источник прихода
  utm_params JSON,
  device_info JSON
)
```

### Site Events
```sql
CREATE TABLE site_events (
  session_id INTEGER,
  event_type TEXT,
  event_name TEXT,
  metadata JSON,
  custom_data JSON
)
```

## 🔍 Аналитика и сегментация

Система предоставляет готовые методы для:

- **Воронка конверсии**: `getConversionFunnel()`
- **Сегменты пользователей**: `getUserSegment(tg_user_id)`
- **Аналитика пользователя**: `getUserAnalytics(tg_user_id)`
- **Общая статистика**: `getSiteStats()`

## 🛠 Интеграция в существующие компоненты

### Пример: Добавление логирования в кнопку
```jsx
function MyButton({ children, onClick, ...props }) {
  const { logCTAClick } = useLogEvent()

  const handleClick = async (e) => {
    await logCTAClick('button_click', {
      ctaText: children,
      ctaLocation: 'component_name'
    })

    if (onClick) onClick(e)
  }

  return (
    <button onClick={handleClick} {...props}>
      {children}
    </button>
  )
}
```

### Пример: Логирование форм
```jsx
function ContactForm() {
  const { logCTAClick } = useLogEvent()

  const handleSubmit = async (formData) => {
    await logCTAClick('form_submit', {
      ctaText: 'Отправить заявку',
      ctaLocation: 'contact_form'
    })

    // Отправка формы...
  }

  return <form onSubmit={handleSubmit}>...</form>
}
```

## ⚙️ Конфигурация

### Переменные окружения
```env
VITE_API_URL=http://localhost:5000/api  # URL backend API
```

### Настройки логирования
```javascript
// В utils/logging.js можно настроить:
- debounce задержки
- пороги scroll/time tracking
- фильтры для разных типов событий
```

## 📈 Мониторинг и отладка

### Проверка работы
```javascript
const { getSessionInfo } = useLogEvent()

console.log(getSessionInfo())
// {
//   sessionId: 123,
//   cookieId: "uuid-string",
//   tgUserId: 456789
// }
```

### Логи в консоли
Система логирует все действия в консоль браузера с префиксом `[LOGGING]`.

## 🎯 Лучшие практики

1. **Всегда используйте асинхронные вызовы** для логирования
2. **Оборачивайте важные разделы** в `PageLogger`/`SectionLogger`
3. **Логируйте CTA клики** для отслеживания конверсии
4. **Используйте автоматическое логирование** для контента
5. **Добавляйте контекст** в metadata для лучшей аналитики

## 🚨 Важные замечания

- Логирование **не блокирует** работу приложения при ошибках API
- Все события **дебаунсятся** для предотвращения спама
- **Автоматическая сессия** создается при первом действии пользователя
- **Идентификация** происходит через cookie + Telegram ID

## 📝 Примеры кода

Подробные примеры использования всех функций см. в файле `src/examples/logging-examples.js`.