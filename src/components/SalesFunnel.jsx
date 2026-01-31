import React, { useState, useEffect } from 'react'
import Portfolio from './Portfolio'
import Profile from './Profile'
import PersonReport from './PersonReport'
import BlockDetail from './BlockDetail'
import Header from './Header'
import Diagnostics from './Diagnostics'
import Alchemy from './Alchemy'
import ChatBot from './ChatBot'
import Home from './Home'
import './SalesFunnel.css'
import { yandexMetricaReachGoal } from '../analytics/yandexMetrica'
import { openTelegramLink } from '../utils/telegram'
import { useLogEvent } from '../hooks/useLogEvent'
import { getSupabase } from '../utils/supabaseClient'

const funnelData = [
  {
    id: 'audience',
    name: 'Аудитория',
    image: '/images/1_трафик.png',
    color: '#4a90e2',
    description: 'Ваша целевая аудитория - люди, которые ищут решение своей проблемы',
    tech: [],
    width: 302 // 252 * 1.2
  },
  {
    id: 'landing',
    name: 'Лендинг',
    image: '/images/2_лендинг.png',
    color: '#5cb85c',
    description: 'Сайт для привлечения трафика и первичного контакта с аудиторией',
    tech: ['Сайт'],
    width: 269 // 224 * 1.2
  },
  {
    id: 'leadmagnet',
    name: 'Лидмагнит',
    image: '/images/3_Лидмагнит.png',
    color: '#f0ad4e',
    description: 'Бесплатное предложение для сбора контактов и начала взаимодействия',
    tech: ['PDF', 'MiniApp', 'Бот', 'Тест', 'Презентация'],
    width: 235 // 196 * 1.2
  },
  {
    id: 'tripwire',
    name: 'Трипваер',
    image: '/images/3-5.png',
    color: '#ffd700',
    description: 'Первая денежная транзакция. Автоматизация импульсивных покупок',
    tech: ['Эквайринг', 'Фискализация', 'Webhooks'],
    width: 185 // ~154 * 1.2
  },
  {
    id: 'autofunnel',
    name: 'Автоворонки прогрева',
    image: '/images/4_Прогрев.png',
    color: '#d9534f',
    description: 'Автоматизированная система прогрева лидов перед продажей',
    tech: ['Бот', 'Канал'],
    width: 202 // 168 * 1.2
  },
  {
    id: 'product',
    name: 'Продукт',
    image: '/images/5_Курс.png',
    color: '#5bc0de',
    description: 'Основной продукт - обучающий курс или услуга',
    tech: ['Бот', 'MiniApp', 'GetCourse'],
    width: 168 // 140 * 1.2
  },
  {
    id: 'money',
    name: 'Деньги',
    image: '/images/6_оплата.png',
    color: '#9b59b6',
    description: 'Доход, который получает автор продукта',
    tech: [],
    width: 151 // 126 * 1.2
  }
]

function SalesFunnel() {
  const { logCTAClick, logContentView, logEvent } = useLogEvent()
  const [selectedBlock, setSelectedBlock] = useState(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [showPortfolio, setShowPortfolio] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showPersonReport, setShowPersonReport] = useState(false)
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  const [showAlchemy, setShowAlchemy] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showFunnelDiagram, setShowFunnelDiagram] = useState(false) // true = показываем воронку, false = главная (пустая)
  const [userList, setUserList] = useState([])
  const [userListLoading, setUserListLoading] = useState(false)

  // Fetch user list with segments (LEFT JOIN users + user_segments)
  useEffect(() => {
    if (!showFunnelDiagram) return
    let cancelled = false
    const fetchUserList = async () => {
      const supabase = await getSupabase()
      if (!supabase) return
      setUserListLoading(true)
      try {
        const { data, error } = await supabase
          .from('users')
          .select('user_id, username, first_name, user_segments(*)')
        if (cancelled) return
        if (error) {
          console.warn('User list fetch error:', error.message)
          setUserList([])
          return
        }
        console.log('Fetched users data:', data)
        const rows = (data || []).map((row) => {
          const seg = row.user_segments?.[0]
          return {
            user_id: row.user_id,
            username: row.username ?? null,
            first_name: row.first_name ?? null,
            segment_motivation: seg?.segment_motivation ?? null,
            segment_temperature: seg?.segment_temperature ?? null,
            segment_hunt_level: seg?.segment_hunt_level != null ? Math.min(4, Math.max(0, Number(seg.segment_hunt_level))) : null
          }
        })
        setUserList(rows)
      } finally {
        if (!cancelled) setUserListLoading(false)
      }
    }
    fetchUserList()
    return () => { cancelled = true }
  }, [showFunnelDiagram])

  // Обработка hash в URL для прямой ссылки на профиль
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash
      if (hash === '#profile') {
        setShowProfile(true)
        setShowPersonReport(false)
        setShowDiagnostics(false)
        setShowAlchemy(false)
      } else if (hash === '#personreport') {
        setShowPersonReport(true)
        setShowProfile(false)
        setShowDiagnostics(false)
        setShowAlchemy(false)
      } else if (hash === '#diagnostics') {
        setShowDiagnostics(true)
        setShowProfile(false)
        setShowPersonReport(false)
        setShowAlchemy(false)
      } else if (hash === '#alchemy') {
        setShowAlchemy(true)
        setShowProfile(false)
        setShowPersonReport(false)
        setShowDiagnostics(false)
      }
    }

    // Обработка при монтировании
    handleHashChange()

    // Слушатель изменений hash
    window.addEventListener('hashchange', handleHashChange)

    // Очистка при размонтировании
    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])

  // Обновление hash при изменении состояния
  useEffect(() => {
    if (showProfile) {
      window.location.hash = 'profile'
    } else if (showPersonReport) {
      window.location.hash = 'personreport'
    } else if (showDiagnostics) {
      window.location.hash = 'diagnostics'
    } else if (showAlchemy) {
      window.location.hash = 'alchemy'
    } else if (!selectedBlock) {
      window.location.hash = ''
    }
  }, [showProfile, showPersonReport, showDiagnostics, showAlchemy, selectedBlock])


  // Current "route" path for universal page tracking (no react-router; derived from state)
  const currentPath = showAlchemy
    ? '/alchemy'
    : showDiagnostics
      ? '/diagnostics'
      : showPersonReport
        ? '/report'
        : showProfile
          ? '/profile'
          : selectedBlock
            ? `/block/${selectedBlock.id}`
            : !showFunnelDiagram
              ? '/home'
              : '/funnel_diagram'

  // Universal page tracking: log every view as visit/page_view so reports show all routes
  useEffect(() => {
    if (!currentPath) return
    console.log('📍 Tracking page view:', currentPath)
    logEvent('visit', 'page_view', { page: currentPath })
  }, [currentPath, logEvent])

  // Логируем просмотр экрана «Диаграмма воронки», когда пользователь на этой странице
  useEffect(() => {
    if (showFunnelDiagram && !selectedBlock && !showProfile && !showPersonReport && !showDiagnostics && !showAlchemy) {
      logContentView('page', 'funnel_diagram', { content_title: 'Диаграмма воронки', page: '/funnel_diagram' })
    }
  }, [showFunnelDiagram, selectedBlock, showProfile, showPersonReport, showDiagnostics, showAlchemy, logContentView])

  const handleBlockClick = async (block) => {
    if (isAnimating) return

    yandexMetricaReachGoal(null, 'funnel_block_open', { blockId: block?.id })

    // Логируем клик по CTA (элемент воронки)
    await logCTAClick('funnel_block_click', {
      ctaText: block?.name,
      ctaLocation: 'sales_funnel',
      previousStep: 'viewing_funnel',
      page: currentPath
    })

    setIsAnimating(true)
    setSelectedBlock(block)

    setTimeout(() => {
      setIsAnimating(false)
    }, 300)
  }

  const handleCloseBlockDetail = () => {
    yandexMetricaReachGoal(null, 'funnel_block_close', { blockId: selectedBlock?.id })
    setIsAnimating(true)
    setTimeout(() => {
      setSelectedBlock(null)
      setIsAnimating(false)
    }, 200)
  }

  const handleAuthorClick = () => {
    yandexMetricaReachGoal(null, 'open_portfolio')
    setShowPortfolio(true)
  }

  const handleConsultation = () => {
    yandexMetricaReachGoal(null, 'open_diagnostics')
    setShowDiagnostics(true)
  }

  const handleStageConsultation = () => {
    // Stage CTAs ("Получить бесплатную консультацию") should open Telegram dialog.
    const url = 'https://t.me/ilyaborm'
    // IMPORTANT: open synchronously on click (user gesture).
    const opened = openTelegramLink(url)
    // Then send analytics without blocking navigation.
    yandexMetricaReachGoal(null, 'contact_telegram_click', { placement: 'funnel_stage_cta', url, opened })
  }

  const handleAlchemyClick = () => {
    yandexMetricaReachGoal(null, 'open_alchemy')
    setShowAlchemy(true)
  }

  const handleChatClick = () => {
    yandexMetricaReachGoal(null, 'open_chat')
    setShowChat(true)
  }

  const handleAvatarClick = () => {
    yandexMetricaReachGoal(null, 'open_profile')
    // Open Profile from anywhere (close other sections first)
    if (showDiagnostics) {
      setShowDiagnostics(false)
    }
    if (showAlchemy) {
      setShowAlchemy(false)
    }
    setShowProfile(true)
  }

  const handleNextBlock = (blockId) => {
    yandexMetricaReachGoal(null, 'funnel_next_block', { blockId })
    const nextBlock = funnelData.find(b => b.id === blockId)
    if (nextBlock) {
      // Функция для скролла к верху (работает и на мобильных)
      const scrollToTop = () => {
        const container = document.querySelector('.block-detail-container')
        if (container) {
          // Для мобильных используем scrollTop напрямую
          container.scrollTop = 0
          container.scrollTo({ top: 0, behavior: 'instant' })
          // Также пробуем scrollIntoView для надежности
          const firstElement = container.firstElementChild
          if (firstElement) {
            firstElement.scrollIntoView({ behavior: 'instant', block: 'start' })
          }
        }
        window.scrollTo({ top: 0, behavior: 'instant' })
        window.scrollTo(0, 0)
        document.documentElement.scrollTop = 0
        document.body.scrollTop = 0
        // Для мобильных Safari
        if (window.pageYOffset !== undefined) {
          window.pageYOffset = 0
        }
      }
      
      // Используем requestAnimationFrame для гарантии, что DOM обновлен
      requestAnimationFrame(() => {
        // Сначала скроллим к верху страницы
        scrollToTop()
        setIsAnimating(true)
        setSelectedBlock(nextBlock)
        
        setTimeout(() => {
          setIsAnimating(false)
          // Дополнительный скролл к верху после анимации
          scrollToTop()
          const container = document.querySelector('.block-detail-container')
          if (container) {
            container.scrollTop = 0
            container.scrollTo({ top: 0, behavior: 'smooth' })
          }
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }, 300)
      })
    }
  }

  if (showAlchemy) {
    return (
      <Alchemy 
        onBack={() => {
          setShowAlchemy(false)
          setShowFunnelDiagram(true) // Возврат к диаграмме воронки
          window.location.hash = ''
        }} 
        onAvatarClick={handleAvatarClick}
        onDiagnostics={() => {
          setShowAlchemy(false)
          setShowDiagnostics(true)
        }}
        onChatClick={handleChatClick}
        onHomeClick={() => {
          setShowAlchemy(false)
          setShowFunnelDiagram(false) // Возврат на пустую главную
          setSelectedBlock(null) // Сброс выбранного блока
          window.location.hash = ''
        }}
      />
    )
  }

  if (showDiagnostics) {
    return (
      <Diagnostics 
        onBack={() => {
          setShowDiagnostics(false)
          setShowFunnelDiagram(true) // Возврат к диаграмме воронки
          window.location.hash = ''
        }} 
        onAvatarClick={handleAvatarClick}
        onAlchemyClick={handleAlchemyClick}
        onChatClick={handleChatClick}
        onHomeClick={() => {
          setShowDiagnostics(false)
          setShowFunnelDiagram(false) // Возврат на пустую главную
          setSelectedBlock(null) // Сброс выбранного блока
          window.location.hash = ''
        }}
      />
    )
  }

  if (showPersonReport) {
    return (
      <PersonReport
        onBack={() => {
          setShowPersonReport(false)
          setShowFunnelDiagram(true) // Возврат к диаграмме воронки
          window.location.hash = ''
        }}
        onAvatarClick={() => {
          setShowPersonReport(false)
          window.location.hash = ''
        }}
        onHomeClick={() => {
          setShowPersonReport(false)
          setShowFunnelDiagram(false) // Возврат на пустую главную
          setSelectedBlock(null) // Сброс выбранного блока
          window.location.hash = ''
        }}
      />
    )
  }

  if (showProfile) {
    return (
      <Profile
        onBack={() => {
          setShowProfile(false)
          setShowFunnelDiagram(true) // Возврат к диаграмме воронки
          window.location.hash = ''
        }}
        onAvatarClick={() => {
          setShowProfile(false)
          window.location.hash = ''
        }}
        onDiagnostics={() => {
          setShowProfile(false)
          setShowDiagnostics(true)
        }}
        onAlchemyClick={handleAlchemyClick}
        onChatClick={handleChatClick}
        onHomeClick={() => {
          setShowProfile(false)
          setShowFunnelDiagram(false) // Возврат на пустую главную
          setSelectedBlock(null) // Сброс выбранного блока
          window.location.hash = ''
        }}
      />
    )
  }

  if (selectedBlock) {
    return (
      <BlockDetail 
        block={selectedBlock}
        onBack={handleCloseBlockDetail}
        onConsultation={handleStageConsultation}
        onDiagnostics={handleConsultation}
        onAvatarClick={handleAvatarClick}
        onAlchemyClick={handleAlchemyClick}
        onChatClick={handleChatClick}
        onHomeClick={() => {
          setSelectedBlock(null)
          setShowFunnelDiagram(false) // Возврат на пустую главную
        }}
        onNextBlock={
          selectedBlock.id === 'audience' 
            ? () => handleNextBlock('landing') 
            : selectedBlock.id === 'landing'
            ? () => handleNextBlock('leadmagnet')
            : selectedBlock.id === 'leadmagnet'
            ? () => handleNextBlock('tripwire')
            : selectedBlock.id === 'tripwire'
            ? () => handleNextBlock('autofunnel')
            : selectedBlock.id === 'autofunnel'
            ? () => handleNextBlock('product')
            : selectedBlock.id === 'product'
            ? () => handleNextBlock('money')
            : undefined
        }
      />
    )
  }

  const handleHomeClick = () => {
    yandexMetricaReachGoal(null, 'home_click')
    // Возвращаемся на главную (пустую) страницу
    setShowFunnelDiagram(false)
    setSelectedBlock(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handlePortalClick = () => {
    yandexMetricaReachGoal(null, 'funnel_diagram_open')
    // Открываем страницу с диаграммой воронки
    setShowFunnelDiagram(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Show Home page when showFunnelDiagram is false
  if (!showFunnelDiagram) {
    return (
      <Home 
        onDiagnostics={handleConsultation}
        onTechnologies={handlePortalClick}
        onAlchemy={handleAlchemyClick}
        onPortal={handlePortalClick}
        onAvatarClick={handleAvatarClick}
      />
    )
  }

  return (
    <div className="sales-funnel-container">
      <Header 
        onAvatarClick={handleAvatarClick}
        onConsultation={handleConsultation}
        onAlchemyClick={handleAlchemyClick}
        onHomeClick={handleHomeClick}
        onBack={handlePortalClick}
        activeMenuId="portal"
      />

      {/* Диаграмма воронки */}
      <div className="funnel-wrapper">
          <div className="funnel-blocks" id="funnel-blocks">
          {/* Основные блоки: Аудитория, Лендинг, Лидмагнит, Трипваер, Автоворонки, Продукт */}
          {funnelData.slice(0, 6).map((block, index) => (
            <React.Fragment key={block.id}>
              {/* Блок воронки */}
              <div
                className={`funnel-block ${block.id === 'product' ? 'product-block' : ''} ${selectedBlock?.id === block.id ? 'selected' : ''} ${isAnimating && selectedBlock?.id === block.id ? 'animating' : ''}`}
                style={{
                  '--block-color': block.color,
                  '--block-width': `${block.width}px`
                }}
                onClick={() => handleBlockClick(block)}
              >
                <img src={block.image} alt={block.name} className="block-image" />
                <span className="block-name">{block.name}</span>
              </div>
              
              {/* Стрелка (вертикальная) */}
              {index < 5 && (
                <div className={`funnel-arrow ${block.id === 'autofunnel' ? 'product-arrow' : ''}`}>
                  <svg width="20" height="20" viewBox="0 0 20 20" className="arrow-svg">
                    <line 
                      x1="10" 
                      y1="0" 
                      x2="10" 
                      y2="15" 
                      stroke="#ffffff" 
                      strokeWidth="2"
                      strokeOpacity="0.8"
                      markerEnd={`url(#arrowhead-vertical-${index})`}
                    />
                    <defs>
                      <marker 
                        id={`arrowhead-vertical-${index}`}
                        markerWidth="10" 
                        markerHeight="10" 
                        refX="10" 
                        refY="5" 
                        orient="auto"
                      >
                        <polygon points="0 0, 10 5, 0 10" fill="#ffffff" fillOpacity="0.8" />
                      </marker>
                    </defs>
                  </svg>
                </div>
              )}
            </React.Fragment>
          ))}
          
          {/* Стрелка перед блоком "Деньги" */}
          <div className="funnel-arrow money-arrow">
            <svg width="20" height="20" viewBox="0 0 20 20" className="arrow-svg">
              <line 
                x1="10" 
                y1="0" 
                x2="10" 
                y2="15" 
                stroke="#ffffff" 
                strokeWidth="2"
                strokeOpacity="0.8"
                markerEnd="url(#arrowhead-vertical-money)"
              />
              <defs>
                <marker 
                  id="arrowhead-vertical-money"
                  markerWidth="10" 
                  markerHeight="10" 
                  refX="10" 
                  refY="5" 
                  orient="auto"
                >
                  <polygon points="0 0, 10 5, 0 10" fill="#ffffff" fillOpacity="0.8" />
                </marker>
              </defs>
            </svg>
          </div>
          
          {/* Блок результата (Деньги) - под продуктом */}
          <div className="result-blocks-container">
            {funnelData.slice(6).map((block) => (
              <div
                key={block.id}
                className={`funnel-block result-block ${selectedBlock?.id === block.id ? 'selected' : ''} ${isAnimating && selectedBlock?.id === block.id ? 'animating' : ''}`}
                style={{
                  '--block-color': block.color,
                  '--block-width': `${block.width}px`
                }}
                onClick={() => handleBlockClick(block)}
              >
                <img src={block.image} alt={block.name} className="block-image" />
                <span className="block-name">{block.name}</span>
              </div>
            ))}
          </div>
          </div>
        </div>

      {/* User list with segments (Niche, Hunt Ladder, Status) */}
      {showFunnelDiagram && (
        <div className="funnel-user-list-section">
          <h3 className="funnel-user-list-title">Пользователи воронки</h3>
          {userListLoading ? (
            <div className="funnel-user-list-loading">
              <div className="loading-spinner" /> Загрузка...
            </div>
          ) : (
            <div className="funnel-user-list-wrapper">
              <table className="funnel-user-list-table" aria-label="Список пользователей с сегментами">
                <thead>
                  <tr>
                    <th>user_id</th>
                    <th>Пользователь</th>
                    <th>Ниша</th>
                    <th>Hunt Ladder</th>
                    <th>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {userList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="funnel-user-list-empty">Нет данных</td>
                    </tr>
                  ) : (
                    userList.map((u) => (
                      <tr key={u.user_id ?? 'unknown'}>
                        <td>{u.user_id ?? '—'}</td>
                        <td>{u.first_name ?? u.username ?? '—'}</td>
                        <td>{u.segment_motivation ?? '—'}</td>
                        <td>
                          <div className="hunt-ladder-cell">
                            <div className="hunt-ladder-bar" role="progressbar" aria-valuenow={u.segment_hunt_level ?? 0} aria-valuemin={0} aria-valuemax={4}>
                              <div className="hunt-ladder-fill" style={{ width: u.segment_hunt_level != null ? `${((u.segment_hunt_level + 1) / 5) * 100}%` : '0%' }} />
                            </div>
                            <span className="hunt-ladder-label">{u.segment_hunt_level != null ? `${u.segment_hunt_level}/4` : '—'}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`segment-status-badge segment-status--${(u.segment_temperature || '').toLowerCase().replace(/\s+/g, '-')}`}>
                            {u.segment_temperature === 'Hot' ? 'Hot' : u.segment_temperature === 'Warm' ? 'Warm' : u.segment_temperature === 'Needs Reanimation' ? '⚠️ Needs Reanimation' : u.segment_temperature === 'Ice' ? 'В процессе анализа' : u.segment_temperature ?? '—'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Портфолио модальное окно */}
      {showPortfolio && (
        <Portfolio 
          onClose={() => setShowPortfolio(false)}
          onConsultation={handleConsultation}
        />
      )}

      {/* Чат-бот */}
      {showChat && (
        <ChatBot onClose={() => setShowChat(false)} />
      )}
    </div>
  )
}

export default SalesFunnel

