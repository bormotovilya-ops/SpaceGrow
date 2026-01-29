import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, Cell, ReferenceLine } from 'recharts'
import { useLogEvent } from '../hooks/useLogEvent'

const ActivityTimeline = ({ reportData, isExpanded }) => {
  const { logEvent } = useLogEvent()
  const [hoveredEvent, setHoveredEvent] = useState(null)

  // Combine all events into a single timeline
  const timelineEvents = useMemo(() => {
    const events = []

    // Sessions - background bars
    if (reportData?.journey?.miniapp_opens) {
      reportData.journey.miniapp_opens.forEach((session, index) => {
        events.push({
          id: `session-${index}`,
          type: 'session',
          timestamp: new Date(session.timestamp).getTime(),
          data: session,
          displayTime: new Date(session.timestamp),
          y: 0, // Base line for sessions
          duration: session.duration || 0
        })
      })
    }

    // Content views
    if (reportData?.journey?.content_views) {
      reportData.journey.content_views.forEach((view, index) => {
        events.push({
          id: `content-${index}`,
          type: 'content_view',
          timestamp: new Date(view.timestamp || Date.now()).getTime(),
          data: view,
          displayTime: new Date(view.timestamp || Date.now()),
          y: 1,
          duration: view.time_spent || 0
        })
      })
    }

    // AI interactions (exclude expert chats)
    if (reportData?.journey?.ai_interactions) {
      reportData.journey.ai_interactions.forEach((interaction, index) => {
        if (!interaction.is_expert_chat) {
          events.push({
            id: `ai-${index}`,
            type: 'ai_interaction',
            timestamp: new Date(interaction.timestamp || Date.now()).getTime(),
            data: interaction,
            displayTime: new Date(interaction.timestamp || Date.now()),
            y: 2,
            duration: interaction.duration || 0
          })
        }
      })
    }

    // Game actions
    if (reportData?.journey?.game_actions) {
      reportData.journey.game_actions.forEach((action, index) => {
        events.push({
          id: `game-${index}`,
          type: 'game_action',
          timestamp: new Date(action.timestamp || Date.now()).getTime(),
          data: action,
          displayTime: new Date(action.timestamp || Date.now()),
          y: 3,
          duration: action.duration || 0
        })
      })
    }

    // CTA clicks
    if (reportData?.journey?.cta_clicks) {
      reportData.journey.cta_clicks.forEach((click, index) => {
        events.push({
          id: `cta-${index}`,
          type: 'cta_click',
          timestamp: new Date(click.timestamp || Date.now()).getTime(),
          data: click,
          displayTime: new Date(click.timestamp || Date.now()),
          y: 4,
          duration: click.duration || 0
        })
      })
    }

    // Sort by timestamp
    return events.sort((a, b) => a.timestamp - b.timestamp)
  }, [reportData])

  // Get event icon and color based on type
  const getEventStyle = (eventType) => {
    const styles = {
      session: { icon: '📱', color: '#4a90e2', bgColor: '#e8f4fd' },
      content_view: { icon: '👁️', color: '#f0ad4e', bgColor: '#fdf5e8' },
      ai_interaction: { icon: '🤖', color: '#5cb85c', bgColor: '#f0f9f0' },
      game_action: { icon: '🎮', color: '#9b59b6', bgColor: '#f8f0fb' },
      cta_click: { icon: '🎯', color: '#e74c3c', bgColor: '#fde8e8' }
    }
    return styles[eventType] || { icon: '📍', color: '#95a5a6', bgColor: '#f8f9fa' }
  }

  // Custom tooltip for timeline events
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload[0]) {
      const event = payload[0].payload
      const style = getEventStyle(event.type)

      const formatTooltipContent = (event) => {
        switch (event.type) {
          case 'session':
            return (
              <div className="timeline-tooltip-content">
                <div className="tooltip-header">
                  <span className="tooltip-icon">{style.icon}</span>
                  <span className="tooltip-title">Открытие MiniApp</span>
                </div>
                <div className="tooltip-details">
                  <div>Страница: {event.data.page || 'Главная'}</div>
                  <div>Устройство: {event.data.device || 'Не определено'}</div>
                  <div>Время: {event.displayTime.toLocaleString('ru-RU')}</div>
                  {event.duration > 0 && <div>Длительность: {Math.round(event.duration / 1000)} сек</div>}
                </div>
              </div>
            )
          case 'content_view':
            return (
              <div className="timeline-tooltip-content">
                <div className="tooltip-header">
                  <span className="tooltip-icon">{style.icon}</span>
                  <span className="tooltip-title">Просмотр контента</span>
                </div>
                <div className="tooltip-details">
                  <div>Раздел: {event.data.section}</div>
                  <div>Время просмотра: {Math.round(event.duration)} сек</div>
                  <div>Прокрутка: {event.data.scroll_depth}%</div>
                  <div>Время: {event.displayTime.toLocaleString('ru-RU')}</div>
                </div>
              </div>
            )
          case 'ai_interaction':
            return (
              <div className="timeline-tooltip-content">
                <div className="tooltip-header">
                  <span className="tooltip-icon">{style.icon}</span>
                  <span className="tooltip-title">AI взаимодействие</span>
                </div>
                <div className="tooltip-details">
                  <div>Сообщений: {event.data.messages_count}</div>
                  <div>Темы: {event.data.topics?.join(', ') || 'Общие'}</div>
                  <div>Длительность: {Math.round(event.duration)} сек</div>
                  <div>Время: {event.displayTime.toLocaleString('ru-RU')}</div>
                </div>
              </div>
            )
          case 'game_action':
            return (
              <div className="timeline-tooltip-content">
                <div className="tooltip-header">
                  <span className="tooltip-icon">{style.icon}</span>
                  <span className="tooltip-title">Игровые действия</span>
                </div>
                <div className="tooltip-details">
                  <div>Тип игры: {event.data.game_type}</div>
                  <div>Достижения: {(event.data.achievement || event.data.achievements)?.join?.(', ') || 'Нет'}</div>
                  <div>Очки: {event.data.score ?? event.data.scores ?? 0}</div>
                  <div>Время: {event.displayTime.toLocaleString('ru-RU')}</div>
                </div>
              </div>
            )
          case 'cta_click':
            return (
              <div className="timeline-tooltip-content">
                <div className="tooltip-header">
                  <span className="tooltip-icon">{style.icon}</span>
                  <span className="tooltip-title">CTA клик</span>
                </div>
                <div className="tooltip-details">
                  <div>Расположение: {event.data.cta_location || event.data.location}</div>
                  <div>Предыдущий шаг: {event.data.previous_step}</div>
                  <div>Время на шаге: {Math.round(event.data.step_duration ?? event.duration ?? 0)} сек</div>
                  <div>Время: {event.displayTime.toLocaleString('ru-RU')}</div>
                </div>
              </div>
            )
          default:
            return <div>Неизвестное событие</div>
        }
      }

      return (
        <div className="timeline-tooltip" style={{ backgroundColor: style.bgColor, borderColor: style.color }}>
          {formatTooltipContent(event)}
        </div>
      )
    }
    return null
  }

  // Handle hover for logging
  const handleMouseEnter = (event) => {
    setHoveredEvent(event)
    logEvent('timeline_hover', {
      event_id: event.id,
      event_type: event.type,
      timestamp: event.timestamp
    })
  }

  const handleMouseLeave = () => {
    setHoveredEvent(null)
  }

  if (!timelineEvents.length) {
    return (
      <div className="timeline-placeholder">
        <p>📊 Данные для timeline загружаются...</p>
        <p>Здесь будет отображена хронология вашей активности</p>
      </div>
    )
  }

  return (
    <motion.div
      className="activity-timeline"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="timeline-header">
        <h4>🕐 Хронология активности</h4>
        <div className="timeline-legend">
          <div className="legend-item">
            <span className="legend-icon">📱</span>
            <span>Сессии</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon">👁️</span>
            <span>Просмотры</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon">🤖</span>
            <span>AI чаты</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon">🎮</span>
            <span>Игры</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon">🎯</span>
            <span>CTA клики</span>
          </div>
        </div>
      </div>

      <div className="timeline-chart-container">
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart
            data={timelineEvents}
            margin={{ top: 20, right: 30, bottom: 20, left: 20 }}
          >
            <XAxis
              type="number"
              dataKey="timestamp"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(timestamp) => new Date(timestamp).toLocaleDateString('ru-RU')}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              type="number"
              domain={[-0.5, 4.5]}
              tick={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Render different event types */}
            {timelineEvents.map((event, index) => {
              const style = getEventStyle(event.type)
              return (
                <Scatter
                  key={event.id}
                  data={[event]}
                  fill={style.color}
                  shape={(props) => {
                    const { cx, cy } = props
                    return (
                      <g>
                        <circle
                          cx={cx}
                          cy={cy}
                          r={8}
                          fill={style.color}
                          stroke="white"
                          strokeWidth={2}
                          onMouseEnter={() => handleMouseEnter(event)}
                          onMouseLeave={handleMouseLeave}
                          style={{ cursor: 'pointer' }}
                        />
                        <text
                          x={cx}
                          y={cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize="10"
                          fill="white"
                          fontWeight="bold"
                          pointerEvents="none"
                        >
                          {style.icon}
                        </text>
                      </g>
                    )
                  }}
                />
              )
            })}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}

export default ActivityTimeline