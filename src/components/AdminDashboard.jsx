import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import Header from './Header'
import './AdminDashboard.css'

const ADMIN_SECTIONS = [
  {
    id: 'bot',
    title: 'Настройки бота',
    description: 'Ключи и параметры бота (get_all_bot_settings)',
    path: '/admin/bot',
    icon: '⚙️'
  },
  {
    id: 'chats',
    title: 'Чаты',
    description: 'Переписка с пользователями',
    path: '/admin/chats',
    icon: '💬'
  },
  {
    id: 'sitemap',
    title: 'Карта сайта',
    description: 'Структура разделов и контента',
    path: '/sitemap',
    icon: '🗺️'
  },
  {
    id: 'report',
    title: 'Персональный отчёт',
    description: 'Воронка, события, тесты по пользователю',
    path: '/personreport',
    icon: '📊'
  }
]

// Генерирует данные по дням за последние 30 дней (для демо, пока бэкенд не отдаёт visitors_by_day)
function buildMockVisitorsByDay() {
  const data = []
  const now = new Date()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const day = d.toISOString().split('T')[0]
    const label = d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
    data.push({ date: day, label, visitors: Math.floor(5 + Math.random() * 25) })
  }
  return data
}

function AdminDashboard({ onBack, onHomeClick, onAvatarClick, onConsultation, onAlchemyClick }) {
  const navigate = useNavigate()
  const [chartData, setChartData] = useState(null)
  const [chartLoading, setChartLoading] = useState(true)

  const apiBase = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
    : ''

  useEffect(() => {
    let cancelled = false
    if (apiBase) {
      fetch(`${apiBase}/api/analytics/site`)
        .then((res) => res.ok ? res.json() : null)
        .then((json) => {
          if (cancelled) return
          if (json && Array.isArray(json.visitors_by_day) && json.visitors_by_day.length > 0) {
            setChartData(json.visitors_by_day.map((d) => ({
              date: d.date,
              label: d.label || d.date,
              visitors: Number(d.visitors) || 0
            })))
          } else {
            setChartData(buildMockVisitorsByDay())
          }
        })
        .catch(() => {
          if (!cancelled) setChartData(buildMockVisitorsByDay())
        })
        .finally(() => {
          if (!cancelled) setChartLoading(false)
        })
    } else {
      setChartData(buildMockVisitorsByDay())
      setChartLoading(false)
    }
    return () => { cancelled = true }
  }, [apiBase])

  const chartDisplayData = useMemo(() => chartData || [], [chartData])

  return (
    <div className="admin-dashboard-page">
      <Header
        onAvatarClick={onAvatarClick || (() => navigate('/profile'))}
        onConsultation={onConsultation || (() => navigate('/diagnostics'))}
        onBack={onBack || (() => navigate('/funnel'))}
        onAlchemyClick={onAlchemyClick || (() => navigate('/alchemy'))}
        onHomeClick={onHomeClick || (() => navigate('/home'))}
        activeMenuId={null}
      />

      <header className="admin-dashboard-header">
        <h1 className="admin-dashboard-title">Администрирование</h1>
      </header>

      <p className="admin-dashboard-subtitle">Выберите раздел</p>

      <section className="admin-dashboard-chart-section" aria-label="Посещения за месяц">
        <h2 className="admin-dashboard-chart-title">Посещения за последний месяц</h2>
        {chartLoading ? (
          <p className="admin-dashboard-chart-loading">Загрузка графика…</p>
        ) : chartDisplayData.length === 0 ? (
          <p className="admin-dashboard-chart-loading">Нет данных за период</p>
        ) : (
          <div className="admin-dashboard-chart-wrap">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartDisplayData} margin={{ top: 8, right: 8, bottom: 24, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" />
                <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(value) => [value, 'посетителей']}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.date || label}
                />
                <Bar dataKey="visitors" fill="rgba(255, 215, 0, 0.7)" radius={[4, 4, 0, 0]} name="Посетители" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <div className="admin-dashboard-grid">
        {ADMIN_SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            className="admin-dashboard-card"
            onClick={() => navigate(section.path)}
          >
            <span className="admin-dashboard-card-icon">{section.icon}</span>
            <h2 className="admin-dashboard-card-title">{section.title}</h2>
            <p className="admin-dashboard-card-desc">{section.description}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

export default AdminDashboard
