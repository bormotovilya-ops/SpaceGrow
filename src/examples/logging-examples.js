/**
 * ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ СИСТЕМЫ ЛОГИРОВАНИЯ
 *
 * Этот файл содержит примеры использования всех функций логирования
 * для различных типов событий на сайте и в MiniApp.
 */

import { useLogEvent, useScrollTracker } from '../hooks/useLogEvent'
import LoggingWrapper, { PageLogger, SectionLogger } from '../components/LoggingWrapper'

// ============================================================================
// ОСНОВНОЕ ИСПОЛЬЗОВАНИЕ HOOK useLogEvent
// ============================================================================

function ExampleBasicUsage() {
  const {
    // Основные методы
    logEvent,
    ensureSession,
    getSessionInfo,

    // Специализированные логгеры
    logArrival,
    logMiniAppOpen,
    logContentView,
    logAIInteraction,
    logDiagnostics,
    logGameAction,
    logCTAClick,
    logPersonalPathView,

    // Утилиты
    createScrollTracker
  } = useLogEvent()

  // Пример логирования кастомного события
  const handleCustomEvent = async () => {
    await logEvent('custom', 'button_click', {
      page: 'landing',
      metadata: { buttonId: 'hero-cta', buttonText: 'Начать' }
    })
  }

  return (
    <button onClick={handleCustomEvent}>
      Кастомное событие
    </button>
  )
}

// ============================================================================
// АВТОМАТИЧЕСКОЕ ЛОГИРОВАНИЕ С LoggingWrapper
// ============================================================================

function ExampleAutoLogging() {
  return (
    <PageLogger pageId="about" pageTitle="О компании">
      <div>
        <SectionLogger sectionId="hero" sectionName="Главный экран">
          <h1>Добро пожаловать!</h1>
          <p>Автоматически логируется время просмотра и прокрутка</p>
        </SectionLogger>

        <SectionLogger sectionId="features" sectionName="Возможности">
          <div>Контент с автоматическим логированием</div>
        </SectionLogger>
      </div>
    </PageLogger>
  )
}

// ============================================================================
// ЛОГИРОВАНИЕ КОНТЕНТА
// ============================================================================

function ExampleContentLogging() {
  const { logContentView } = useLogEvent()

  const handleArticleView = async (articleId, title) => {
    await logContentView('article', articleId, {
      contentTitle: title,
      section: 'blog',
      timeSpent: 0, // будет обновляться автоматически
      scrollDepth: 0  // будет обновляться автоматически
    })
  }

  const handleVideoPlay = async (videoId, title) => {
    await logContentView('video', videoId, {
      contentTitle: title,
      section: 'portfolio'
    })
  }

  return (
    <div>
      <article onClick={() => handleArticleView('article-1', 'Как создать воронку продаж')}>
        Статья о воронках
      </article>
      <video onClick={() => handleVideoPlay('video-1', 'Кейс клиента')}>
        Видео кейс
      </video>
    </div>
  )
}

// ============================================================================
// ЛОГИРОВАНИЕ AI ВЗАИМОДЕЙСТВИЙ
// ============================================================================

function ExampleAIInteractionLogging() {
  const { logAIInteraction } = useLogEvent()
  const [messages, setMessages] = useState([])
  const startTime = useRef(Date.now())

  const handleSendMessage = async (message) => {
    setMessages(prev => [...prev, { role: 'user', content: message }])

    // Имитация ответа AI
    setTimeout(async () => {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Ответ AI' }])

      // Логируем взаимодействие
      const duration = Math.floor((Date.now() - startTime.current) / 1000)
      await logAIInteraction(
        messages.length + 1, // количество сообщений
        ['sales_funnel', 'consultation'], // темы
        duration, // длительность в секундах
        'consultation' // тип разговора
      )
    }, 1000)
  }

  return (
    <div>
      {/* Сообщения */}
      {messages.map((msg, i) => (
        <div key={i} className={msg.role}>
          {msg.content}
        </div>
      ))}

      <input
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            handleSendMessage(e.target.value)
            e.target.value = ''
          }
        }}
        placeholder="Задайте вопрос..."
      />
    </div>
  )
}

// ============================================================================
// ЛОГИРОВАНИЕ ДИАГНОСТИКИ
// ============================================================================

function ExampleDiagnosticsLogging() {
  const { logDiagnostics } = useLogEvent()
  const [answers, setAnswers] = useState({})
  const startTime = useRef(null)

  const startDiagnostics = async () => {
    startTime.current = new Date().toISOString()
    await logDiagnostics('start')
  }

  const completeDiagnostics = async () => {
    const endTime = new Date().toISOString()
    await logDiagnostics('complete', {
      results: answers,
      start_time: startTime.current,
      end_time: endTime,
      progress: {
        completion_rate: 100.0,
        total_questions: 15,
        answered_questions: Object.keys(answers).length
      }
    })
  }

  const handleAnswer = async (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))

    // Логируем прогресс
    await logDiagnostics('progress', null, null, null, {
      completion_rate: (Object.keys(answers).length / 15) * 100,
      current_question: questionId
    })
  }

  return (
    <div>
      <button onClick={startDiagnostics}>Начать диагностику</button>
      {/* Вопросы диагностики */}
      <button onClick={completeDiagnostics}>Завершить</button>
    </div>
  )
}

// ============================================================================
// ЛОГИРОВАНИЕ ИГРОВЫХ ДЕЙСТВИЙ
// ============================================================================

function ExampleGameLogging() {
  const { logGameAction } = useLogEvent()

  const handleGameStart = async () => {
    await logGameAction('calculator', 'start', {
      game_mode: 'advanced',
      difficulty: 'medium'
    })
  }

  const handleGameComplete = async (score, timeSpent) => {
    await logGameAction('calculator', 'complete', {
      final_score: score,
      calculations_count: 25,
      correct_answers: 23
    }, {
      score,
      achievement: score > 90 ? 'master_calculator' : 'good_calculator',
      duration: timeSpent
    })
  }

  const handleGameFail = async (reason) => {
    await logGameAction('calculator', 'fail', {
      fail_reason: reason,
      progress: 75
    })
  }

  return (
    <div>
      <button onClick={handleGameStart}>Начать игру</button>
      <button onClick={() => handleGameComplete(95, 180)}>Завершить успешно</button>
      <button onClick={() => handleGameFail('time_out')}>Завершить с ошибкой</button>
    </div>
  )
}

// ============================================================================
// ЛОГИРОВАНИЕ CTA КЛИКОВ
// ============================================================================

function ExampleCTALogging() {
  const { logCTAClick } = useLogEvent()

  const handleTelegramClick = async () => {
    await logCTAClick('telegram_contact', {
      ctaText: '@ilyaborm',
      ctaLocation: 'header',
      previousStep: 'viewed_portfolio'
    })
  }

  const handleConsultationClick = async () => {
    await logCTAClick('book_consultation', {
      ctaText: 'Записаться на консультацию',
      ctaLocation: 'hero_section',
      previousStep: 'read_about_services'
    })
  }

  const handleDownloadClick = async (fileName) => {
    await logCTAClick('download_pdf', {
      ctaText: `Скачать ${fileName}`,
      ctaLocation: 'resources_section'
    })
  }

  return (
    <div>
      <button onClick={handleTelegramClick}>Написать в Telegram</button>
      <button onClick={handleConsultationClick}>Консультация</button>
      <button onClick={() => handleDownloadClick('План развития.pdf')}>
        Скачать PDF
      </button>
    </div>
  )
}

// ============================================================================
// ЛОГИРОВАНИЕ ПРОСМОТРА ПЕРСОНАЛЬНОГО ПУТИ
// ============================================================================

function ExamplePersonalPathLogging() {
  const { logPersonalPathView } = useLogEvent()
  const viewStartTime = useRef(null)

  const handleOpenPersonalPath = async () => {
    viewStartTime.current = new Date().toISOString()
    await logPersonalPathView(viewStartTime.current, 0, false)
  }

  const handleDownloadPDF = async (duration) => {
    await logPersonalPathView(viewStartTime.current, duration, true)
  }

  return (
    <div>
      <button onClick={handleOpenPersonalPath}>Открыть персональный путь</button>
      <button onClick={() => handleDownloadPDF(120)}>Скачать PDF (2 мин просмотра)</button>
    </div>
  )
}

// ============================================================================
// РУЧНОЕ ОТСЛЕЖИВАНИЕ ПРОКРУТКИ
// ============================================================================

function ExampleManualScrollTracking() {
  const { trackScroll, trackTime } = useScrollTracker('manual-content', 'article')

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      trackScroll(Math.round(scrolled))
    }

    window.addEventListener('scroll', handleScroll)

    // Периодическое логирование времени
    const interval = setInterval(trackTime, 30000) // каждые 30 секунд

    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearInterval(interval)
      trackTime() // финальное логирование
    }
  }, [trackScroll, trackTime])

  return (
    <div>
      <h1>Статья с ручным отслеживанием</h1>
      <p>Длинный контент...</p>
    </div>
  )
}

// ============================================================================
// ИСПОЛЬЗОВАНИЕ В КОМПОНЕНТАХ С СОБЫТИЯМИ
// ============================================================================

function ExampleComponentIntegration() {
  const { logCTAClick, logContentView } = useLogEvent()

  useEffect(() => {
    // Логируем просмотр компонента
    logContentView('component', 'example-component', {
      section: 'examples'
    })
  }, [logContentView])

  const handleButtonClick = async (buttonType) => {
    await logCTAClick(buttonType, {
      ctaLocation: 'example_component',
      previousStep: 'viewed_examples'
    })
  }

  return (
    <div>
      <button onClick={() => handleButtonClick('primary_action')}>
        Основное действие
      </button>
      <button onClick={() => handleButtonClick('secondary_action')}>
        Второстепенное действие
      </button>
    </div>
  )
}

export {
  ExampleBasicUsage,
  ExampleAutoLogging,
  ExampleContentLogging,
  ExampleAIInteractionLogging,
  ExampleDiagnosticsLogging,
  ExampleGameLogging,
  ExampleCTALogging,
  ExamplePersonalPathLogging,
  ExampleManualScrollTracking,
  ExampleComponentIntegration
}