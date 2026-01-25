import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Area, AreaChart } from 'recharts'
import { useLogEvent } from '../hooks/useLogEvent'

const EngagementChart = ({ reportData, isExpanded }) => {
  const { logEvent } = useLogEvent()
  const [chartType, setChartType] = useState('line') // 'line' or 'area'

  // Aggregate engagement data by day
  const engagementData = useMemo(() => {
    const dailyData = {}

    // Helper function to get day key
    const getDayKey = (timestamp) => {
      const date = new Date(timestamp)
      return date.toISOString().split('T')[0] // YYYY-MM-DD format
    }

    // Process content views
    if (reportData?.journey?.content_views) {
      reportData.journey.content_views.forEach(view => {
        const day = getDayKey(view.timestamp || Date.now())
        if (!dailyData[day]) {
          dailyData[day] = {
            date: day,
            timeSpent: 0,
            scrollDepth: 0,
            aiInteractions: 0,
            aiDuration: 0,
            gameActions: 0,
            gameScores: 0,
            ctaClicks: 0,
            viewCount: 0
          }
        }
        dailyData[day].timeSpent += view.time_spent || 0
        dailyData[day].scrollDepth = Math.max(dailyData[day].scrollDepth, view.scroll_depth || 0)
        dailyData[day].viewCount += 1
      })
    }

    // Process AI interactions (exclude expert chats)
    if (reportData?.journey?.ai_interactions) {
      reportData.journey.ai_interactions.forEach(interaction => {
        if (!interaction.is_expert_chat) {
          const day = getDayKey(interaction.timestamp || Date.now())
          if (!dailyData[day]) {
            dailyData[day] = {
              date: day,
              timeSpent: 0,
              scrollDepth: 0,
              aiInteractions: 0,
              aiDuration: 0,
              gameActions: 0,
              gameScores: 0,
              ctaClicks: 0,
              viewCount: 0
            }
          }
          dailyData[day].aiInteractions += interaction.messages_count || 0
          dailyData[day].aiDuration += interaction.duration || 0
        }
      })
    }

    // Process game actions
    if (reportData?.journey?.game_actions) {
      reportData.journey.game_actions.forEach(action => {
        const day = getDayKey(action.timestamp || Date.now())
        if (!dailyData[day]) {
          dailyData[day] = {
            date: day,
            timeSpent: 0,
            scrollDepth: 0,
            aiInteractions: 0,
            aiDuration: 0,
            gameActions: 0,
            gameScores: 0,
            ctaClicks: 0,
            viewCount: 0
          }
        }
        dailyData[day].gameActions += 1
        dailyData[day].gameScores += action.scores || 0
      })
    }

    // Process CTA clicks
    if (reportData?.journey?.cta_clicks) {
      reportData.journey.cta_clicks.forEach(click => {
        const day = getDayKey(click.timestamp || Date.now())
        if (!dailyData[day]) {
          dailyData[day] = {
            date: day,
            timeSpent: 0,
            scrollDepth: 0,
            aiInteractions: 0,
            aiDuration: 0,
            gameActions: 0,
            gameScores: 0,
            ctaClicks: 0,
            viewCount: 0
          }
        }
        dailyData[day].ctaClicks += 1
      })
    }

    // Convert to array and sort by date
    const result = Object.values(dailyData).sort((a, b) => new Date(a.date) - new Date(b.date))

    // Calculate additional metrics
    result.forEach(day => {
      // Average time per view
      day.avgTimePerView = day.viewCount > 0 ? Math.round(day.timeSpent / day.viewCount) : 0
      // Engagement score (normalized 0-100)
      day.engagementScore = Math.min(100, Math.round(
        (day.timeSpent / 3600 * 10) + // 1 hour = 10 points
        (day.scrollDepth * 0.5) +    // Max scroll depth = 50 points
        (day.aiInteractions * 2) +   // Each AI message = 2 points
        (day.gameActions * 5) +      // Each game action = 5 points
        (day.ctaClicks * 3)          // Each CTA click = 3 points
      ))
    })

    return result
  }, [reportData])

  // Custom tooltip for engagement chart
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="engagement-tooltip">
          <div className="tooltip-header">
            📅 {new Date(data.date).toLocaleDateString('ru-RU', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
          <div className="tooltip-content">
            <div className="tooltip-row">
              <span className="tooltip-label">⏱️ Время на контенте:</span>
              <span className="tooltip-value">{Math.round(data.timeSpent / 60)} мин</span>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-label">📜 Прокрутка:</span>
              <span className="tooltip-value">{data.scrollDepth}%</span>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-label">🤖 AI сообщений:</span>
              <span className="tooltip-value">{data.aiInteractions}</span>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-label">🎮 Игровых действий:</span>
              <span className="tooltip-value">{data.gameActions}</span>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-label">🎯 CTA кликов:</span>
              <span className="tooltip-value">{data.ctaClicks}</span>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-label">📊 Уровень вовлеченности:</span>
              <span className="tooltip-value">{data.engagementScore}/100</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  // Handle chart type toggle for logging
  const handleChartTypeToggle = () => {
    const newType = chartType === 'line' ? 'area' : 'line'
    setChartType(newType)
    logEvent('chart_type_toggle', {
      from_type: chartType,
      to_type: newType,
      component: 'engagement_chart'
    })
  }

  if (!engagementData.length) {
    return (
      <div className="engagement-placeholder">
        <p>📈 Данные для графика вовлеченности загружаются...</p>
        <p>Здесь будет отображена динамика вашей активности</p>
      </div>
    )
  }

  const ChartComponent = chartType === 'line' ? LineChart : AreaChart

  return (
    <motion.div
      className="engagement-chart"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="chart-header">
        <h4>📈 График вовлеченности</h4>
        <div className="chart-controls">
          <button
            onClick={handleChartTypeToggle}
            className={`chart-type-toggle ${chartType}`}
          >
            {chartType === 'line' ? '📊 Линейный' : '🌊 Площадной'}
          </button>
        </div>
      </div>

      <div className="chart-legend-custom">
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#4a90e2' }}></div>
          <span>Время на контенте (мин)</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#5cb85c' }}></div>
          <span>AI взаимодействия</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#9b59b6' }}></div>
          <span>Игровые действия</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#e74c3c' }}></div>
          <span>Уровень вовлеченности</span>
        </div>
      </div>

      <div className="engagement-chart-container">
        <ResponsiveContainer width="100%" height={300}>
          <ChartComponent
            data={engagementData}
            margin={{ top: 20, right: 30, bottom: 20, left: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tickFormatter={(date) => new Date(date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' })}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 12 }}
              label={{ value: 'Время / Количество', angle: -90, position: 'insideLeft' }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 12 }}
              label={{ value: 'Вовлеченность (%)', angle: 90, position: 'insideRight' }}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Time spent line/area */}
            {chartType === 'line' ? (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey={(data) => Math.round(data.timeSpent / 60)}
                stroke="#4a90e2"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                name="Время на контенте (мин)"
              />
            ) : (
              <Area
                yAxisId="left"
                type="monotone"
                dataKey={(data) => Math.round(data.timeSpent / 60)}
                stroke="#4a90e2"
                fill="#4a90e2"
                fillOpacity={0.3}
                strokeWidth={2}
                name="Время на контенте (мин)"
              />
            )}

            {/* AI interactions line/area */}
            {chartType === 'line' ? (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="aiInteractions"
                stroke="#5cb85c"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                name="AI сообщений"
              />
            ) : (
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="aiInteractions"
                stroke="#5cb85c"
                fill="#5cb85c"
                fillOpacity={0.3}
                strokeWidth={2}
                name="AI сообщений"
              />
            )}

            {/* Game actions line/area */}
            {chartType === 'line' ? (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="gameActions"
                stroke="#9b59b6"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                name="Игровые действия"
              />
            ) : (
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="gameActions"
                stroke="#9b59b6"
                fill="#9b59b6"
                fillOpacity={0.3}
                strokeWidth={2}
                name="Игровые действия"
              />
            )}

            {/* Engagement score line/area */}
            {chartType === 'line' ? (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="engagementScore"
                stroke="#e74c3c"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                name="Уровень вовлеченности"
              />
            ) : (
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="engagementScore"
                stroke="#e74c3c"
                fill="#e74c3c"
                fillOpacity={0.3}
                strokeWidth={2}
                name="Уровень вовлеченности"
              />
            )}
          </ChartComponent>
        </ResponsiveContainer>
      </div>

      {/* Summary stats */}
      <div className="engagement-summary">
        <div className="summary-item">
          <span className="summary-label">📊 Средний уровень вовлеченности:</span>
          <span className="summary-value">
            {Math.round(engagementData.reduce((sum, day) => sum + day.engagementScore, 0) / engagementData.length)}/100
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">⏱️ Общее время на контенте:</span>
          <span className="summary-value">
            {Math.round(engagementData.reduce((sum, day) => sum + day.timeSpent, 0) / 3600)} ч
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">🤖 Всего AI взаимодействий:</span>
          <span className="summary-value">
            {engagementData.reduce((sum, day) => sum + day.aiInteractions, 0)}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

export default EngagementChart