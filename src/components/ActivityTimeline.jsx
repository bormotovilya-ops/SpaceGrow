import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid } from 'recharts'

/**
 * Collect all event timestamps from journey (created_at / timestamp).
 * Returns local hour (0–23) for each; JS Date parses ISO UTC and getHours() is local time.
 */
function collectAllTimestamps(journey) {
  const timestamps = []
  const push = (list, key = 'timestamp') => {
    if (!Array.isArray(list)) return
    list.forEach((item) => {
      const ts = item?.timestamp ?? item?.created_at
      if (ts) timestamps.push(new Date(ts).getTime())
    })
  }
  push(journey?.miniapp_opens)
  push(journey?.content_views)
  push(journey?.page_views)
  push(journey?.content_actions)
  push(journey?.ai_interactions)
  push(journey?.alchemy_events)
  push(journey?.game_actions)
  push(journey?.diagnostics)
  push(journey?.cta_clicks)
  return timestamps
}

/**
 * Group events by hour of day (00:00–23:00) in local time.
 * X: hour (0–23), Y: count of any user actions in that hour.
 */
function buildHourlyDistribution(journey) {
  const timestamps = collectAllTimestamps(journey)
  const counts = Array(24).fill(0)
  timestamps.forEach((ms) => {
    const hour = new Date(ms).getHours()
    if (hour >= 0 && hour <= 23) counts[hour] += 1
  })
  return Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    label: `${String(i).padStart(2, '0')}:00`,
    count: counts[i]
  }))
}

const ActivityTimeline = ({ reportData, isExpanded }) => {
  // Hourly distribution: all journey events by local hour (00:00–23:00)
  const hourlyDistribution = useMemo(
    () => buildHourlyDistribution(reportData?.journey ?? {}),
    [reportData]
  )

  const hasAnyData = hourlyDistribution.some((d) => d.count > 0)

  if (!hasAnyData) {
    return (
      <div className="timeline-placeholder">
        <p>📊 Данные для timeline загружаются...</p>
        <p>Здесь будет отображена хронология вашей активности</p>
      </div>
    )
  }

  const HourlyTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    const d = payload[0]?.payload
    if (!d) return null
    return (
      <div className="timeline-tooltip timeline-tooltip-hourly">
        <div className="tooltip-header">
          <span>{d.label}</span>
        </div>
        <div className="tooltip-details">
          <div>Действий: {d.count}</div>
        </div>
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
      {/* Ритм активности за 24 часа — распределение по часам суток (локальное время) */}
      <div className="timeline-header timeline-header-rhythm">
        <h4>Ритм активности за 24 часа</h4>
        <p className="timeline-subtitle">Количество действий по часам (локальное время)</p>
      </div>
      <div className="timeline-chart-container timeline-chart-hourly">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={hourlyDistribution}
            margin={{ top: 16, right: 16, bottom: 24, left: 16 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11 }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={48}
            />
            <YAxis
              dataKey="count"
              allowDecimals={false}
              tick={{ fontSize: 12 }}
              label={{ value: 'Действий', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
            />
            <Tooltip content={<HourlyTooltip />} />
            <Bar dataKey="count" fill="#4a90e2" radius={[4, 4, 0, 0]} name="Действий" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}

export default ActivityTimeline