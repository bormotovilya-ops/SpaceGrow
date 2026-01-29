import React, { useState, useEffect, useRef, useMemo } from 'react'
import Header from './Header'
import ActivityTimeline from './ActivityTimeline'
import EngagementChart from './EngagementChart'
import './PersonReport.css'
import './Visualization.css'
import { yandexMetricaReachGoal } from '../analytics/yandexMetrica'
import { useLogEvent } from '../hooks/useLogEvent'
import { getSupabase } from '../utils/supabaseClient'
import { motion, AnimatePresence } from 'framer-motion'

// Helper: get start date for time filter (ISO string or null for "all")
function getStartDate(period) {
  if (period === 'all') return null
  const now = Date.now()
  if (period === '24h') return new Date(now - 24 * 60 * 60 * 1000).toISOString()
  if (period === '7d') return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()
  return null
}

function PersonReport({ onBack, onAvatarClick, onHomeClick }) {
  const { logPersonalPathView, getSessionInfo, logContentView } = useLogEvent()
  const [selectedPeriod, setSelectedPeriod] = useState('24h')
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [isSampleData, setIsSampleData] = useState(false)
  const [sampleReason, setSampleReason] = useState(null)
  const [expandedSections, setExpandedSections] = useState({
    userInfo: true,
    journey: true,
    segmentation: true,
    recommendations: true,
    visualization: true
  })
  const [expandedPathIndex, setExpandedPathIndex] = useState(null)
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const pageOpenTime = useRef(Date.now())

  useEffect(() => {
    logContentView('page', 'personreport', { content_title: 'Персональный отчёт' })
  }, [logContentView])

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

  // Debug: test Supabase connection to "users" table (runs once on mount)
  useEffect(() => {
    const testConnection = async () => {
      try {
        const supabase = await getSupabase()
        if (!supabase) {
          console.log('❌ Supabase: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set')
          return
        }
        const { data, error } = await supabase.from('users').select('*').limit(1)
        if (error) {
          console.log('❌ Supabase Error:', error.message, error.details)
        } else {
          console.log('✅ Supabase Success! Data received:', data)
        }
      } catch (err) {
        console.log('❌ Supabase test failed:', err.message)
      }
    }
    testConnection()
  }, [])

  // Fetch personal report data (re-runs when selectedPeriod changes)
  useEffect(() => {
    const fetchPersonalReport = async () => {
      const alreadyHasData = !!reportData
      try {
        if (alreadyHasData) setRefreshing(true)
        else setLoading(true)
        const sessionInfo = getSessionInfo()
        const tgUserId = sessionInfo.tgUserId
        const cookieId = sessionInfo.cookieId

        if (!tgUserId && !cookieId) {
          throw new Error('Не удалось определить пользователя')
        }

        // Try Supabase first (if configured). Use shared singleton to avoid multiple GoTrueClient instances.
        const supabase = await getSupabase()

        if (supabase) {
          try {
            const startDate = getStartDate(selectedPeriod)
            console.log('DEBUG_FILTER:', { selectedPeriod, startDate })

            // Helper to parse JSON fields (Supabase may return object or string)
            const safeParse = (v) => {
              if (v == null) return {}
              if (typeof v === 'object') return v
              try {
                return typeof v === 'string' ? JSON.parse(v) : {}
              } catch { return {} }
            }

            // Build user info
            let user = {
              tg_user_id: tgUserId || null,
              cookie_id: null,
              traffic_source: 'Не определен',
              utm_params: {},
              referrer: null,
              first_visit_date: null
            }

            if (tgUserId) {
              const { data: firstSession, error: fsErr } = await supabase
                .from('site_sessions')
                .select('cookie_id,source,utm_params,referrer,session_start')
                .eq('tg_user_id', tgUserId)
                .order('session_start', { ascending: true })
                .limit(1)

              if (!fsErr && firstSession && firstSession.length) {
                const row = firstSession[0]
                user.cookie_id = row.cookie_id
                user.traffic_source = row.source || user.traffic_source
                user.utm_params = safeParse(row.utm_params)
                user.referrer = row.referrer
                user.first_visit_date = row.session_start
              }
            } else if (cookieId) {
              const { data: firstSession, error: fsErr } = await supabase
                .from('site_sessions')
                .select('tg_user_id,source,utm_params,referrer,session_start')
                .eq('cookie_id', cookieId)
                .order('session_start', { ascending: true })
                .limit(1)

              if (!fsErr && firstSession && firstSession.length) {
                const row = firstSession[0]
                user.tg_user_id = row.tg_user_id
                user.cookie_id = cookieId
                user.traffic_source = row.source || user.traffic_source
                user.utm_params = safeParse(row.utm_params)
                user.referrer = row.referrer
                user.first_visit_date = row.session_start
              }
            }

            // Journey: sessions and events
            const journey = {
              miniapp_opens: [],
              content_views: [],
              ai_interactions: [],
              diagnostics: [],
              game_actions: [],
              cta_clicks: []
            }

            // miniapp opens
            // Simple UA parse for frontend when backend doesn't provide device/browser
            const parseUA = (ua) => {
              if (!ua || typeof ua !== 'string') return { deviceType: 'Unknown', browser: 'Unknown' }
              const s = ua.toLowerCase()
              let deviceType = 'Desktop'
              if (/mobile|android|iphone|ipod|webos|blackberry|iemobile|opera mini/i.test(s)) deviceType = 'Mobile'
              else if (/tablet|ipad|playbook|silk/i.test(s)) deviceType = 'Tablet'
              let browser = 'Unknown'
              if (s.includes('edg/')) browser = 'Edge'
              else if (s.includes('opr/') || s.includes('opera')) browser = 'Opera'
              else if (s.includes('chrome/')) browser = 'Chrome'
              else if (s.includes('firefox/')) browser = 'Firefox'
              else if (s.includes('safari/') && !s.includes('chrome')) browser = 'Safari'
              return { deviceType, browser }
            }
            if (tgUserId || cookieId) {
              const q = supabase
                .from('site_sessions')
                .select('session_start,session_end,page_id,device_type,user_agent')
                .order('session_start', { ascending: false })
                .limit(200)

              if (tgUserId) q.eq('tg_user_id', tgUserId)
              else q.eq('cookie_id', cookieId)
              if (selectedPeriod !== 'all') q.gte('session_start', startDate)

              const { data: sessions, error: sErr } = await q
              if (!sErr && sessions) {
                journey.miniapp_opens = sessions.map(s => {
                  const ua = parseUA(s.user_agent)
                  return {
                    timestamp: s.session_start,
                    page: s.page_id,
                    device: s.device_type || ua.deviceType,
                    device_type: s.device_type || ua.deviceType,
                    browser: ua.browser
                  }
                })
              }
            }

            // helper to fetch events by type (respects selectedPeriod for time filter)
            const fetchEvents = async (type, mapper = (r) => r) => {
              const q = supabase
                .from('site_events')
                .select('created_at,event_name,metadata,page')
                .order('created_at', { ascending: false })
                .limit(200)

              if (tgUserId) q.eq('tg_user_id', tgUserId)
              else q.eq('cookie_id', cookieId)
              if (type) q.eq('event_type', type)
              if (selectedPeriod !== 'all') q.gte('created_at', getStartDate(selectedPeriod))

              const { data, error } = await q
              console.log('RAW_EVENTS_FROM_DB:', data)
              if (!error && data) return data.map(mapper)
              return []
            }

            journey.content_views = await fetchEvents('content_view', (r) => {
              const meta = safeParse(r.metadata)
              return {
                event_name: r.event_name,
                metadata: r.metadata,
                page: r.page ?? null,
                section: meta.content_type ?? r.event_name,
                content_id: meta.content_id ?? null,
                content_title: meta.content_title ?? null,
                time_spent: meta.time_spent ?? 0,
                scroll_depth: meta.scroll_depth ?? 0,
                timestamp: r.created_at
              }
            })

            journey.ai_interactions = await fetchEvents('ai_interaction', (r) => ({
              event_name: r.event_name,
              metadata: r.metadata,
              messages_count: (r.metadata && (() => { try { return JSON.parse(r.metadata).messages_count } catch { return 0 } })()) || 0,
              topics: (r.metadata && (() => { try { return JSON.parse(r.metadata).topics } catch { return [] } })()) || [],
              duration: (r.metadata && (() => { try { return JSON.parse(r.metadata).duration } catch { return 0 } })()) || 0,
              timestamp: r.created_at
            }))

            journey.diagnostics = await fetchEvents('diagnostic', (r) => ({
              event_name: r.event_name,
              metadata: r.metadata,
              progress: (r.metadata && (() => { try { return JSON.parse(r.metadata).progress } catch { return 0 } })()) || 0,
              results: (r.metadata && (() => { try { return JSON.parse(r.metadata).results } catch { return null } })()) || null,
              time_spent: (r.metadata && (() => { try { const m = JSON.parse(r.metadata); return (m.end_time && m.start_time) ? (m.end_time - m.start_time) : 0 } catch { return 0 } })()) || 0,
              timestamp: r.created_at
            }))

            journey.game_actions = await fetchEvents('game_action', (r) => ({
              event_name: r.event_name,
              metadata: r.metadata,
              game_type: (r.metadata && (() => { try { return JSON.parse(r.metadata).game_type } catch { return 'Неизвестно' } })()) || 'Неизвестно',
              achievement: (r.metadata && (() => { try { return JSON.parse(r.metadata).achievement } catch { return [] } })()) || [],
              score: (r.metadata && (() => { try { return JSON.parse(r.metadata).score } catch { return 0 } })()) || 0,
              timestamp: r.created_at
            }))

            journey.cta_clicks = await fetchEvents('cta_click', (r) => {
              const meta = safeParse(r.metadata)
              return {
                event_name: r.event_name,
                metadata: r.metadata,
                cta_text: meta.cta_text ?? meta.button_text ?? null,
                cta_location: meta.cta_location ?? null,
                previous_step: meta.previous_step ?? null,
                step_duration: meta.step_duration ?? 0,
                timestamp: r.created_at
              }
            })

            // Compute simple metrics (respect time filter)
            const totalSessionsQuery = supabase
              .from('site_sessions')
              .select('id', { count: 'exact' })
              .eq(tgUserId ? 'tg_user_id' : 'cookie_id', tgUserId || cookieId)
            if (selectedPeriod !== 'all') totalSessionsQuery.gte('session_start', startDate)
            const { data: totalSessionsData, error: tsErr } = await totalSessionsQuery

            const totalSessions = (totalSessionsData && totalSessionsData.length) || 0
            const diagnosticsQuery = supabase
              .from('site_events')
              .select('id')
              .eq(tgUserId ? 'tg_user_id' : 'cookie_id', tgUserId || cookieId)
              .eq('event_type', 'diagnostic')
            if (selectedPeriod !== 'all') diagnosticsQuery.gte('created_at', startDate)
            const { data: diagnosticsData } = await diagnosticsQuery

            const diagnosticsCompleted = (diagnosticsData && diagnosticsData.length) > 0

            const engagementLevel = (journey.content_views.length + journey.ai_interactions.length) > 30 ? 'high' : ((journey.content_views.length + journey.ai_interactions.length) > 5 ? 'medium' : 'low')

            let totalSessionDurationSeconds = 0
            try {
              journey.miniapp_opens?.forEach((open, idx) => {
                const sessionsWithEnd = sessions
                if (sessionsWithEnd && sessionsWithEnd[idx]?.session_start && sessionsWithEnd[idx]?.session_end) {
                  const start = new Date(sessionsWithEnd[idx].session_start).getTime()
                  const end = new Date(sessionsWithEnd[idx].session_end).getTime()
                  if (end > start) totalSessionDurationSeconds += Math.round((end - start) / 1000)
                }
              })
            } catch (_) {}
            const segmentation = {
              user_segment: diagnosticsCompleted ? 'engaged' : (totalSessions > 5 ? 'engaged' : 'newcomer'),
              engagement_level: engagementLevel,
              total_sessions: totalSessions,
              diagnostics_completed: diagnosticsCompleted,
              last_activity: journey.miniapp_opens.length ? journey.miniapp_opens[0].timestamp : null,
              session_duration_seconds: totalSessionDurationSeconds,
              session_duration_display: totalSessionDurationSeconds ? `${Math.floor(totalSessionDurationSeconds / 60)}м ${totalSessionDurationSeconds % 60}с` : null
            }

            const recommendations = {
              next_steps: segmentation.user_segment === 'newcomer' ? ['Пройти диагностику для персональных рекомендаций', 'Изучить основные разделы сайта'] : ['Связаться для детального обсуждения'],
              automatic_actions: [],
              content_suggestions: ['Введение', 'Кейсы'],
              cta_suggestions: ['Записаться на консультацию']
            }

            const report = {
              user,
              journey,
              segmentation,
              recommendations,
              generated_at: new Date().toISOString()
            }

            setReportData(report)
            setIsSampleData(false)
            setError(null)
            return
          } catch (supErr) {
            console.warn('Supabase fetch failed, falling back to backend API', supErr)
            // fallthrough to backend fetch
          }
        }

        // Fallback: existing backend endpoints
        let response
        if (tgUserId) {
          response = await fetch(`/api/user/${tgUserId}/personal-report`)
        } else {
          response = await fetch(`/api/user/by-cookie/${cookieId}/personal-report`)
        }

        if (!response.ok) {
          throw new Error('Не удалось загрузить данные отчета')
        }

        const contentType = response.headers.get('content-type') || ''
        const sampleHeader = response.headers.get('x-sample-data')

        if (contentType.includes('application/json')) {
          const data = await response.json()
          setReportData(data)
          setIsSampleData(sampleHeader === 'true')
          setSampleReason(response.headers.get('x-sample-reason') || null)
          setError(null)
        } else {
          // Non-JSON response handling
          console.warn('personal-report returned non-JSON response', { status: response.status, contentType })
          if (sampleHeader === 'true') {
            let data = null
            try {
              data = await response.json()
            } catch (e) {
              console.warn('Failed to parse sample JSON despite X-Sample-Data header', e)
            }
            if (data) {
              setReportData(data)
              setIsSampleData(true)
              setSampleReason(response.headers.get('x-sample-reason') || null)
              setError(null)
            } else {
              throw new Error('Получен неожиданный ответ от сервера')
            }
          } else {
            throw new Error('Получен неожиданный ответ от сервера')
          }
        }
      } catch (err) {
        console.error('Error fetching personal report:', err)
        setError(err.message)
        setReportData(null)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    }

    fetchPersonalReport()
  }, [getSessionInfo, selectedPeriod])

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

  // DD.MM.YYYY, HH:mm for activity path and detailed timestamps
  const formatDateTime = (dateString) => {
    if (!dateString) return '—'
    try {
      const d = new Date(dateString)
      const day = String(d.getDate()).padStart(2, '0')
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const year = d.getFullYear()
      const hours = String(d.getHours()).padStart(2, '0')
      const minutes = String(d.getMinutes()).padStart(2, '0')
      return `${day}.${month}.${year}, ${hours}:${minutes}`
    } catch {
      return String(dateString)
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

  // Event-type labels for Activity Path group titles
  const EVENT_TYPE_LABELS = useMemo(() => ({
    miniapp_open: '📱 Открытие MiniApp',
    content_view: '👁️ Просмотр контента',
    ai_interaction: '🤖 AI взаимодействие',
    diagnostic: '🧪 Диагностика',
    game_action: '🎮 Игровое действие',
    cta_click: '🎯 Клик по кнопке'
  }), [])

  // Technical IDs → Russian titles (screens, funnel blocks) for Маршрут активности
  const PAGE_NAMES = useMemo(() => ({
    personreport: '📊 Персональный отчет',
    home: '🏠 Главная',
    alchemy: '⚗️ Алхимия',
    diagnostics: '🧬 Диагностика',
    main: 'Главная',
    index: 'Главная',
    funnel_diagram: 'Диаграмма воронки',
    profile: 'Профиль (Илья Бормотов)',
    chat: 'Чат с ИИ-наставником',
    chatbot: 'Чат с ИИ-наставником',
    portfolio: 'Портфолио',
    audience: 'Аудитория',
    landing: 'Лендинг',
    leadmagnet: 'Лидмагнит',
    tripwire: 'Трипваер',
    autofunnel: 'Автоворонки прогрева',
    product: 'Продукт',
    money: 'Деньги',
    page: 'Страница',
    section: 'Раздел',
    content_view: 'Просмотр контента',
    'Main Page': 'Главная'
  }), [])

  // CTA location / previous_step technical IDs → Russian labels
  const LOCATION_NAMES = useMemo(() => ({
    home: 'Главная',
    diagnostics: 'Диагностика',
    sales_funnel: 'Воронка продаж',
    funnel_diagram: 'Диаграмма воронки',
    chatbot: 'Чат с ИИ-наставником',
    chat: 'Чат с ИИ-наставником',
    personreport: 'Персональный отчёт',
    portfolio: 'Портфолио',
    profile: 'Профиль',
    alchemy: 'Цифровая Алхимия',
    main: 'Главная'
  }), [])

  const PREVIOUS_STEP_NAMES = useMemo(() => ({
    viewing_intro: 'Просмотр введения',
    viewing_home: 'Просмотр главной',
    viewing_funnel: 'Просмотр воронки',
    viewing_funnel_diagram: 'Просмотр диаграммы воронки'
  }), [])

  const getPageLabel = (id) => (id && PAGE_NAMES[id]) ? PAGE_NAMES[id] : (id || '—')
  // Strict priority: PAGE_NAMES[content_id] → PAGE_NAMES[page] → content_title → fallback
  const getSectionLabel = (event) => {
    const contentId = event?.content_id ?? (typeof event?.metadata === 'object' ? event.metadata?.content_id : null)
    const page = event?.page ?? (typeof event?.metadata === 'object' ? event.metadata?.page : null)
    const contentTitle = event?.content_title ?? (typeof event?.metadata === 'object' ? event.metadata?.content_title : null)
    if (contentId != null && PAGE_NAMES[contentId] != null) return PAGE_NAMES[contentId]
    if (page != null && PAGE_NAMES[page] != null) return PAGE_NAMES[page]
    if (contentTitle != null && String(contentTitle).trim()) return contentTitle
    return 'Просмотр страницы'
  }
  const getCtaLabel = (c) => {
    if (c?.cta_text && String(c.cta_text).trim()) return c.cta_text
    if (c?.cta_location != null && LOCATION_NAMES[c.cta_location]) return LOCATION_NAMES[c.cta_location]
    if (c?.cta_location) return c.cta_location
    return '—'
  }
  const getCtaLocationLabel = (v) => (v != null && LOCATION_NAMES[v]) ? LOCATION_NAMES[v] : (v || 'Не указано')
  const getPreviousStepLabel = (v) => (v != null && PREVIOUS_STEP_NAMES[v]) ? PREVIOUS_STEP_NAMES[v] : (v || '—')

  // Build activity path: merge all events chronologically, group consecutive identical types; retain events per group for accordion details.
  // Filter out "main" content_views and dedupe by (timestamp, content_id) to avoid clutter.
  const activityPathGrouped = useMemo(() => {
    const items = []
    const j = reportData?.journey
    if (!j) return items
    const seenContentViews = new Set()
    const push = (type, timestamp, raw) => {
      const ts = timestamp ? new Date(timestamp).getTime() : 0
      if (ts) items.push({ type, ts, raw })
    }
    const pushContentView = (v) => {
      if (v?.content_id === 'main') return
      const key = `${v?.timestamp ?? ''}_${v?.content_id ?? ''}`
      if (seenContentViews.has(key)) return
      seenContentViews.add(key)
      push('content_view', v.timestamp, v)
    }
    j.miniapp_opens?.forEach(o => push('miniapp_open', o.timestamp, o))
    j.content_views?.forEach(pushContentView)
    j.ai_interactions?.forEach(a => push('ai_interaction', a.timestamp, a))
    j.diagnostics?.forEach(d => push('diagnostic', d.timestamp, d))
    j.game_actions?.forEach(g => push('game_action', g.timestamp, g))
    j.cta_clicks?.forEach(c => push('cta_click', c.timestamp, c))
    items.sort((a, b) => a.ts - b.ts)

    // Visual deduplication: if two identical events (same type + same signature) within 2 sec, show only the first
    const DEDUPE_MS = 2000
    const getSignature = (item) => {
      if (item.type === 'content_view') return item.raw?.content_id ?? item.raw?.content_title ?? String(item.ts)
      if (item.type === 'cta_click') return `${item.raw?.cta_text ?? ''}|${item.raw?.cta_location ?? ''}`
      return String(item.ts)
    }
    const lastKept = {}
    const deduped = items.filter((item) => {
      const sig = getSignature(item)
      const prev = lastKept[item.type]
      if (prev && prev.sig === sig && (item.ts - prev.ts) <= DEDUPE_MS) return false
      lastKept[item.type] = { ts: item.ts, sig }
      return true
    })

    const grouped = []
    for (let i = 0; i < deduped.length; i++) {
      const curr = deduped[i]
      const events = [curr.raw]
      let count = 1
      while (i + 1 < deduped.length && deduped[i + 1].type === curr.type) {
        count++
        i++
        events.push(deduped[i].raw)
        curr.ts = deduped[i].ts
      }
      const last = events[events.length - 1]
      const typeLabel = EVENT_TYPE_LABELS[curr.type] || curr.type
      let subtitle = ''
      if (curr.type === 'miniapp_open' && last?.page) subtitle = PAGE_NAMES[last.page] || last.page
      else if (curr.type === 'content_view' && last) subtitle = getSectionLabel(last)
      else if (curr.type === 'cta_click' && last) subtitle = getCtaLabel(last)
      const label = subtitle ? `${typeLabel} (${subtitle})` : typeLabel
      grouped.push({
        type: curr.type,
        label,
        count,
        latestTimestamp: last?.timestamp ?? events[0]?.timestamp,
        events
      })
    }
    return grouped
  }, [reportData, EVENT_TYPE_LABELS, PAGE_NAMES, LOCATION_NAMES, PREVIOUS_STEP_NAMES])

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
        <div className="person-report-time-filter">
          <span className="time-filter-label">Период:</span>
          <div className="time-filter-segmented" role="group" aria-label="Выбор периода">
            {[
              { value: '24h', label: '24 часа' },
              { value: '7d', label: '7 дней' },
              { value: 'all', label: 'Все время' }
            ].map(({ value, label }) => (
              <button
                key={value}
                type="button"
                className={`time-filter-option ${selectedPeriod === value ? 'active' : ''}`}
                onClick={() => setSelectedPeriod(value)}
                aria-pressed={selectedPeriod === value}
                disabled={refreshing}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {(refreshing && (
          <div className="person-report-refreshing-overlay" aria-hidden="true">
            <div className="loading-spinner loading-spinner--small" />
          </div>
        ))}

        <div className={`person-report-body ${refreshing ? 'person-report-content-dimmed' : ''}`}>
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
                  {(reportData?.journey?.miniapp_opens?.[0]?.device_type || reportData?.journey?.miniapp_opens?.[0]?.device) && (
                    <div className="info-item">
                      <label>Тип устройства:</label>
                      <span>{reportData.journey.miniapp_opens[0].device_type || reportData.journey.miniapp_opens[0].device || 'Не определено'}</span>
                    </div>
                  )}
                  {(reportData?.journey?.miniapp_opens?.[0]?.browser) && (
                    <div className="info-item">
                      <label>Браузер:</label>
                      <span>{reportData.journey.miniapp_opens[0].browser}</span>
                    </div>
                  )}
                  {(reportData?.segmentation?.session_duration_display ?? reportData?.session_duration_seconds != null) && (
                    <div className="info-item">
                      <label>Длительность сессий:</label>
                      <span>{reportData?.segmentation?.session_duration_display ?? formatDuration(reportData?.session_duration_seconds ?? 0)}</span>
                    </div>
                  )}
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
                {activityPathGrouped.length > 0 && (
                  <div className="activity-path-grouped">
                    <h4>Маршрут активности</h4>
                    <ul className="activity-path-timeline">
                      {activityPathGrouped.map((entry, index) => {
                        const isExpanded = expandedPathIndex === index
                        return (
                          <li key={index} className="activity-path-timeline-item">
                            <div className="activity-path-timeline-marker" />
                            <div className="activity-path-timeline-content">
                              <button
                                type="button"
                                className={`activity-path-entry-toggle ${isExpanded ? 'expanded' : ''}`}
                                onClick={() => setExpandedPathIndex(isExpanded ? null : index)}
                                aria-expanded={isExpanded}
                              >
                                <span className="activity-path-entry-title">{entry.label}</span>
                                {entry.count > 1 && (
                                  <span className="activity-path-entry-pill">×{entry.count}</span>
                                )}
                                <span className="activity-path-entry-meta">{formatDateTime(entry.latestTimestamp)}</span>
                                <span className="activity-path-entry-chevron">{isExpanded ? '▲' : '▼'}</span>
                              </button>
                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    className="activity-path-entry-details"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    {entry.type === 'miniapp_open' && entry.events.map((event, i) => {
                                      if (event != null) {
                                        console.log('RENDER_ITEM:', {
                                          name: event.event_name,
                                          meta: event.metadata,
                                          parsedMeta: typeof event.metadata === 'string' ? (() => { try { return JSON.parse(event.metadata) } catch { return event.metadata } })() : event.metadata
                                        })
                                      }
                                      return (
                                      <div key={i} className="path-detail-block">
                                        <p>Страница: {getPageLabel(event.page || 'main')}</p>
                                        <p>Устройство: {event.device_type || event.device || 'Не определено'}</p>
                                        {event.browser && <p>Браузер: {event.browser}</p>}
                                        <p>Время: {formatDateTime(event.timestamp)}</p>
                                      </div>
                                    )})}
                                    {entry.type === 'content_view' && entry.events.map((event, i) => {
                                      if (event != null) {
                                        console.log('RENDER_ITEM:', {
                                          name: event.event_name,
                                          meta: event.metadata,
                                          parsedMeta: typeof event.metadata === 'string' ? (() => { try { return JSON.parse(event.metadata) } catch { return event.metadata } })() : event.metadata
                                        })
                                      }
                                      return (
                                      <div key={i} className="path-detail-block">
                                        <p><strong>{getSectionLabel(event)}</strong></p>
                                        {event?.time_spent > 0 && <p>Время просмотра: {formatDuration(event.time_spent)}</p>}
                                        {event?.scroll_depth > 0 && <p>Прокрутка: {event.scroll_depth}%</p>}
                                        <p>Время: {formatDateTime(event?.timestamp)}</p>
                                      </div>
                                    )})}
                                    {entry.type === 'ai_interaction' && entry.events.map((event, i) => {
                                      if (event != null) {
                                        console.log('RENDER_ITEM:', {
                                          name: event.event_name,
                                          meta: event.metadata,
                                          parsedMeta: typeof event.metadata === 'string' ? (() => { try { return JSON.parse(event.metadata) } catch { return event.metadata } })() : event.metadata
                                        })
                                      }
                                      return (
                                      <div key={i} className="path-detail-block">
                                        <p>Сообщений: {event.messages_count}</p>
                                        <p>Темы: {event.topics?.join(', ') || 'Общие'}</p>
                                        <p>Длительность: {formatDuration(event.duration)}</p>
                                        <p>Время: {formatDateTime(event.timestamp)}</p>
                                      </div>
                                    )})}
                                    {entry.type === 'diagnostic' && entry.events.map((event, i) => {
                                      if (event != null) {
                                        console.log('RENDER_ITEM:', {
                                          name: event.event_name,
                                          meta: event.metadata,
                                          parsedMeta: typeof event.metadata === 'string' ? (() => { try { return JSON.parse(event.metadata) } catch { return event.metadata } })() : event.metadata
                                        })
                                      }
                                      return (
                                      <div key={i} className="path-detail-block">
                                        <p>Прогресс: {event.progress}%</p>
                                        <p>Результаты: {event.results || 'В процессе'}</p>
                                        <p>Длительность: {formatDuration(event.time_spent)}</p>
                                        <p>Время: {formatDateTime(event.timestamp)}</p>
                                      </div>
                                    )})}
                                    {entry.type === 'game_action' && entry.events.map((event, i) => {
                                      if (event != null) {
                                        console.log('RENDER_ITEM:', {
                                          name: event.event_name,
                                          meta: event.metadata,
                                          parsedMeta: typeof event.metadata === 'string' ? (() => { try { return JSON.parse(event.metadata) } catch { return event.metadata } })() : event.metadata
                                        })
                                      }
                                      return (
                                      <div key={i} className="path-detail-block">
                                        <p>Тип игры: {event.game_type}</p>
                                        <p>Достижения: {(event.achievement || event.achievements)?.join?.(', ') || (Array.isArray(event.achievement) ? event.achievement.join(', ') : event.achievement) || 'Нет'}</p>
                                        <p>Очки: {event.score ?? event.scores ?? 0}</p>
                                        <p>Время: {formatDateTime(event.timestamp)}</p>
                                      </div>
                                    )})}
                                    {entry.type === 'cta_click' && entry.events.map((event, i) => {
                                      if (event != null) {
                                        console.log('RENDER_ITEM:', {
                                          name: event.event_name,
                                          meta: event.metadata,
                                          parsedMeta: typeof event.metadata === 'string' ? (() => { try { return JSON.parse(event.metadata) } catch { return event.metadata } })() : event.metadata
                                        })
                                      }
                                      return (
                                      <div key={i} className="path-detail-block">
                                        <p>Кнопка: {getCtaLabel(event)}</p>
                                        <p>Расположение: {getCtaLocationLabel(event.cta_location ?? event.location)}</p>
                                        <p>Предыдущий шаг: {getPreviousStepLabel(event.previous_step)}</p>
                                        <p>Время на шаге: {formatDuration(event.step_duration ?? event.duration)}</p>
                                        <p>Время: {formatDateTime(event.timestamp)}</p>
                                      </div>
                                    )})}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
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
    </div>
  )
}

export default PersonReport