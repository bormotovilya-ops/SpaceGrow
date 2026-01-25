import React, { useState, useEffect, useRef } from 'react'
import Header from './Header'
import ActivityTimeline from './ActivityTimeline'
import EngagementChart from './EngagementChart'
import './PersonReport.css'
import './Visualization.css'
import { yandexMetricaReachGoal } from '../analytics/yandexMetrica'
import { useLogEvent } from '../hooks/useLogEvent'
import { motion, AnimatePresence } from 'framer-motion'

function PersonReport({ onBack, onAvatarClick, onHomeClick }) {
  const { logPersonalPathView, getSessionInfo } = useLogEvent()
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedSections, setExpandedSections] = useState({
    userInfo: true,
    journey: true,
    segmentation: true,
    recommendations: true,
    visualization: true
  })
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const pageOpenTime = useRef(Date.now())

  const handleHeaderConsultation = () => {
    yandexMetricaReachGoal(null, 'open_diagnostics', { placement: 'header', page: 'person_report' })
  }

  const handleHeaderAvatarClick = () => {
    if (onAvatarClick) {
      onAvatarClick()
    } else {
      onBack()
    }
  }

  const handleHeaderHomeClick = () => {
    if (onHomeClick) onHomeClick()
  }

  const toggleSection = (sectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }))
  }

  // Fetch personal report data
  useEffect(() => {
    const fetchPersonalReport = async () => {
      try {
        setLoading(true)
        const sessionInfo = getSessionInfo()
        const tgUserId = sessionInfo.tgUserId
        const cookieId = sessionInfo.cookieId

        // Try to get data by telegram user ID first, then by cookie ID
        let response
        if (tgUserId) {
          // Use relative path so fetch works in deployed environment (no hardcoded localhost)
          response = await fetch(`/api/user/${tgUserId}/personal-report`)
        } else if (cookieId) {
          // relative path for cookie-based report as well
          response = await fetch(`/api/user/by-cookie/${cookieId}/personal-report`)
        } else {
          throw new Error('Не удалось определить пользователя')
        }

        if (!response.ok) {
          throw new Error('Не удалось загрузить данные отчета')
        }

        const data = await response.json()
        setReportData(data)
        setError(null)
      } catch (err) {
        console.error('Error fetching personal report:', err)
        setError(err.message)
        setReportData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchPersonalReport()
  }, [getSessionInfo])

  // Log page open
  useEffect(() => {
    const logPageOpen = async () => {
      await logPersonalPathView(pageOpenTime.current, 0, false)
    }
    logPageOpen()
  }, [logPersonalPathView])

  // Handle PDF download
  const handleDownloadPDF = async () => {
    if (!reportData) return

    try {
      setGeneratingPDF(true)

      const sessionInfo = getSessionInfo()
      const tgUserId = sessionInfo.tgUserId

      // Если нет Telegram ID, предлагаем перейти в бот
      if (!tgUserId) {
        const goToBot = confirm(
          '📱 Для получения PDF отчета необходимо перейти в наш Telegram бот.\n\n' +
          'Нажмите "OK" чтобы перейти в бот, где PDF будет отправлен автоматически.\n\n' +
          'Ссылка: https://t.me/SpaceGrowthBot'
        )

        if (goToBot) {
          window.open('https://t.me/SpaceGrowthBot', '_blank')
        }
        return
      }

      const response = await fetch('/api/generate-personal-report-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportData,
          telegramUserId: tgUserId
        })
      })

      if (!response.ok) {
        throw new Error('Ошибка генерации PDF')
      }

      const data = await response.json()

      // Log successful download
      await logPersonalPathView(pageOpenTime.current, Date.now() - pageOpenTime.current, true)

      // Show success message (PDF sent to Telegram)
      alert('✅ PDF отчёт успешно отправлен вам в Telegram!')

    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('❌ Ошибка при генерации PDF. Попробуйте позже.')
    } finally {
      setGeneratingPDF(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Не указано'
    try {
      return new Date(dateString).toLocaleDateString('ru-RU')
    } catch {
      return dateString
    }
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '0 сек'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) return `${hours}ч ${minutes}м ${secs}с`
    if (minutes > 0) return `${minutes}м ${secs}с`
    return `${secs}с`
  }

  const getSegmentColor = (segment) => {
    const colors = {
      'newcomer': '#4a90e2',
      'engaged': '#f0ad4e',
      'converter': '#5cb85c',
      'loyal': '#9b59b6'
    }
    return colors[segment] || '#95a5a6'
  }

  const getEngagementColor = (level) => {
    const colors = {
      'low': '#e74c3c',
      'medium': '#f39c12',
      'high': '#27ae60'
    }
    return colors[level] || '#95a5a6'
  }

  if (loading) {
    return (
      <div className="person-report-container">
        <Header
          onAvatarClick={handleHeaderAvatarClick}
          onConsultation={handleHeaderConsultation}
          onBack={onBack}
          onHomeClick={handleHeaderHomeClick}
          activeMenuId="person_report"
        />
        <div className="person-report-loading">
          <div className="loading-spinner"></div>
          <p>Загружаем ваш персональный отчёт...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="person-report-container">
        <Header
          onAvatarClick={handleHeaderAvatarClick}
          onConsultation={handleHeaderConsultation}
          onBack={onBack}
          onHomeClick={handleHeaderHomeClick}
          activeMenuId="person_report"
        />
        <div className="person-report-error">
          <h2>❌ Ошибка загрузки отчёта</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="retry-button">
            Попробовать снова
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="person-report-container">
      <Header
        onAvatarClick={handleHeaderAvatarClick}
        onConsultation={handleHeaderConsultation}
        onBack={onBack}
        onHomeClick={handleHeaderHomeClick}
        activeMenuId="person_report"
      />

      <div className="person-report-content">
        <div className="person-report-header">
          <h1>📊 Ваш персональный отчёт</h1>
          <p className="report-subtitle">Полная аналитика вашего пути в MiniApp</p>
        </div>

        {/* User Information Section */}
        <motion.section
          className={`report-section ${expandedSections.userInfo ? 'expanded' : ''}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="section-header" onClick={() => toggleSection('userInfo')}>
            <h2>👤 Информация о пользователе</h2>
            <span className={`toggle-icon ${expandedSections.userInfo ? 'expanded' : ''}`}>▼</span>
          </div>
          <AnimatePresence>
            {expandedSections.userInfo && (
              <motion.div
                className="section-content"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="user-info-grid">
                  <div className="info-item">
                    <label>Telegram ID:</label>
                    <span>{reportData?.user?.tg_user_id || 'Не указан'}</span>
                  </div>
                  <div className="info-item">
                    <label>Cookie ID:</label>
                    <span>{reportData?.user?.cookie_id || 'Не указан'}</span>
                  </div>
                  <div className="info-item">
                    <label>Источник трафика:</label>
                    <span>{reportData?.user?.traffic_source || 'Не определен'}</span>
                  </div>
                  <div className="info-item">
                    <label>UTM параметры:</label>
                    <span>{reportData?.user?.utm_params ? JSON.stringify(reportData.user.utm_params) : 'Отсутствуют'}</span>
                  </div>
                  <div className="info-item">
                    <label>Referrer:</label>
                    <span>{reportData?.user?.referrer || 'Прямой заход'}</span>
                  </div>
                  <div className="info-item">
                    <label>Первое посещение:</label>
                    <span>{formatDate(reportData?.user?.first_visit_date)}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        {/* Personal Journey Section */}
        <motion.section
          className={`report-section ${expandedSections.journey ? 'expanded' : ''}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="section-header" onClick={() => toggleSection('journey')}>
            <h2>🗺️ Персональный путь</h2>
            <span className={`toggle-icon ${expandedSections.journey ? 'expanded' : ''}`}>▼</span>
          </div>
          <AnimatePresence>
            {expandedSections.journey && (
              <motion.div
                className="section-content"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="journey-timeline">
                  {reportData?.journey?.miniapp_opens?.map((open, index) => (
                    <div key={index} className="timeline-item">
                      <div className="timeline-marker"></div>
                      <div className="timeline-content">
                        <h4>📱 Открытие MiniApp</h4>
                        <p>Страница: {open.page || 'Главная'}</p>
                        <p>Устройство: {open.device || 'Не определено'}</p>
                        <p>Время: {formatDate(open.timestamp)}</p>
                      </div>
                    </div>
                  ))}

                  {reportData?.journey?.content_views?.map((view, index) => (
                    <div key={index} className="timeline-item">
                      <div className="timeline-marker"></div>
                      <div className="timeline-content">
                        <h4>👁️ Просмотр контента</h4>
                        <p>Раздел: {view.section}</p>
                        <p>Время просмотра: {formatDuration(view.time_spent)}</p>
                        <p>Прокрутка: {view.scroll_depth}%</p>
                      </div>
                    </div>
                  ))}

                  {reportData?.journey?.ai_interactions?.map((interaction, index) => (
                    <div key={index} className="timeline-item">
                      <div className="timeline-marker"></div>
                      <div className="timeline-content">
                        <h4>🤖 AI взаимодействие</h4>
                        <p>Сообщений: {interaction.messages_count}</p>
                        <p>Темы: {interaction.topics?.join(', ') || 'Общие'}</p>
                        <p>Длительность: {formatDuration(interaction.duration)}</p>
                      </div>
                    </div>
                  ))}

                  {reportData?.journey?.diagnostics?.map((diagnostic, index) => (
                    <div key={index} className="timeline-item">
                      <div className="timeline-marker"></div>
                      <div className="timeline-content">
                        <h4>🧪 Диагностика</h4>
                        <p>Прогресс: {diagnostic.progress}%</p>
                        <p>Результаты: {diagnostic.results || 'В процессе'}</p>
                        <p>Время: {formatDuration(diagnostic.time_spent)}</p>
                      </div>
                    </div>
                  ))}

                  {reportData?.journey?.game_actions?.map((action, index) => (
                    <div key={index} className="timeline-item">
                      <div className="timeline-marker"></div>
                      <div className="timeline-content">
                        <h4>🎮 Игровые действия</h4>
                        <p>Тип игры: {action.game_type}</p>
                        <p>Достижения: {action.achievements?.join(', ') || 'Нет'}</p>
                        <p>Очки: {action.scores || 0}</p>
                      </div>
                    </div>
                  ))}

                  {reportData?.journey?.cta_clicks?.map((click, index) => (
                    <div key={index} className="timeline-item">
                      <div className="timeline-marker"></div>
                      <div className="timeline-content">
                        <h4>🎯 CTA клик</h4>
                        <p>Расположение: {click.location}</p>
                        <p>Предыдущий шаг: {click.previous_step}</p>
                        <p>Время на шаге: {formatDuration(click.duration)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        {/* Segmentation Section */}
        <motion.section
          className={`report-section ${expandedSections.segmentation ? 'expanded' : ''}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="section-header" onClick={() => toggleSection('segmentation')}>
            <h2>🎯 Сегментация</h2>
            <span className={`toggle-icon ${expandedSections.segmentation ? 'expanded' : ''}`}>▼</span>
          </div>
          <AnimatePresence>
            {expandedSections.segmentation && (
              <motion.div
                className="section-content"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="segmentation-cards">
                  <div className="segmentation-card">
                    <div className="segment-badge" style={{ backgroundColor: getSegmentColor(reportData?.segmentation?.user_segment) }}>
                      {reportData?.segmentation?.user_segment || 'Не определен'}
                    </div>
                    <h3>Сегмент пользователя</h3>
                    <p>Основан на ваших действиях и прогрессе в воронке</p>
                  </div>

                  <div className="segmentation-card">
                    <div className="engagement-badge" style={{ backgroundColor: getEngagementColor(reportData?.segmentation?.engagement_level) }}>
                      {reportData?.segmentation?.engagement_level || 'Не определен'}
                    </div>
                    <h3>Уровень вовлеченности</h3>
                    <p>Отражает вашу активность в приложении</p>
                  </div>
                </div>

                <div className="segmentation-basis">
                  <h4>Основание для сегментации:</h4>
                  <ul>
                    {reportData?.segmentation?.basis?.map((item, index) => (
                      <li key={index}>{item}</li>
                    )) || <li>Данные в процессе анализа</li>}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        {/* Recommendations Section */}
        <motion.section
          className={`report-section ${expandedSections.recommendations ? 'expanded' : ''}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="section-header" onClick={() => toggleSection('recommendations')}>
            <h2>💡 Персональные рекомендации</h2>
            <span className={`toggle-icon ${expandedSections.recommendations ? 'expanded' : ''}`}>▼</span>
          </div>
          <AnimatePresence>
            {expandedSections.recommendations && (
              <motion.div
                className="section-content"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="recommendations-grid">
                  <div className="recommendation-card">
                    <h4>🎯 Следующие шаги</h4>
                    <ul>
                      {reportData?.recommendations?.next_steps?.map((step, index) => (
                        <li key={index}>{step}</li>
                      )) || <li>Рекомендации формируются...</li>}
                    </ul>
                  </div>

                  <div className="recommendation-card">
                    <h4>🚀 Автоматические действия</h4>
                    <ul>
                      {reportData?.recommendations?.automatic_actions?.map((action, index) => (
                        <li key={index}>{action}</li>
                      )) || <li>Автоматизация настраивается...</li>}
                    </ul>
                  </div>

                  <div className="recommendation-card">
                    <h4>📱 Контент для взаимодействия</h4>
                    <ul>
                      {reportData?.recommendations?.content_suggestions?.map((suggestion, index) => (
                        <li key={index}>{suggestion}</li>
                      )) || <li>Подбираем персональный контент...</li>}
                    </ul>
                  </div>

                  <div className="recommendation-card">
                    <h4>🎪 CTA для кликов</h4>
                    <ul>
                      {reportData?.recommendations?.cta_suggestions?.map((cta, index) => (
                        <li key={index}>{cta}</li>
                      )) || <li>Оптимизируем призывы к действию...</li>}
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        {/* Visualization Section */}
        <motion.section
          className={`report-section ${expandedSections.visualization ? 'expanded' : ''}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="section-header" onClick={() => toggleSection('visualization')}>
            <h2>📈 Визуализация пути</h2>
            <span className={`toggle-icon ${expandedSections.visualization ? 'expanded' : ''}`}>▼</span>
          </div>
          <AnimatePresence>
            {expandedSections.visualization && (
              <motion.div
                className="section-content"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="visualization-container">
                  <ActivityTimeline
                    reportData={reportData}
                    isExpanded={expandedSections.visualization}
                  />

                  <EngagementChart
                    reportData={reportData}
                    isExpanded={expandedSections.visualization}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>
      </div>
    </div>
  )
}

export default PersonReport