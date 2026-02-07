import React, { useState, useEffect, useRef } from 'react'
import Header from './Header'
import './Profile.css'
import { yandexMetricaReachGoal } from '../analytics/yandexMetrica'
import { openTelegramLink } from '../utils/telegram'
import { useLogEvent } from '../hooks/useLogEvent'
import { useHashSectionScroll } from '../hooks/useHashSectionScroll'

// Импорт изображений технологического стека
import img11 from '../assets/images/11.png'
import img22 from '../assets/images/22.png'
import img33 from '../assets/images/33.png'
import img44 from '../assets/images/44.png'

const MAX_METADATA_TEXT = 1000
const truncateForMetadata = (s) => (s == null ? '' : String(s).substring(0, MAX_METADATA_TEXT))

function Profile({ onBack, onAvatarClick, onDiagnostics, onAlchemyClick, onChatClick, onHomeClick, onPersonReport }) {
  const { logContentView, logEvent, logCTAClick, trackSectionView } = useLogEvent()
  const trackedSectionsRef = useRef(new Set())
  // Добавляем пятый слот для блока персонального отчета
  const [typingMessages, setTypingMessages] = useState([false, false, false, false, false]) // Показывать многоточие
  const [visibleMessages, setVisibleMessages] = useState([false, false, false, false, false]) // Показывать текст
  const [expandedCases, setExpandedCases] = useState([false, false, false]) // Раскрытые кейсы
  const [expandedTechStack, setExpandedTechStack] = useState([false, false, false, false]) // Раскрытый технологический стек
  const [chatMessages, setChatMessages] = useState([]) // Сообщения чата (вопросы и ответы)
  const [chatInput, setChatInput] = useState('') // Текст в поле ввода
  const [isLoadingChat, setIsLoadingChat] = useState(false) // Загрузка ответа
  
  useEffect(() => {
    logContentView('page', 'profile', { content_title: 'Профиль (Илья Бормотов)' })
  }, [logContentView])

  useEffect(() => {
    trackSectionView('profile')
  }, [trackSectionView])

  // Трекинг секций при скролле: data-section-id должен совпадать с id или matchId в sitemapData
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const sectionId = entry.target.getAttribute('data-section-id')
          if (!sectionId || trackedSectionsRef.current.has(sectionId)) return
          trackedSectionsRef.current.add(sectionId)
          trackSectionView(sectionId)
        })
      },
      { rootMargin: '0px 0px -20% 0px', threshold: 0.8 }
    )
    const nodes = document.querySelectorAll('[data-section-id]')
    nodes.forEach((el) => observer.observe(el))
    return () => nodes.forEach((el) => observer.unobserve(el))
  }, [trackSectionView])

  useHashSectionScroll({ clearAfterScroll: true })

  const handleHeaderConsultation = () => {
    // Top CTA in Header must always open Diagnostics.
    yandexMetricaReachGoal(null, 'open_diagnostics', { placement: 'header', page: 'profile' })
    if (onDiagnostics) onDiagnostics()
  }

  const handleConsultation = async (e) => {
    const url = 'https://t.me/ilyaborm'
    const buttonText = e?.target?.innerText?.trim()
    await logCTAClick('profile_consultation', {
      section_id: 'profile-cta',
      page: '/profile',
      cta_opens_tg: true,
      ctaText: buttonText || 'Получить бесплатную консультацию',
      element_text: buttonText,
      ctaLocation: 'profile'
    })
    const opened = openTelegramLink(url)
    yandexMetricaReachGoal(null, 'profile_consultation_click', { to: 'telegram', url, opened })
  }

  const handleHeaderAvatarClick = () => {
    // Если передан обработчик, вызываем его, иначе просто возвращаемся назад
    if (onAvatarClick) {
      onAvatarClick()
    } else {
      onBack()
    }
  }

  const toggleCase = (index) => {
    const newExpanded = [...expandedCases]
    newExpanded[index] = !newExpanded[index]
    setExpandedCases(newExpanded)
  }

  const toggleTechStack = (index) => {
    const newExpanded = [...expandedTechStack]
    newExpanded[index] = !newExpanded[index]
    setExpandedTechStack(newExpanded)
  }

  // Функция для очистки markdown-символов из ответа
  const cleanResponse = (text) => {
    if (!text) return text
    
    // Убираем markdown-символы
    let cleaned = text
      .replace(/\*\*/g, '') // Убираем **
      .replace(/###/g, '') // Убираем ###
      .replace(/\|\|/g, '') // Убираем ||
      .replace(/-----+/g, '') // Убираем ----- и более
      .replace(/---+/g, '') // Убираем --- и более
      .trim()
    
    return cleaned
  }

  // Рендерит кликабельные ссылки из markdown-формата [text](url) и голых URL
  const renderMessage = (text) => {
    if (!text) return null

    const elements = []
    const markdownRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g
    let lastIndex = 0
    let match

    const pushUrlFragments = (segment) => {
      if (!segment) return
      const urlRegex = /(https?:\/\/[^\s]+)/g
      let last = 0
      let m
      while ((m = urlRegex.exec(segment)) !== null) {
        if (m.index > last) {
          elements.push(segment.slice(last, m.index))
        }
        elements.push(
          <a key={`url-${elements.length}`} href={m[1]} target="_blank" rel="noopener noreferrer">
            {m[1]}
          </a>
        )
        last = urlRegex.lastIndex
      }
      if (last < segment.length) {
        elements.push(segment.slice(last))
      }
    }

    while ((match = markdownRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        pushUrlFragments(text.slice(lastIndex, match.index))
      }
      elements.push(
        <a key={`md-${elements.length}`} href={match[2]} target="_blank" rel="noopener noreferrer">
          {match[1]}
        </a>
      )
      lastIndex = markdownRegex.lastIndex
    }

    if (lastIndex < text.length) {
      pushUrlFragments(text.slice(lastIndex))
    }

    return elements
  }

  const handleChatSend = async () => {
    if (!chatInput.trim() || isLoadingChat) return

    const userQuestion = chatInput.trim()
    setChatInput('')

    yandexMetricaReachGoal(null, 'profile_chat_send', { length: userQuestion.length })
    
    console.log('💬 Отправка сообщения:', userQuestion)
    
    // Добавляем вопрос пользователя
    setChatMessages(prev => [...prev, { role: 'user', content: userQuestion }])
    setIsLoadingChat(true)

    try {
      // Считаем количество сообщений пользователя (только user сообщения)
      const userMessageCount = chatMessages.filter(msg => msg.role === 'user').length + 1
      
      console.log('📡 Отправка запроса к /api/chat...', { messageCount: userMessageCount })
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: userQuestion,
          messageCount: userMessageCount
        }),
      })

      console.log('📊 Ответ получен:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Не удалось прочитать ошибку')
        console.error('❌ Ошибка ответа сервера:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        })
        
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch (e) {
          errorData = { error: errorText || `Ошибка сервера (статус: ${response.status})` }
        }
        
        console.error('❌ Parsed error data:', errorData)
        let errorMessage = errorData.error || 'Извините, произошла ошибка.'
        
        // Более понятные сообщения для пользователя
        if (errorMessage.includes('API key') || errorMessage.includes('authentication') || errorMessage.includes('401')) {
          errorMessage = 'Ошибка авторизации. Проверьте, что токен Groq указан правильно в файле .env'
        } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
          errorMessage = 'Превышен лимит запросов. Попробуйте позже.'
        } else if (errorMessage.includes('model') || errorMessage.includes('404') || errorMessage.includes('not found')) {
          errorMessage = 'Временно недоступно. Используется режим заглушки.'
        } else if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('Failed to fetch') || errorMessage.includes('Network')) {
          errorMessage = 'Не удалось подключиться к серверу. Убедитесь, что локальный сервер запущен (npm run dev:server).'
        }
        
        const errorContent = `${errorMessage} Если проблема сохраняется, свяжитесь напрямую: @ilyaborm в Telegram.`
        setChatMessages(prev => [...prev, { role: 'assistant', content: errorContent }])
        logEvent('ai', 'ai_chat_message', {
          page: '/profile',
          metadata: {
            context: 'user_profile',
            user_message: truncateForMetadata(userQuestion),
            ai_response: truncateForMetadata(errorContent)
          }
        })
        setIsLoadingChat(false)
        return
      }

      const data = await response.json()
      console.log('✅ Данные получены:', {
        hasResponse: !!data.response,
        responseLength: data.response?.length,
        responsePreview: data.response?.substring(0, 100) + '...',
        source: data.source || 'unknown'
      })
      if (data.source) {
        console.log('📊 Источник ответа:', data.source === 'groq' ? '✅ Groq API' : '⚠️ Заглушка (mock)')
      }

      if (data.response) {
        // Очищаем ответ от markdown-символов (на всякий случай, если сервер не обработал)
        const cleanedResponse = cleanResponse(data.response)
        console.log('🧹 Очищенный ответ:', cleanedResponse.substring(0, 100) + '...')
        setChatMessages(prev => [...prev, { role: 'assistant', content: cleanedResponse }])
        logEvent('ai', 'ai_chat_message', {
          page: '/profile',
          metadata: {
            context: 'user_profile',
            user_message: truncateForMetadata(userQuestion),
            ai_response: truncateForMetadata(cleanedResponse)
          }
        })
      } else {
        console.warn('⚠️ Нет поля response в ответе:', data)
        const fallbackContent = 'Не удалось получить ответ. Попробуйте еще раз или свяжитесь напрямую: @ilyaborm в Telegram.'
        setChatMessages(prev => [...prev, { role: 'assistant', content: fallbackContent }])
        logEvent('ai', 'ai_chat_message', {
          page: '/profile',
          metadata: {
            context: 'user_profile',
            user_message: truncateForMetadata(userQuestion),
            ai_response: truncateForMetadata(fallbackContent)
          }
        })
      }
    } catch (error) {
      console.error('❌ Network Error:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
      const networkErrorContent = `Не удалось подключиться к серверу. Убедитесь, что локальный сервер запущен (npm run dev:server). Ошибка: ${error.message}`
      setChatMessages(prev => [...prev, { role: 'assistant', content: networkErrorContent }])
      logEvent('ai', 'ai_chat_message', {
        page: '/profile',
        metadata: {
          context: 'user_profile',
          user_message: truncateForMetadata(userQuestion),
          ai_response: truncateForMetadata(networkErrorContent)
        }
      })
    } finally {
      setIsLoadingChat(false)
      console.log('✅ Запрос завершен')
    }
  }

  const handleChatKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleChatSend()
    }
  }

  useEffect(() => {
    // Первое сообщение: показываем многоточие сразу
    setTypingMessages([true, false, false, false, false])

    // Через 2 секунды показываем текст первого сообщения и стартуем второй
    const timer1 = setTimeout(() => {
      setVisibleMessages([true, false, false, false, false])
      setTypingMessages([false, true, false, false, false])
    }, 2000)

    // Через 4 секунды показываем текст второго сообщения и стартуем третий
    const timer2 = setTimeout(() => {
      setVisibleMessages([true, true, false, false, false])
      setTypingMessages([false, false, true, false, false])
    }, 4000)

    // Через 6 секунд показываем текст третьего сообщения и стартуем четвертый
    const timer3 = setTimeout(() => {
      setVisibleMessages([true, true, true, false, false])
      setTypingMessages([false, false, false, true, false])
    }, 6000)

    // Через 8 секунд показываем текст четвертого сообщения и стартуем пятый
    const timer4 = setTimeout(() => {
      setVisibleMessages([true, true, true, true, false])
      setTypingMessages([false, false, false, false, true])
    }, 8000)

    // Через 10 секунд показываем текст пятого сообщения (персональный отчет)
    const timer5 = setTimeout(() => {
      setVisibleMessages([true, true, true, true, true])
      setTypingMessages([false, false, false, false, false])
    }, 10000)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
      clearTimeout(timer4)
      clearTimeout(timer5)
    }
  }, [])

  const handleHeaderHomeClick = () => {
    // Вернуться на пустую главную страницу
    if (onHomeClick) onHomeClick()
  }

  return (
    <div className="profile-container">
      <Header 
        onAvatarClick={handleHeaderAvatarClick}
        onConsultation={handleHeaderConsultation}
        onBack={onBack}
        onAlchemyClick={onAlchemyClick}
        onHomeClick={handleHeaderHomeClick}
        activeMenuId="profile"
      />
      
      <div className="profile-content">
        <div className="profile-sections">
          {/* Описание про АИЦП — Приветствие + диалог с ИИ */}
          <section id="profile-greeting" className="profile-section profile-intro-section" data-section-id="profile-greeting">
            <div className="profile-intro-content">
              <div className="profile-dialog-container">
                <div className="profile-avatar-wrapper">
                  <img src="/images/me.jpg" alt="Илья Бормотов" className="profile-avatar-large" />
                </div>
                <div className="profile-dialog-messages">
                  <div className={`dialog-message ${(typingMessages[0] || visibleMessages[0]) ? 'visible' : ''}`}>
                    {typingMessages[0] ? (
                      <p className="typing-indicator">
                        <span className="typing-dot">.</span>
                        <span className="typing-dot">.</span>
                        <span className="typing-dot">.</span>
                      </p>
                    ) : visibleMessages[0] ? (
                      <p>Меня зовут Бормотов Илья, я IT-интегратор АИЦП.</p>
                    ) : null}
                  </div>
                  <div className={`dialog-message ${(typingMessages[1] || visibleMessages[1]) ? 'visible' : ''}`}>
                    {typingMessages[1] ? (
                      <p className="typing-indicator">
                        <span className="typing-dot">.</span>
                        <span className="typing-dot">.</span>
                        <span className="typing-dot">.</span>
                      </p>
                    ) : visibleMessages[1] ? (
                      <p>Работаю с экспертами и онлайн-школами с доходом от 200 тысяч и довожу до 1–2 миллионов в месяц.</p>
                    ) : null}
                  </div>
                  <div className={`dialog-message ${(typingMessages[2] || visibleMessages[2]) ? 'visible' : ''}`}>
                    {typingMessages[2] ? (
                      <p className="typing-indicator">
                        <span className="typing-dot">.</span>
                        <span className="typing-dot">.</span>
                        <span className="typing-dot">.</span>
                      </p>
                    ) : visibleMessages[2] ? (
                      <p>Увлекаюсь темами самопознания, здоровья, финансовой свободы, творчества  и спорта</p>
                    ) : null}
                  </div>
                  <div className={`dialog-message ${(typingMessages[3] || visibleMessages[3]) ? 'visible' : ''}`}>
                    {typingMessages[3] ? (
                      <p className="typing-indicator">
                        <span className="typing-dot">.</span>
                        <span className="typing-dot">.</span>
                        <span className="typing-dot">.</span>
                      </p>
                    ) : visibleMessages[3] ? (
                      <p>Ниже подробнее описаны мои компетенции, кейсы, достижения, подход и контакты</p>
                    ) : null}
                  </div>

                  <div className={`dialog-message ${(typingMessages[4] || visibleMessages[4]) ? 'visible' : ''}`}>
                    {typingMessages[4] ? (
                      <p className="typing-indicator">
                        <span className="typing-dot">.</span>
                        <span className="typing-dot">.</span>
                        <span className="typing-dot">.</span>
                      </p>
                    ) : visibleMessages[4] ? (
                      <p>Я знаю о поведении пользователей на своих сайтах всё! 🤫 Не верите? Нажмите и убедитесь! 👇</p>
                    ) : null}
                  </div>
                  <div id="profile-report" className={`dialog-message ${visibleMessages[4] ? 'visible' : ''}`} data-section-id="profile-report">
                    {visibleMessages[4] && (
                      <button
                        className="dialog-button"
                        onClick={() => {
                          if (onPersonReport) onPersonReport()
                          else if (onHomeClick) onHomeClick()
                        }}
                      >
                        Посмотреть мой персональный отчет
                      </button>
                    )}
                  </div>

                  {/* Чат с пользователем — вопросы и ответы ИИ ниже приветствия и кнопки отчета */}
                  {chatMessages.map((msg, index) => (
                    <div key={index} className={`dialog-message chat-message ${msg.role === 'user' ? 'user-chat-message' : 'assistant-chat-message'} visible`}>
                    <p>{renderMessage(msg.content)}</p>
                    </div>
                  ))}
                  {isLoadingChat && (
                    <div className="dialog-message chat-message assistant-chat-message visible">
                      <p className="typing-indicator">
                        <span className="typing-dot">.</span>
                        <span className="typing-dot">.</span>
                        <span className="typing-dot">.</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Поле ввода для вопросов — Диалог с ИИ */}
              <div id="profile-ai" className="profile-chat-input-container" data-section-id="profile-ai">
                <input
                  type="text"
                  className="profile-chat-input"
                  placeholder="Задайте вопрос..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={handleChatKeyPress}
                  disabled={isLoadingChat}
                />
                <button
                  className="profile-chat-send-btn"
                  onClick={handleChatSend}
                  disabled={!chatInput.trim() || isLoadingChat}
                  aria-label="Отправить"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </div>
              <div className="profile-aicp-explanation">
                <p className="profile-aicp-answer">
                  <strong>АИЦП</strong> - Автоматизированные интеллектуальные цепочки продаж.
                </p>
              </div>
            </div>
          </section>

          {/* Кейсы */}
          <section id="profile-cases" className="profile-section" data-section-id="profile-cases">
            <h2>Кейсы</h2>
            <div className="cases-cards-grid">
              {/* Карточка 1: Инфобизнес и EdTech */}
              <div className={`case-main-card ${expandedCases[0] ? 'expanded' : ''}`}>
                <div className="case-main-card-image" onClick={() => toggleCase(0)}>
                  <img src="/images/1.png" alt="Инфобизнес и EdTech" />
                </div>
                <div className="case-main-card-header" onClick={() => toggleCase(0)}>
                  <h3 className="case-main-card-title">Инфобизнес и EdTech</h3>
                  <span className={`case-toggle-icon ${expandedCases[0] ? 'expanded' : ''}`}>▼</span>
                </div>
                <div className={`case-main-card-content ${expandedCases[0] ? 'expanded' : ''}`}>
                  <p className="case-main-card-description">
                    Комплексная автоматизация обучения: от продающих лендингов до настройки GetCourse и ботов-помощников.
                  </p>
                  <div className="case-main-card-links">
                    <div className="case-link-group">
                      <strong>Лендинги на Wordpress:</strong>
                    <ul>
                      <li><a href="https://vyoga.ru/elementor-%D0%BB%D0%B5%D0%BD%D0%B4%D0%B8%D0%BD%D0%B3-1965" target="_blank" rel="noopener noreferrer">Общий лендинг: Йога и Цигун</a></li>
                      <li><a href="https://vyoga.ru/elementor-%D0%BB%D0%B5%D0%BD%D0%B4%D0%B8%D0%BD%D0%B3-1984/" target="_blank" rel="noopener noreferrer">Курс «Дао женского здоровья»</a></li>
                      <li><a href="https://vyoga.ru/elementor-%D0%BB%D0%B5%D0%BD%D0%B4%D0%B8%D0%BD%D0%B3-1887/" target="_blank" rel="noopener noreferrer">Программа «Здоровая спина»</a></li>
                      <li><a href="https://vyoga.ru/elementor-%D0%BB%D0%B5%D0%BD%D0%B4%D0%B8%D0%BD%D0%B3-1945/" target="_blank" rel="noopener noreferrer">Курс «Здоровье нервной системы»</a></li>
                    </ul>
                  </div>
                  <div className="case-link-group">
                    <strong>Сайты:</strong>
                    <ul>
                      <li><a href="https://doshatest.ru" target="_blank" rel="noopener noreferrer">Сайт-тест по Аюрведе (DoshaTest)</a></li>
                    </ul>
                  </div>
                  <div className="case-link-group">
                    <strong>Видеокурсы в боте:</strong>
                    <ul>
                      <li><a href="https://t.me/meditasiya_bot" target="_blank" rel="noopener noreferrer">Бот по медитациям</a></li>
                      <li><a href="https://t.me/V_Yoga_Bot" target="_blank" rel="noopener noreferrer">Бот по йоге и цигун</a></li>
                      <li><a href="https://t.me/VocallessonsLaika_Bot" target="_blank" rel="noopener noreferrer">Уроки вокала</a></li>
                    </ul>
                  </div>
                  <div className="case-link-group">
                    <strong>GetCourse:</strong>
                    <ul>
                      <li><a href="https://rcdway.ru/" target="_blank" rel="noopener noreferrer">Обучение руководителей для rcdway.ru</a></li>
                      <li><a href="https://vyoga.ru/elementor-%D0%BB%D0%B5%D0%BD%D0%B4%D0%B8%D0%BD%D0%B3-1965" target="_blank" rel="noopener noreferrer">Курсы по йоге для vyoga.ru</a></li>
                    </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Карточка 2: Маркетинг и Mini Apps */}
              <div className={`case-main-card ${expandedCases[1] ? 'expanded' : ''}`}>
                <div className="case-main-card-image" onClick={() => toggleCase(1)}>
                  <img src="/images/2.png" alt="Маркетинг и Mini Apps" />
                </div>
                <div className="case-main-card-header" onClick={() => toggleCase(1)}>
                  <h3 className="case-main-card-title">Маркетинг и Mini Apps</h3>
                  <span className={`case-toggle-icon ${expandedCases[1] ? 'expanded' : ''}`}>▼</span>
                </div>
                <div className={`case-main-card-content ${expandedCases[1] ? 'expanded' : ''}`}>
                  <p className="case-main-card-description">
                    Современные WebApp-интерфейсы внутри Telegram и воронки продаж, которые превращают подписчиков в покупателей.
                  </p>
                  <div className="case-main-card-links">
                    <div className="case-link-group">
                      <strong>Showcase:</strong>
                    <ul>
                      <li><a href="https://miniappvizitka.vercel.app/" target="_blank" rel="noopener noreferrer">Визитка MiniApp</a></li>
                      <li><a href="https://telegram.me/krasota_vostoka_bot" target="_blank" rel="noopener noreferrer">Магазин чая</a></li>
                    </ul>
                  </div>
                  <div className="case-link-group">
                    <strong>Воронки:</strong>
                    <ul>
                      <li><a href="https://telegram.me/weinihaoru_bot" target="_blank" rel="noopener noreferrer">Школа китайского (1000+ чел)</a></li>
                      <li><a href="https://telegram.me/SafeSaleLawBot" target="_blank" rel="noopener noreferrer">Юридические эксперты</a></li>
                      <li><a href="https://telegram.me/logachev_legal_bot" target="_blank" rel="noopener noreferrer">Юридические услуги для бизнеса</a></li>
                    </ul>
                  </div>
                  <div className="case-link-group">
                    <strong>Events:</strong>
                    <ul>
                      <li><a href="https://t.me/kidcodes_music_bot" target="_blank" rel="noopener noreferrer">Запись на концерты</a></li>
                      <li><a href="https://t.me/FDatingPermBot" target="_blank" rel="noopener noreferrer">Бот знакомств</a></li>
                    </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Карточка 3: Автоматизация и B2B (1С) */}
              <div className={`case-main-card ${expandedCases[2] ? 'expanded' : ''}`}>
                <div className="case-main-card-image" onClick={() => toggleCase(2)}>
                  <img src="/images/3.png" alt="Автоматизация и B2B" />
                </div>
                <div className="case-main-card-header" onClick={() => toggleCase(2)}>
                  <h3 className="case-main-card-title">Автоматизация и B2B (1С)</h3>
                  <span className={`case-toggle-icon ${expandedCases[2] ? 'expanded' : ''}`}>▼</span>
                </div>
                <div className={`case-main-card-content ${expandedCases[2] ? 'expanded' : ''}`}>
                  <p className="case-main-card-description">
                    Сложные технические решения для интеграции мессенджеров с корпоративным ПО и учетными системами.
                  </p>
                  <div className="case-main-card-links">
                    <div className="case-link-group">
                      <strong>ТКО-Сервис:</strong>
                    <ul>
                      <li><a href="https://t.me/ProTKObot" target="_blank" rel="noopener noreferrer">Система учета на базе 1С (1.5+ года работы, 1000+ чел)</a></li>
                    </ul>
                  </div>
                  <div className="case-link-group">
                    <strong>Экосистема для стройки:</strong>
                    <ul>
                      <li><a href="https://telegram.me/PriemkaGarantBot" target="_blank" rel="noopener noreferrer">Приемка</a></li>
                      <li><a href="https://telegram.me/reclamation_kv_bot" target="_blank" rel="noopener noreferrer">Рекламации</a></li>
                      <li><a href="https://telegram.me/BuildOrdersBot" target="_blank" rel="noopener noreferrer">Закупки</a></li>
                      <li><a href="https://telegram.me/AccessStroyBot" target="_blank" rel="noopener noreferrer">QR-проходная</a></li>
                    </ul>
                  </div>
                  <div className="case-link-group">
                    <strong>Запись на услуги:</strong>
                    <ul>
                      <li><a href="https://telegram.me/BeautyWitchBot" target="_blank" rel="noopener noreferrer">Бот для кабинета косметолога</a></li>
                    </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="cases-note">
              <p>Больше кейсов на <a href="https://t.me/SoulGuideIT" target="_blank" rel="noopener noreferrer">https://t.me/SoulGuideIT</a></p>
            </div>
          </section>

          {/* Компетенции */}
          <section id="profile-tech" className="profile-section" data-section-id="profile-tech">
            <h2>Технологический стек</h2>
            <div className="tech-stack-grid">
              <div className={`tech-stack-card ${expandedTechStack[0] ? 'expanded' : ''}`}>
                <div className="tech-stack-icon" onClick={() => toggleTechStack(0)}>
                  <img src={img11} alt="Web-разработка" />
                </div>
                <div className="tech-stack-header" onClick={() => toggleTechStack(0)}>
                  <h3>Web-разработка</h3>
                  <span className={`tech-toggle-icon ${expandedTechStack[0] ? 'expanded' : ''}`}>▼</span>
                </div>
                <div className={`tech-stack-content ${expandedTechStack[0] ? 'expanded' : ''}`}>
                  <p>Создание лендингов и многостраничных сайтов как на конструкторах, так и кастомных решений для высокой скорости загрузки.</p>
                  
                  <div className="tech-stack-section">
                    <strong>Инструменты и технологии:</strong> Tilda, Wordpress, Taplink, GetCourse, React/Vercel, C#, MS Visual Studio, VBA.
                  </div>

                  <div className="tech-stack-section">
                    <strong>Аналитика и проектирование:</strong> Системный анализ, Figma (макеты экранов), UML (модели бизнес-объектов).
                  </div>

                  <div className="tech-stack-section">
                    <strong>Документация:</strong> Разработка бизнес-требований, ТЗ и проектной документации.
                  </div>
                </div>
              </div>
              <div className={`tech-stack-card ${expandedTechStack[1] ? 'expanded' : ''}`}>
                <div className="tech-stack-icon" onClick={() => toggleTechStack(1)}>
                  <img src={img22} alt="Чат-боты и Mini Apps" />
                </div>
                <div className="tech-stack-header" onClick={() => toggleTechStack(1)}>
                  <h3>Чат-боты и Mini Apps</h3>
                  <span className={`tech-toggle-icon ${expandedTechStack[1] ? 'expanded' : ''}`}>▼</span>
                </div>
                <div className={`tech-stack-content ${expandedTechStack[1] ? 'expanded' : ''}`}>
                  <p>Разработка интерфейсов внутри мессенджера, которые заменяют полноценные мобильные приложения и сайты.</p>
                  
                  <div className="tech-stack-section">
                    <strong>Платформы и языки:</strong> Python, LeadTeh, BotHelp, SaleBot.
                  </div>

                  <div className="tech-stack-section">
                    <strong>Интеграции:</strong> Работа с API, XML, XSD.
                  </div>

                  <div className="tech-stack-section">
                    <strong>Опыт:</strong> Реализовано более 20 ботов и Mini Apps для различных ниш бизнеса.
                  </div>
                </div>
              </div>
              <div className={`tech-stack-card ${expandedTechStack[2] ? 'expanded' : ''}`}>
                <div className="tech-stack-icon" onClick={() => toggleTechStack(2)}>
                  <img src={img33} alt="Автоматизация EdTech" />
                </div>
                <div className="tech-stack-header" onClick={() => toggleTechStack(2)}>
                  <h3>Автоматизация EdTech</h3>
                  <span className={`tech-toggle-icon ${expandedTechStack[2] ? 'expanded' : ''}`}>▼</span>
                </div>
                <div className={`tech-stack-content ${expandedTechStack[2] ? 'expanded' : ''}`}>
                  <p>Полная настройка платформы GetCourse, сборка автоворонок, интеграция платежей и CRM-систем.</p>
                  
                  <div className="tech-stack-section">
                    <strong>Ключевая платформа:</strong> GetCourse.
                  </div>

                  <div className="tech-stack-section">
                    <strong>Методология:</strong> Связка «методолог → технический специалист» для реализации программ обучения.
                  </div>

                  <div className="tech-stack-section">
                    <strong>Процессы:</strong> Сборка автоворонок, настройка викторин и игр для вовлечения студентов на сайте.
                  </div>

                  <div className="tech-stack-section">
                    <strong>Управление:</strong> Использование Jira и Wiki для ведения проектов.
                  </div>
                </div>
              </div>
              <div className={`tech-stack-card ${expandedTechStack[3] ? 'expanded' : ''}`}>
                <div className="tech-stack-icon" onClick={() => toggleTechStack(3)}>
                  <img src={img44} alt="Системная интеграция" />
                </div>
                <div className="tech-stack-header" onClick={() => toggleTechStack(3)}>
                  <h3>Системная интеграция</h3>
                  <span className={`tech-toggle-icon ${expandedTechStack[3] ? 'expanded' : ''}`}>▼</span>
                </div>
                <div className={`tech-stack-content ${expandedTechStack[3] ? 'expanded' : ''}`}>
                  <p>Связка сайтов и ботов с внутренним ПО бизнеса для полной автоматизации отчетности.</p>
                  
                  <div className="tech-stack-section">
                    <strong>Базы данных:</strong> MS SQL, Oracle (PL/SQL), PostgreSQL, проектирование витрин данных.
                  </div>

                  <div className="tech-stack-section">
                    <strong>Бизнес-софт:</strong> 1С: Бухгалтерия, 1C: Зарплата и кадры, интеграция ботов с системами 1С.
                  </div>

                  <div className="tech-stack-section">
                    <strong>Инструменты анализа:</strong> Bizagi Modeler (BPMN 2.0), PowerDesigner, TOAD, TFS.
                  </div>

                  <div className="tech-stack-section">
                    <strong>Обмен данными:</strong> MQ (очереди сообщений), работа со сторонними API.
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Достижения */}
          <section id="profile-achievements" className="profile-section" data-section-id="profile-achievements">
            <h2>Достижения</h2>
            <div className="achievements-grid">
              <div className="achievement-card">
                <div className="achievement-number">19+</div>
                <h3>Лет в IT, из них 15 лет в Enterprise</h3>
                <p>Руководил IT-проектами для ЦБ РФ и Минздрава.</p>
              </div>
              <div className="achievement-card">
                <div className="achievement-number">1 млрд. ₽ +</div>
                <h3>Суммарный бюджет систем</h3>
                <p>разработанных под моим управлением.</p>
              </div>
              <div className="achievement-card">
                <div className="achievement-number">30+</div>
                <h3>Внедренных экосистем</h3>
                <p>Запустил более 30 ботов и автоворонок за последние 3 года.</p>
              </div>
              <div className="achievement-card">
                <div className="achievement-number">500к ₽</div>
                <h3>Максимальный чек за одного бота</h3>
                <p>Я создаю сложные активы, а не просто чат-ботов.</p>
              </div>
            </div>
          </section>

          {/* Подход */}
          <section id="profile-approach" className="profile-section" data-section-id="profile-approach">
            <h2>Мой подход</h2>
            <div className="approach-list">
              <div className="approach-item">
                <div className="approach-icon">
                  <img src="/images/цель.png" alt="Цели" />
                </div>
                <div>
                  <h3>Цели — фундамент</h3>
                  <p>Сначала проектирую логику и KPI, и только потом внедряю софт. Инструменты служат задачам бизнеса, а не наоборот.</p>
                </div>
              </div>
              <div className="approach-item">
                <div className="approach-icon">
                  <img src="/images/цепочка.png" alt="Экосистема" />
                </div>
                <div>
                  <h3>Единая экосистема</h3>
                  <p>Никаких разрозненных ботов и «костылей». Связываю трафик, CRM и аналитику в систему, работающую как часы.</p>
                </div>
              </div>
              <div className="approach-item">
                <div className="approach-icon">
                  <img src="/images/roi.png" alt="ROI" />
                </div>
                <div>
                  <h3>Работа на ROI</h3>
                  <p>Я не зарабатываю на вас, я зарабатываю вместе с вами. Мой главный приоритет — превратить ваш бюджет в чистую прибыль.</p>
                </div>
              </div>
              <div className="approach-item">
                <div className="approach-icon">
                  <img src="/images/Прозрачно.png" alt="Прозрачность" />
                </div>
                <div>
                  <h3>Прозрачный темп</h3>
                  <p>Работаю без бюрократии и длинных цепочек. Все процессы на виду, быстрая реакция и запуск MVP в кратчайшие сроки.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Контакты */}
          <section id="profile-contacts" className="profile-section" data-section-id="profile-contacts">
            <h2>Контакты</h2>
            <div className="contacts-list">
              <a href="tel:+79991237788" className="contact-line">
                <span className="contact-icon">📞</span>
                <span className="contact-label">Телефон:</span>
                <span className="contact-value">+7 (999) 123-77-88</span>
              </a>
              
              <a href="mailto:bormotovilya@gmail.com" className="contact-line">
                <span className="contact-icon">📧</span>
                <span className="contact-label">Email:</span>
                <span className="contact-value">bormotovilya@gmail.com</span>
              </a>
              
              <a href="https://t.me/ilyaborm" target="_blank" rel="noopener noreferrer" className="contact-line">
                <span className="contact-icon">
                  <img src="/images/telegram-icon.png" alt="Telegram" className="telegram-icon-img" />
                </span>
                <span className="contact-label">Telegram:</span>
                <span className="contact-value">@ilyaborm</span>
              </a>
              
              <a href="https://t.me/SoulGuideIT" target="_blank" rel="noopener noreferrer" className="contact-line">
                <span className="contact-icon">📢</span>
                <span className="contact-label">Канал:</span>
                <span className="contact-value">@SoulGuideIT</span>
              </a>
              
              <a href="https://t.me/VisitCardIlyaBormotov_Bot" target="_blank" rel="noopener noreferrer" className="contact-line">
                <span className="contact-icon">🤖</span>
                <span className="contact-label">Бот:</span>
                <span className="contact-value">Визитная карточка</span>
              </a>
            </div>
          </section>

          {/* Реквизиты */}
          <section id="profile-requisites" className="profile-section" data-section-id="profile-requisites">
            <h2>Реквизиты организации</h2>
            <div className="requisites-info">
              <div className="requisite-item">
                <span className="requisite-label">ИП:</span>
                <span className="requisite-value">Бормотов Илья Михайлович</span>
              </div>
              <div className="requisite-item">
                <span className="requisite-label">ИНН:</span>
                <span className="requisite-value">590313353407</span>
              </div>
              <div className="requisite-item">
                <span className="requisite-label">ОГРНИП:</span>
                <span className="requisite-value">318595800124661</span>
              </div>
            </div>
            <div className="requisites-note">
              <p>Полные реквизиты предоставляются при заключении договора</p>
            </div>
          </section>

          {/* Кнопка консультации */}
          <div id="profile-cta" className="consultation-section" data-section-id="profile-cta">
            <button className="profile-consultation-btn" onClick={handleConsultation}>
              Получить бесплатную консультацию
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
