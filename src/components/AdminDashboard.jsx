import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import Header from './Header'
import BackToCabinet from './BackToCabinet'
import Switch from './ui/Switch'
import { useLogEvent } from '../hooks/useLogEvent'
import './AdminDashboard.css'

const LOCAL_SOUND_KEY = 'app_sound_enabled'
const LOCAL_DEBUG_KEY = 'app_debug_mode'

function getLocalSoundEnabled() {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(LOCAL_SOUND_KEY) !== 'false'
}

function getLocalDebugMode() {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(LOCAL_DEBUG_KEY) === 'true'
}

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
  const { trackSectionView } = useLogEvent()
  const [chartData, setChartData] = useState(null)
  const [chartLoading, setChartLoading] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(getLocalSoundEnabled)
  const [debugMode, setDebugMode] = useState(getLocalDebugMode)

  useEffect(() => {
    trackSectionView('cabinet-admin')
  }, [trackSectionView])

  const apiBase = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
    : ''

  const analyticsUrl = apiBase
    ? (apiBase.endsWith('/api') ? `${apiBase}/analytics/site` : `${apiBase}/api/analytics/site`)
    : ''

  useEffect(() => {
    let cancelled = false
    if (analyticsUrl) {
      fetch(analyticsUrl)
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
  }, [analyticsUrl])

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
      <div className="back-to-cabinet-wrap">
        <BackToCabinet />
      </div>
      <header className="admin-dashboard-header">
        <h1 className="admin-dashboard-title">Администрирование</h1>
      </header>

      <section className="admin-dashboard-settings-section" aria-label="Настройки администратора">
        <div className="admin-dashboard-settings-list">
          <div className="admin-dashboard-settings-card">
            <div className="admin-dashboard-settings-card-left">
              <span className="admin-dashboard-settings-name">Включить звук</span>
              <span className="admin-dashboard-settings-desc">Фоновая музыка и звуки в приложении (например, в Цифровой Алхимии)</span>
            </div>
            <div className="admin-dashboard-settings-card-right">
              <Switch
                checked={soundEnabled}
                onCheckedChange={(checked) => {
                  setSoundEnabled(checked)
                  localStorage.setItem(LOCAL_SOUND_KEY, String(checked))
                }}
              />
            </div>
          </div>
          <div className="admin-dashboard-settings-card">
            <div className="admin-dashboard-settings-card-left">
              <span className="admin-dashboard-settings-name">Режим отладки</span>
              <span className="admin-dashboard-settings-desc">Панель настройки зон в Кабинете и отладочная информация</span>
            </div>
            <div className="admin-dashboard-settings-card-right">
              <Switch
                checked={debugMode}
                onCheckedChange={(checked) => {
                  setDebugMode(checked)
                  localStorage.setItem(LOCAL_DEBUG_KEY, String(checked))
                }}
              />
            </div>
          </div>
        </div>
      </section>

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

      <ul className="admin-dashboard-list" aria-label="Разделы администрирования">
        {ADMIN_SECTIONS.map((section) => (
          <li key={section.id}>
            <button
              type="button"
              className="admin-dashboard-row"
              onClick={() => navigate(section.path)}
            >
              <span className="admin-dashboard-row-icon" aria-hidden="true">{section.icon}</span>
              <span className="admin-dashboard-row-title">{section.title}</span>
              <span className="admin-dashboard-row-desc">{section.description}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default AdminDashboard
