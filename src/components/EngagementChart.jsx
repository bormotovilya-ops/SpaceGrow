import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Area, AreaChart, PieChart, Pie, Cell, Legend } from 'recharts'
import { useLogEvent } from '../hooks/useLogEvent'

const CHART_TYPES = { line: 'line', area: 'area', pie: 'pie' }

const EngagementChart = ({ reportData, isExpanded }) => {
  const { logEvent } = useLogEvent()
  const [chartType, setChartType] = useState(CHART_TYPES.line)

  // Aggregate engagement data by day
  const engagementData = useMemo(() => {
    const dailyData = {}

    // Helper function to get day key
    const getDayKey = (timestamp) => {
      const date = new Date(timestamp)
      return date.toISOString().split('T')[0] // YYYY-MM-DD format
    }

    // Process content events (site_events event_type 'content'); metadata.duration, fallback 30 if 0/null/missing
    if (reportData?.journey?.content_views) {
      reportData.journey.content_views.forEach(view => {
        const day = getDayKey(view.timestamp || Date.now())
        if (!dailyData[day]) {
          dailyData[day] = {
            date: day,
            timeSpent: 0,
            aiInteractions: 0,
            aiDuration: 0,
            gameActions: 0,
            gameScores: 0,
            ctaClicks: 0,
            viewCount: 0
          }
        }
        const durationRaw = Number(view.duration ?? view.time_spent ?? 0) || 0
        const durationSec = durationRaw > 0 ? durationRaw : 30
        dailyData[day].timeSpent += durationSec
        dailyData[day].viewCount += 1
      })
    }

    // Process AI interactions (site_events event_type 'ai'): count each ai_chat_message as 1 interaction
    if (reportData?.journey?.ai_interactions) {
      reportData.journey.ai_interactions.forEach(interaction => {
        if (!interaction.is_expert_chat) {
          const day = getDayKey(interaction.timestamp || Date.now())
          if (!dailyData[day]) {
            dailyData[day] = {
              date: day,
              timeSpent: 0,
              aiInteractions: 0,
              aiDuration: 0,
              gameActions: 0,
              gameScores: 0,
              ctaClicks: 0,
              viewCount: 0
            }
          }
          dailyData[day].aiInteractions += 1
          dailyData[day].aiDuration += Number(interaction.duration ?? 0) || 0
        }
      })
    }

    // Process alchemy/game actions (site_events event_type 'alchemy')
    if (reportData?.journey?.game_actions) {
      reportData.journey.game_actions.forEach(action => {
        const day = getDayKey(action.timestamp || Date.now())
        if (!dailyData[day]) {
          dailyData[day] = {
            date: day,
            timeSpent: 0,
            aiInteractions: 0,
            aiDuration: 0,
            gameActions: 0,
            gameScores: 0,
            ctaClicks: 0,
            viewCount: 0
          }
        }
        dailyData[day].gameActions += 1
        dailyData[day].gameScores += Number(action.score ?? action.scores ?? 0) || 0
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
    let result = Object.values(dailyData).sort((a, b) => new Date(a.date) - new Date(b.date))

    // Fill missing days in range: use all dates present in content/ai/alchemy/cta events for X-axis
    const allDates = new Set(Object.keys(dailyData))
    const sortedDates = Array.from(allDates).sort()
    const rangeDays = 7
    const endDate = sortedDates.length ? new Date(sortedDates[sortedDates.length - 1]) : new Date()
    const startDate = new Date(endDate)
    startDate.setDate(startDate.getDate() - rangeDays)
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const day = d.toISOString().split('T')[0]
      if (!dailyData[day]) {
        result.push({
          date: day,
          timeSpent: 0,
          aiInteractions: 0,
          aiDuration: 0,
          gameActions: 0,
          gameScores: 0,
          ctaClicks: 0,
          viewCount: 0
        })
      }
    }
    result = result.sort((a, b) => new Date(a.date) - new Date(b.date))

    // When no data at all, show last 7 days with zeros so chart doesn't hang in "Loading"
    if (result.length === 0) {
      const today = new Date()
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        result.push({
          date: d.toISOString().split('T')[0],
          timeSpent: 0,
          aiInteractions: 0,
          aiDuration: 0,
          gameActions: 0,
          gameScores: 0,
          ctaClicks: 0,
          viewCount: 0,
          avgTimePerView: 0,
          engagementScore: 0
        })
      }
    }

    // Calculate additional metrics (duration in seconds; no scroll_depth dependency)
    result.forEach(day => {
      day.avgTimePerView = day.viewCount > 0 ? Math.round(day.timeSpent / day.viewCount) : 0
      if (day.engagementScore == null) {
        day.engagementScore = Math.min(100, Math.round(
          (day.timeSpent / 3600 * 10) +
          (day.aiInteractions * 2) +
          (day.gameActions * 5) +
          (day.ctaClicks * 3)
        ))
      }
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

  // Data for pie chart: totals by category (time in min, counts)
  const pieData = useMemo(() => {
    const totalTime = engagementData.reduce((s, d) => s + d.timeSpent, 0)
    const totalAi = engagementData.reduce((s, d) => s + d.aiInteractions, 0)
    const totalGame = engagementData.reduce((s, d) => s + d.gameActions, 0)
    const totalCta = engagementData.reduce((s, d) => s + d.ctaClicks, 0)
    return [
      { name: 'Время на контенте (мин)', value: Math.round(totalTime / 60), color: '#4a90e2' },
      { name: 'AI взаимодействия', value: totalAi, color: '#5cb85c' },
      { name: 'Игровые действия', value: totalGame, color: '#9b59b6' },
      { name: 'CTA клики', value: totalCta, color: '#e74c3c' }
    ].filter((d) => d.value > 0)
  }, [engagementData])

  const handleChartTypeChange = (newType) => {
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

  const isPie = chartType === CHART_TYPES.pie
  const ChartComponent = chartType === CHART_TYPES.line ? LineChart : AreaChart

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
            type="button"
            onClick={() => handleChartTypeChange(CHART_TYPES.line)}
            className={`chart-type-toggle ${chartType === CHART_TYPES.line ? 'active' : ''}`}
          >
            📊 Линейный
          </button>
          <button
            type="button"
            onClick={() => handleChartTypeChange(CHART_TYPES.area)}
            className={`chart-type-toggle ${chartType === CHART_TYPES.area ? 'active' : ''}`}
          >
            🌊 Площадной
          </button>
          <button
            type="button"
            onClick={() => handleChartTypeChange(CHART_TYPES.pie)}
            className={`chart-type-toggle ${chartType === CHART_TYPES.pie ? 'active' : ''}`}
          >
            🥧 Круговой
          </button>
        </div>
      </div>

      {!isPie && (
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
      )}

      <div className="engagement-chart-container">
        {isPie ? (
          <ResponsiveContainer width="100%" height={300}>
            {pieData.length > 0 ? (
              <PieChart margin={{ top: 16, right: 16, bottom: 16, left: 16 }}>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  labelLine
                >
                  {pieData.map((entry, index) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [value, name]}
                  contentStyle={{ borderRadius: 8 }}
                />
                <Legend />
              </PieChart>
            ) : (
              <div className="engagement-chart-pie-empty">
                <p>Нет активности за период для отображения в круговой диаграмме</p>
              </div>
            )}
          </ResponsiveContainer>
        ) : (
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
        )}
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