import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import Header from './Header'
import ActivityTimeline from './ActivityTimeline'
import EngagementChart from './EngagementChart'
import './PersonReport.css'
import './Visualization.css'
import { yandexMetricaReachGoal } from '../analytics/yandexMetrica'
import { useLogEvent } from '../hooks/useLogEvent'
import { getSupabase } from '../utils/supabaseClient'
import { findSectionByPath } from '../config/sitemapData'
import { motion, AnimatePresence } from 'framer-motion'

// Helper: get start date for time filter (ISO string or null for "all")
function getStartDate(period) {
  if (period === 'all') return null
  const now = Date.now()
  if (period === '24h') return new Date(now - 24 * 60 * 60 * 1000).toISOString()
  if (period === '7d') return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()
  return null
}

// Helper: parse metadata (object or JSON string) — defined outside component to avoid hoisting issues
function safeParseMeta(m) {
  if (m == null) return {}
  if (typeof m === 'object') return m
  try { return typeof m === 'string' ? JSON.parse(m) : {} } catch { return {} }
}

// Strip leading emoji (+ optional space) from label so title text doesn't duplicate the icon
function stripLeadingEmoji(str) {
  if (str == null || typeof str !== 'string') return str ?? ''
  const trimmed = str.replace(/^\s*(\p{Emoji}\s*)+/u, '').trim()
  return trimmed || str
}

// Technical event names to hide from timeline entirely (we show only custom labels)
const HIDDEN_EVENT_NAMES = ['personal_path_view', 'astrolabe_pdf_action', 'card_draw']

function PersonReport({ onBack, onAvatarClick, onHomeClick, onDiagnostics, onAlchemyClick }) {
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
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const [expandedRow, setExpandedRow] = useState(null)
  const pageOpenTime = useRef(Date.now())

  useEffect(() => {
    console.log('📍 Tracking page view:', '/report')
    logContentView('page', 'personreport', { content_title: 'Персональный отчёт' })
  }, [logContentView])

  const handleHeaderConsultation = () => {
    yandexMetricaReachGoal(null, 'open_diagnostics', { placement: 'header', page: 'person_report' })
    if (onDiagnostics) onDiagnostics()
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
        // Use fallback test ID when in browser (no Telegram context) so we fetch the same user we track
        const FALLBACK_TG_USER_ID = 888888
        const userId = tgUserId ?? FALLBACK_TG_USER_ID

        console.log('Fetching reports for ID:', userId)

        if (!tgUserId && !cookieId) {
          throw new Error('Не удалось определить пользователя')
        }

        // Try Supabase first (if configured). Use shared singleton to avoid multiple GoTrueClient instances.
        const supabase = await getSupabase()

        if (supabase) {
          try {
            await supabase.rpc('fn_refresh_segments', {
              target_user_id: String(userId)
            })
            const { data: segmentRows } = await supabase
              .from('user_segments')
              .select('*')
              .eq('tg_user_id', userId)
              .limit(1)
            const userSegmentsRow = segmentRows?.[0] ?? null
            const startDate = getStartDate(selectedPeriod)

            // Helper to parse JSON fields (Supabase may return object or string)
            const safeParse = (v) => {
              if (v == null) return {}
              if (typeof v === 'object') return v
              try {
                return typeof v === 'string' ? JSON.parse(v) : {}
              } catch { return {} }
            }

            // Build user info (query by userId so we get 888888's data when in browser)
            let user = {
              tg_user_id: userId,
              cookie_id: null,
              traffic_source: 'Не определен',
              utm_params: {},
              referrer: null,
              first_visit_date: null
            }

            const { data: firstSession, error: fsErr } = await supabase
              .from('site_sessions')
              .select('cookie_id,tg_user_id,source,utm_params,referrer,session_start')
              .eq('tg_user_id', userId)
              .order('session_start', { ascending: true })
              .limit(1)

            if (!fsErr && firstSession && firstSession.length) {
              const row = firstSession[0]
              user.cookie_id = row.cookie_id ?? null
              user.traffic_source = row.source || user.traffic_source
              user.utm_params = safeParse(row.utm_params)
              user.referrer = row.referrer
              user.first_visit_date = row.session_start
            }

            // Journey: sessions and events
            const journey = {
              miniapp_opens: [],
              content_views: [],
              page_views: [],
              ai_interactions: [],
              diagnostics: [],
              game_actions: [],
              cta_clicks: [],
              content_actions: [],  // astrolabe_input, astrolabe_action (event_type 'content')
              alchemy_events: []    // alchemy_item_select, alchemy_interaction, snitch_action, crystal_action (event_type 'alchemy')
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
            {
              const q = supabase
                .from('site_sessions')
                .select('session_start,session_end,page_id,device_type,user_agent')
                .order('session_start', { ascending: false })
                .limit(200)

              q.eq('tg_user_id', userId)
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

            // helper to fetch events by type (and optionally event_name); respects selectedPeriod for time filter
            const fetchEvents = async (type, mapper = (r) => r, eventName = null) => {
              const q = supabase
                .from('site_events')
                .select('created_at,event_name,metadata,page,custom_data')
                .order('created_at', { ascending: false })
                .limit(200)

              q.eq('tg_user_id', userId)
              if (type) q.eq('event_type', type)
              if (eventName) q.eq('event_name', eventName)
              if (selectedPeriod !== 'all') q.gte('created_at', getStartDate(selectedPeriod))

              const { data, error } = await q
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

            const aiInteractionMapper = (r) => ({
              event_name: r.event_name,
              metadata: r.metadata,
              messages_count: (r.metadata && (() => { try { return JSON.parse(r.metadata).messages_count } catch { return 0 } })()) || 0,
              topics: (r.metadata && (() => { try { return JSON.parse(r.metadata).topics } catch { return [] } })()) || [],
              duration: (r.metadata && (() => { try { return JSON.parse(r.metadata).duration } catch { return 0 } })()) || 0,
              timestamp: r.created_at
            })
            journey.ai_interactions = await fetchEvents('ai_interaction', aiInteractionMapper)
            // Also fetch ai_chat_message events (logged with event_type 'ai', event_name 'ai_chat_message')
            const aiChatMessages = await fetchEvents('ai', aiInteractionMapper, 'ai_chat_message')
            journey.ai_interactions = [...(journey.ai_interactions || []), ...(aiChatMessages || [])]

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

            // event_type в БД — 'cta', event_name — 'cta_click'
            journey.cta_clicks = await fetchEvents('cta', (r) => {
              const meta = safeParse(r.metadata)
              const cd = r.custom_data ? (typeof r.custom_data === 'string' ? (r.custom_data ? JSON.parse(r.custom_data) : {}) : r.custom_data) : {}
              return {
                event_name: r.event_name,
                metadata: r.metadata,
                custom_data: cd,
                cta_text: meta.cta_text ?? meta.button_text ?? null,
                cta_location: meta.cta_location ?? null,
                previous_step: meta.previous_step ?? null,
                step_duration: meta.step_duration ?? 0,
                timestamp: r.created_at
              }
            }, 'cta_click')

            // page_view events (event_type 'visit', event_name 'page_view') — universal route tracking
            journey.page_views = await fetchEvents('visit', (r) => ({
              event_name: r.event_name,
              metadata: r.metadata,
              page: r.page ?? null,
              timestamp: r.created_at
            }), 'page_view')

            // content actions: astrolabe_input, astrolabe_action, section_view (event_type 'content')
            journey.content_actions = await fetchEvents('content', (r) => ({
              event_name: r.event_name,
              metadata: r.metadata,
              page: r.page ?? null,
              custom_data: r.custom_data ?? null,
              timestamp: r.created_at
            }))

            // alchemy events: alchemy_item_select, alchemy_interaction, snitch_action, crystal_action (event_type 'alchemy')
            journey.alchemy_events = await fetchEvents('alchemy', (r) => ({
              event_name: r.event_name,
              metadata: r.metadata,
              page: r.page ?? null,
              timestamp: r.created_at
            }))

            // Compute simple metrics (respect time filter)
            const totalSessionsQuery = supabase
              .from('site_sessions')
              .select('id', { count: 'exact' })
              .eq('tg_user_id', userId)
            if (selectedPeriod !== 'all') totalSessionsQuery.gte('session_start', startDate)
            const { data: totalSessionsData, error: tsErr } = await totalSessionsQuery

            const totalSessions = (totalSessionsData && totalSessionsData.length) || 0
            const diagnosticsQuery = supabase
              .from('site_events')
              .select('id')
              .eq('tg_user_id', userId)
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
              user_segments: userSegmentsRow,
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

        // Fallback: existing backend endpoints (use userId so we request 888888 when in browser)
        const response = await fetch(`/api/user/${userId}/personal-report`)

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

  // Human-readable: page paths → Emoji + Title (User Journey)
  const PAGE_LABELS = useMemo(() => ({
    '/home': '🏠 Главный экран',
    '/diagnostics': '🧬 Диагностика',
    '/profile': '👤 Профиль',
    '/funnel_diagram': '📊 Воронка',
    '/alchemy': '🧪 Алхимия',
    '/report': '📊 Персональный отчёт',
    '/portfolio': '📁 Портфолио',
    '/chat': '💬 Чат с ИИ-наставником'
  }), [])

  // section_view: section_id → Rich Label (зеркало, астролябия, диагностика, икигай, диалог — выделение + эмодзи)
  const SECTION_RICH_LABELS = useMemo(() => ({
    'alchemy-mirror': '🔮 Зеркало вечности',
    'alchemy-astrolabe': '🧭 Астролябия: Расчёт матрицы',
    'alchemy-ikigai': '🌸 Тест Икигай',
    'alchemy-tarot': '🃏 Таро',
    'alchemy-tests': '📝 Тесты',
    diagnostics: '🧬 Диагностика'
  }), [])

  const SECTION_ACTION_IDS = useMemo(() => Object.keys(SECTION_RICH_LABELS), [SECTION_RICH_LABELS])

  // Human-readable: event_name (and event_type) → Emoji + Title
  const EVENT_NAME_LABELS = useMemo(() => ({
    // event_name from DB
    mirror_usage: '🔮 Зеркало вечности (Использование)',
    ai_chat_message: '🤖 Диалог с ИИ',
    test_complete: '🏆 Результат теста',
    diagnostics_results_view: '🧬 Прошел диагностику',
    ikigai_results_view: '🌸 Прошел тест Икигай',
    astrolabe_input: '📅 Астролябия: Расчет матрицы',
    astrolabe_action: '📄 Астролябия: Действие',
    alchemy_item_select: '🃏 Алхимия: Выбор предмета',
    alchemy_interaction: '✨ Алхимия: Артефакт',
    snitch_action: '⚡ Снитч: Запуск игры',
    crystal_action: '🔮 Кристалл: Выбор теста',
    page_view: '👁️ Просмотр страницы',
    content_view: '👁️ Просмотр контента',
    // event_type fallbacks
    miniapp_open: '📱 Открытие MiniApp',
    ai_interaction: '🤖 Диалог с ИИ',
    diagnostic: '🧪 Диагностика',
    game_action: '🎮 Игровое действие',
    cta_click: '🎯 Клик по кнопке'
  }), [])

  // Path → display label (alias for compatibility)
  const PAGE_VIEW_LABELS = PAGE_LABELS

  // content_id (e.g. personreport) → path for PAGE_LABELS lookup when page is missing
  const CONTENT_ID_TO_PATH = useMemo(() => ({
    personreport: '/report',
    report: '/report',
    diagnostics: '/diagnostics',
    profile: '/profile',
    alchemy: '/alchemy',
    home: '/home',
    funnel_diagram: '/funnel_diagram',
    portfolio: '/portfolio',
    chat: '/chat',
    main: '/home'
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
  // Иерархия: custom_data.label (из sitemap/custom_label/кнопки) → cta_text → button_text → cta_location → никогда не прочерк
  const getCtaLabel = useCallback((c) => {
    let data = {}
    try {
      const cd = c?.custom_data
      data = typeof cd === 'string' ? (cd ? JSON.parse(cd) : {}) : (cd || {})
    } catch (_) {}
    const fromData = (data?.label ?? data?.section_label)?.trim()
    if (fromData) return fromData
    const fromMeta = (c?.cta_text ?? c?.button_text)?.trim()
    if (fromMeta) return fromMeta
    if (c?.cta_location != null && LOCATION_NAMES[c.cta_location]) return LOCATION_NAMES[c.cta_location]
    if (c?.cta_location) return String(c.cta_location)
    return 'Связаться в Telegram'
  }, [LOCATION_NAMES])
  const getCtaLocationLabel = (v) => (v != null && LOCATION_NAMES[v]) ? LOCATION_NAMES[v] : (v || 'Не указано')
  const getPreviousStepLabel = (v) => (v != null && PREVIOUS_STEP_NAMES[v]) ? PREVIOUS_STEP_NAMES[v] : (v || '—')
  // For page_view events: path → label; при отсутствии в PAGE_VIEW_LABELS — ищем в sitemapData (напр. /funnel → 📉 Воронка)
  const getPageViewLabel = useCallback((page) => {
    if (page == null) return '—'
    if (PAGE_VIEW_LABELS[page]) return PAGE_VIEW_LABELS[page]
    if (typeof page === 'string' && page.startsWith('/block/')) {
      const blockId = page.replace('/block/', '')
      return PAGE_NAMES[blockId] ?? blockId
    }
    const node = findSectionByPath(page)
    if (node) {
      const icon = node.icon ?? ''
      return icon ? `${icon} ${node.label}` : node.label
    }
    return page
  }, [PAGE_VIEW_LABELS, PAGE_NAMES])

  // Normalize page/key for same-place comparison (e.g. /report vs personreport)
  const normalizePageKey = (p) => (p == null ? '' : String(p).replace(/^\//, '').toLowerCase())

  // Build flat timeline: newest first, no x25 grouping, dedupe within 1–2 sec, session dividers >30 min
  const activityPathTimeline = useMemo(() => {
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
    j.page_views?.forEach(pv => push('page_view', pv.timestamp, pv))
    j.content_actions?.forEach(a => push(a.event_name || 'content_action', a.timestamp, a))
    j.alchemy_events?.forEach(a => push(a.event_name || 'alchemy_event', a.timestamp, a))
    j.ai_interactions?.forEach(a => push('ai_interaction', a.timestamp, a))
    j.diagnostics?.forEach(d => push('diagnostic', d.timestamp, d))
    j.game_actions?.forEach(g => push('game_action', g.timestamp, g))
    j.cta_clicks?.forEach(c => push('cta_click', c.timestamp, c))

    // Sort newest first (chronological timeline: newest at top, oldest at bottom)
    items.sort((a, b) => b.ts - a.ts)

    // Priority events: ALWAYS standalone, never collapsed (excluded from grouping)
    const PRIORITY_EVENT_NAMES = ['ai_chat_message', 'test_complete', 'diagnostics_results_view', 'ikigai_results_view', 'astrolabe_input', 'astrolabe_action', 'alchemy_item_select', 'alchemy_interaction', 'snitch_action', 'crystal_action']
    const SECTION_ACTION_IDS_SET = ['alchemy-mirror', 'alchemy-astrolabe', 'alchemy-ikigai', 'alchemy-tarot', 'alchemy-tests', 'diagnostics']
    const isPriorityEvent = (item) => {
      const name = item.raw?.event_name
      if (name && PRIORITY_EVENT_NAMES.includes(name)) return true
      if (name === 'section_view') {
        try {
          const cd = item.raw?.custom_data
          const data = typeof cd === 'string' ? (cd ? JSON.parse(cd) : {}) : (cd || {})
          const sid = data?.section_id ?? data?.section
          return sid && SECTION_ACTION_IDS_SET.includes(sid)
        } catch (_) {}
      }
      return false
    }
    // Get page key for grouping. Only page_view events are grouped by time interval; all others stay individual.
    const getPageKey = (item) => {
      if (isPriorityEvent(item)) return null
      if (item.type === 'page_view') return normalizePageKey(item.raw?.page) || normalizePageKey(item.raw?.content_id) || 'pv'
      // content_view and all other types: do not group (only page_view grouped)
      return null
    }

    // Grouping: only page_view within 60 sec → one row. All other events appear as individual Action Cards.
    const GROUP_WINDOW_MS = 60 * 1000
    const grouped = []
    let i = 0
    while (i < items.length) {
      const item = items[i]
      const pageKey = getPageKey(item)
      const isNav = item.type === 'page_view' && !isPriorityEvent(item)
      if (pageKey && isNav) {
        let group = [item]
        let tsFirst = item.ts
        let tsLast = item.ts
        while (i + 1 < items.length) {
          const next = items[i + 1]
          if (getPageKey(next) !== pageKey) break
          const gap = tsFirst - next.ts
          if (gap > GROUP_WINDOW_MS) break
          group.push(next)
          tsFirst = Math.max(tsFirst, next.ts)
          tsLast = Math.min(tsLast, next.ts)
          i++
        }
        grouped.push({
          type: item.type,
          raw: group[0].raw,
          ts: group[0].ts,
          tsFirst,
          tsLast,
          grouped: group.length > 1 ? group : undefined
        })
      } else {
        grouped.push({ ...item, tsFirst: item.ts, tsLast: item.ts })
      }
      i++
    }

    // Insert session dividers: if gap between consecutive events > 30 min
    const SESSION_GAP_MS = 30 * 60 * 1000
    const withDividers = []
    for (let k = 0; k < grouped.length; k++) {
      const curr = grouped[k]
      const next = grouped[k + 1]
      withDividers.push(curr)
      if (next && curr.type !== 'session_divider' && next.type !== 'session_divider') {
        const currTs = curr.tsLast ?? curr.ts
        const nextTs = next.tsFirst ?? next.ts
        const gap = currTs - nextTs
        if (gap > SESSION_GAP_MS) {
          withDividers.push({ type: 'session_divider', ts: nextTs, label: formatDateTime(next.raw?.timestamp ?? nextTs) })
        }
      }
    }
    return withDividers.filter((e) => e.type === 'session_divider' || !HIDDEN_EVENT_NAMES.includes(e.raw?.event_name))
  }, [reportData])

  // Human-readable event title: page_view/content_view MUST show page name (PAGE_LABELS), never generic "Просмотр страницы"
  const getEventDisplayTitle = useCallback((entry) => {
    if (entry.type === 'session_divider') return null
    const raw = entry.raw || {}
    const eventName = raw.event_name
    // Action events (реальное использование): ярко, с иконкой и huntStage
    const actionEventNames = ['test_complete', 'diagnostics_results_view', 'ikigai_results_view', 'astrolabe_input', 'astrolabe_action', 'alchemy_item_select', 'alchemy_interaction', 'snitch_action', 'crystal_action', 'mirror_usage']
    if (eventName && actionEventNames.includes(eventName)) {
      if (eventName === 'astrolabe_action') {
        const meta = safeParseMeta(raw.metadata)
        if (meta?.action === 'pdf_download') return '📄 Скачан PDF отчёт'
        return EVENT_NAME_LABELS[eventName] || eventName
      }
      return EVENT_NAME_LABELS[eventName] || eventName
    }
    if (entry.type === 'diagnostic' && eventName === 'test_complete') return EVENT_NAME_LABELS.test_complete
    if (eventName === 'diagnostics_results_view' || eventName === 'ikigai_results_view') return EVENT_NAME_LABELS[eventName]
    // ai_chat_message: conditional label by metadata.context (+ mirror_state if present)
    if (eventName === 'ai_chat_message' || entry.type === 'ai_interaction') {
      const meta = safeParseMeta(raw.metadata)
      const ctx = meta?.context
      const mirrorState = meta?.mirror_state
      const suffix = mirrorState != null ? ` (Сообщение №${mirrorState})` : ''
      if (ctx === 'user_profile') return `👤 Чат в профиле${suffix}`
      if (ctx === 'mirror_of_eternity') return `🔮 Зеркало вечности${suffix}`
      return EVENT_NAME_LABELS.ai_chat_message || EVENT_NAME_LABELS.ai_interaction || '🤖 Диалог с ИИ'
    }
    // Normalize home page to single label for deduplication
    const normalizeHomeLabel = (label) => {
      if (!label || label === '—') return label
      const textOnly = stripLeadingEmoji(label).trim()
      if (textOnly === 'Главный экран' || textOnly === 'Главная') return '🏠 Главная'
      return label
    }
    // section_view: только пассивный просмотр (скролл) — приоритет "(Просмотр)" для зеркала и т.п.
    if (entry.type === 'section_view') {
      const cd = raw.custom_data
      let data = {}
      try {
        data = typeof cd === 'string' ? (cd ? JSON.parse(cd) : {}) : (cd || {})
      } catch (_) {}
      const sectionId = data?.section_id ?? data?.section
      if (sectionId === 'alchemy-mirror') return '② 🔮 Разговор с Зеркалом (Просмотр)'
      if (sectionId && SECTION_RICH_LABELS[sectionId]) return `${SECTION_RICH_LABELS[sectionId]} (Просмотр)`
      const icon = data.section_icon ?? data.emoji ?? '⚙️'
      const sectionLabel = data.section_label ?? data.label ?? 'Раздел'
      const parentLabel = data.parent_label
      const labelsMatch = parentLabel && String(parentLabel).trim() === String(sectionLabel).trim()
      if (parentLabel && !labelsMatch) return `${icon} ${parentLabel} > ${sectionLabel} (Просмотр)`
      return `${icon} ${sectionLabel} (Просмотр)`
    }
    // page_view: always human-readable page name; unify "Главный экран" / "Главная" -> "🏠 Главная"
    if (entry.type === 'page_view') {
      const label = getPageViewLabel(raw.page)
      if (label && label !== '—') return normalizeHomeLabel(label)
      const pathFromId = raw.content_id && CONTENT_ID_TO_PATH[raw.content_id]
      if (pathFromId) return normalizeHomeLabel(PAGE_LABELS[pathFromId] || getPageViewLabel(pathFromId))
      return normalizeHomeLabel(PAGE_NAMES[raw.content_id] || raw.page || '—')
    }
    // content_view: always human-readable page/section name; unify home
    if (entry.type === 'content_view') {
      const byPath = getPageViewLabel(raw.page)
      if (byPath && byPath !== '—') return normalizeHomeLabel(byPath)
      const pathFromId = raw.content_id && CONTENT_ID_TO_PATH[raw.content_id]
      if (pathFromId) return normalizeHomeLabel(PAGE_LABELS[pathFromId] || getPageViewLabel(pathFromId))
      return normalizeHomeLabel(getSectionLabel(raw))
    }
    if (entry.type === 'miniapp_open') return (raw.page && PAGE_NAMES[raw.page]) ? `📱 ${PAGE_NAMES[raw.page]}` : '📱 Открытие MiniApp'
    if (entry.type === 'cta_click') {
      const ctaLabel = getCtaLabel(raw)
      const meta = safeParseMeta(raw.metadata)
      const isTgLink = meta?.cta_opens_tg === true || meta?.opens_tg === true
      const icon = isTgLink ? '📲' : '🎯'
      return ctaLabel ? `${icon} ${ctaLabel}` : '🎯 Клик'
    }
    return EVENT_NAME_LABELS[entry.type] || entry.type
  }, [EVENT_NAME_LABELS, PAGE_NAMES, PAGE_LABELS, CONTENT_ID_TO_PATH, SECTION_RICH_LABELS, getSectionLabel, getCtaLabel, getPageViewLabel])

  // Ключ "места" для умной дедупликации: section_id или нормализованный path (единый ключ, чтобы page_view /funnel и section_view funnel считались одним местом)
  const getSemanticPlaceKey = useCallback((entry) => {
    if (entry.type === 'section_view' && entry.raw?.custom_data) {
      try {
        const data = typeof entry.raw.custom_data === 'string' ? JSON.parse(entry.raw.custom_data) : entry.raw.custom_data
        const sid = data?.section_id ?? data?.section
        if (sid) return normalizePageKey(sid.replace(/^section:/, ''))
      } catch (_) {}
    }
    const page = entry.raw?.page ?? entry.raw?.content_id
    if (page != null) return normalizePageKey(String(page))
    return null
  }, [])

  const DEDUPE_WINDOW_MS = 8000

  // Production-ready: strict dedupe; section_view + использование в одном месте/времени → показываем только использование (приоритет)
  const visibleTimeline = useMemo(() => {
    const INTERACTION_EVENT_NAMES = ['mirror_usage', 'ai_chat_message', 'astrolabe_input', 'astrolabe_action', 'alchemy_item_select', 'alchemy_interaction', 'snitch_action', 'crystal_action', 'test_complete', 'diagnostics_results_view', 'ikigai_results_view']
    const isInteractionEvent = (e) => e?.type !== 'session_divider' && (INTERACTION_EVENT_NAMES.includes(e?.raw?.event_name) || e?.type === 'ai_interaction' || (e?.type === 'diagnostic' && ['test_complete', 'diagnostics_results_view', 'ikigai_results_view'].includes(e?.raw?.event_name)))

    const out = []
    const DEDUPE_CTA_MS = 5000
    const DEDUPE_SECTION_VS_USAGE_MS = 15000
    for (let i = 0; i < activityPathTimeline.length; i++) {
      const entry = activityPathTimeline[i]
      if (entry.type === 'session_divider') {
        out.push({ ...entry, sameMinuteAsPrevious: false })
        continue
      }
      if (HIDDEN_EVENT_NAMES.includes(entry.raw?.event_name)) continue
      const displayTitle = getEventDisplayTitle(entry)
      const prev = out[out.length - 1]
      const placeKey = getSemanticPlaceKey(entry)

      // Если текущее — cta_click, а предыдущее — page_view, то же место и близко по времени: убираем page_view, оставляем только cta_click
      if (entry.type === 'cta_click' && prev && prev.type !== 'session_divider' && prev.type === 'page_view' && placeKey) {
        const prevKey = getSemanticPlaceKey(prev)
        const timeGap = prev.ts != null && entry.ts != null ? Math.abs(prev.ts - entry.ts) : Infinity
        if (prevKey === placeKey && timeGap <= DEDUPE_CTA_MS) {
          out.pop()
        }
      }

      // Схлопывание в пользу использования: если текущее — section_view, а предыдущее (новее по времени) — взаимодействие (mirror_usage, ai_chat_message и т.д.), то же место и близко по времени — не показываем section_view (оставляем факт использования)
      if (entry.type === 'section_view' && prev && isInteractionEvent(prev) && placeKey) {
        const prevKey = getSemanticPlaceKey(prev)
        const timeGap = prev.ts != null && entry.ts != null ? Math.abs(prev.ts - entry.ts) : Infinity
        if (prevKey === placeKey && timeGap <= DEDUPE_SECTION_VS_USAGE_MS) continue
      }

      // Клик «Начать диагностику» поглощает следующий просмотр диагностики: если текущее — section_view (диагностика), а предыдущее — cta_click «Начать диагностику», то же место и близко по времени — скрываем section_view
      if (entry.type === 'section_view' && prev?.type === 'cta_click' && placeKey) {
        const prevKey = getSemanticPlaceKey(prev)
        const timeGap = prev.ts != null && entry.ts != null ? Math.abs(prev.ts - entry.ts) : Infinity
        const prevLabel = getCtaLabel(prev.raw)
        const isDiagnosticsStart = prev.raw?.cta_type === 'diagnostics_start' || (prevLabel && (String(prevLabel).includes('Начать диагностику') || String(prevLabel).includes('Экспресс-диагностика')))
        if (prevKey === placeKey && timeGap <= DEDUPE_CTA_MS && isDiagnosticsStart) continue
      }

      // Умная дедупликация: тот же section_id или путь, между событиями < 5–10 сек — не рисуем дубль
      if (prev && prev.type !== 'session_divider' && placeKey) {
        const prevKey = getSemanticPlaceKey(prev)
        const timeGap = prev.ts != null && entry.ts != null ? Math.abs(prev.ts - entry.ts) : Infinity
        if (prevKey === placeKey && timeGap <= DEDUPE_WINDOW_MS) continue
      }

      const sameAsPrev = prev && prev.type !== 'session_divider' &&
        entry.raw?.event_name === prev.raw?.event_name &&
        getEventDisplayTitle(prev) === displayTitle
      if (sameAsPrev) continue

      // Скрытие технических логов: если текущая запись — сырой path (👁 /funnel), а следующая в ленте уже обогащённая (📉 Воронка), не рисуем техническую
      const isTechnicalPageView = (e) =>
        e?.type === 'page_view' && e?.raw?.page && getEventDisplayTitle(e) === e.raw.page
      if (isTechnicalPageView(entry) && prev && getEventDisplayTitle(prev) === getPageViewLabel(entry.raw.page))
        continue

      const prevTs = prev?.ts != null ? prev.ts : null
      const sameMinute = prev && prev.type !== 'session_divider' && entry.type !== 'session_divider' &&
        prevTs != null && Math.floor(prevTs / 60000) === Math.floor(entry.ts / 60000)
      out.push({ ...entry, sameMinuteAsPrevious: !!sameMinute })
    }
    // 4. Удаление дубликатов: при cta_click ④📲 не показывать событие 🧬 Диагностика в ту же секунду
    const isCtaHunt4 = (e) => e?.type === 'cta_click' && (() => { try { const d = typeof e?.raw?.custom_data === 'string' ? JSON.parse(e?.raw?.custom_data || '{}') : (e?.raw?.custom_data || {}); return d?.huntStage === 4 } catch { return false } })()
    const isDiagnosticsEvent = (e) => {
      if (e?.type === 'session_divider') return false
      if (e?.type === 'diagnostic') return true
      if (e?.type === 'section_view' && e?.raw?.custom_data) {
        try { const d = typeof e.raw.custom_data === 'string' ? JSON.parse(e.raw.custom_data || '{}') : e.raw.custom_data; return (d?.section_id ?? d?.section) === 'diagnostics' } catch { return false }
      }
      return false
    }
    const getSec = (ts) => (ts != null ? Math.floor(ts / 1000) : null)
    const filtered = out.filter((entry) => {
      if (entry.type === 'session_divider') return true
      if (!isDiagnosticsEvent(entry)) return true
      const entrySec = getSec(entry.ts)
      const hasCtaHunt4SameSec = out.some((o) => o.type !== 'session_divider' && isCtaHunt4(o) && getSec(o.ts) === entrySec)
      return !hasCtaHunt4SameSec
    })
    return filtered
  }, [activityPathTimeline, getEventDisplayTitle, getSemanticPlaceKey, getPageViewLabel, getCtaLabel])

  // 2. Collapsible: section_view и page_view — компактные строки без деталей; детали только у Interaction
  const INTERACTION_EVENT_NAMES = useMemo(() => ['mirror_usage', 'ai_chat_message', 'test_complete', 'diagnostics_results_view', 'ikigai_results_view', 'astrolabe_input', 'astrolabe_action', 'alchemy_item_select', 'alchemy_interaction', 'snitch_action', 'crystal_action'], [])
  const enrichedTimeline = useMemo(() => {
    return visibleTimeline.map((e) => {
      const isView = e.type === 'section_view' || e.type === 'page_view' || e.type === 'content_view'
      const isInteraction = INTERACTION_EVENT_NAMES.includes(e?.raw?.event_name) || e?.type === 'ai_interaction' || (e?.type === 'diagnostic' && ['test_complete', 'diagnostics_results_view', 'ikigai_results_view'].includes(e?.raw?.event_name))
      const hasExpandableContent = isInteraction || (e?.grouped?.length > 0)
      const showExpandableDetails = !isView && hasExpandableContent
      return { ...e, showExpandableDetails }
    })
  }, [visibleTimeline, INTERACTION_EVENT_NAMES])

  // huntStage из custom_data для индикатора уровня Ханта (② ③ ④)
  const getHuntStageFromEntry = useCallback((entry) => {
    if (entry.type === 'session_divider') return null
    const cd = entry.raw?.custom_data
    if (cd == null) return null
    try {
      const data = typeof cd === 'string' ? (cd ? JSON.parse(cd) : {}) : cd
      const stage = data?.huntStage
      return stage >= 1 && stage <= 4 ? stage : null
    } catch (_) { return null }
  }, [])

  const getEventIcon = useCallback((entry) => {
    if (entry.type === 'session_divider') return '—'
    const raw = entry.raw || {}
    // section_view: приоритет SECTION_RICH_LABELS (эмодзи из rich label), затем section_icon
    if (entry.type === 'section_view' && raw.custom_data) {
      try {
        const data = typeof raw.custom_data === 'string' ? JSON.parse(raw.custom_data) : raw.custom_data
        const sectionId = data?.section_id ?? data?.section
        if (sectionId && SECTION_RICH_LABELS[sectionId]) {
          const label = SECTION_RICH_LABELS[sectionId]
          const emoji = label?.match(/^\p{Emoji}/u)?.[0]
          if (emoji) return emoji
        }
        const icon = data?.section_icon ?? data?.emoji
        if (icon) return icon
      } catch (_) {}
    }
    const eventName = raw.event_name
    const label = eventName && EVENT_NAME_LABELS[eventName]
    if (label && /^\p{Emoji}/u.test(label)) return label.match(/^\p{Emoji}\s*/u)?.[0]?.trim() || label.slice(0, 1) || '•'
    const typeLabel = EVENT_NAME_LABELS[entry.type] || ''
    const emoji = typeLabel && typeLabel.length >= 2 ? typeLabel.slice(0, 2) : '•'
    return emoji || '•'
  }, [EVENT_NAME_LABELS, SECTION_RICH_LABELS])

  // Content details block under title: test_complete, ai_chat_message, astrolabe_input, snitch/crystal (short preview)
  const getEventContentDetails = useCallback((entry) => {
    if (entry.type === 'session_divider') return null
    const raw = entry.raw || {}
    const meta = safeParseMeta(raw.metadata)
    const eventName = raw.event_name
    if (['test_complete', 'diagnostics_results_view', 'ikigai_results_view'].includes(eventName) || (entry.type === 'diagnostic' && (['test_complete', 'diagnostics_results_view', 'ikigai_results_view'].includes(raw.event_name) || meta.total_score != null))) {
      const score = meta.total_score ?? '—'
      const cat = meta.result_category
      const catStr = cat != null && String(cat).trim() !== '' ? cat : null
      return catStr ? `Результат: ${score} (${catStr})` : `Результат: ${score}`
    }
    if (eventName === 'ai_chat_message' || entry.type === 'ai_interaction') {
      const msg = meta.user_message ?? meta.last_message ?? meta.message ?? (Array.isArray(meta.messages) ? meta.messages[0] : null)
      const str = typeof msg === 'string' ? msg : (msg?.text ?? msg?.content ?? '')
      if (str) return `Диалог: ${str.length > 50 ? str.slice(0, 50) + '…' : str}`
      if (meta.messages_count) return `Диалог: ${meta.messages_count} сообщ.`
      return null
    }
    if (eventName === 'astrolabe_input') {
      const date = meta.birth_date ?? meta.date ?? '—'
      const city = meta.birth_city ?? meta.city ?? '—'
      return `Ввод: ${date}, ${city}`
    }
    if (eventName === 'snitch_action') return meta.game_name ? `Игра: ${meta.game_name}` : null
    if (eventName === 'crystal_action') return meta.test_name ? `Тест: ${meta.test_name}` : null
    if (eventName === 'alchemy_item_select') return meta.name ? `${meta.type || 'Предмет'}: ${meta.name}` : null
    if (eventName === 'alchemy_interaction') return meta.element ? `Элемент: ${meta.element}` : null
    if (eventName === 'astrolabe_action') return meta.action ? `Действие: ${meta.action}` : null
    // section_view для приоритетных инструментов (зеркало, астролябия, икигай, диагностика, таро, тесты)
    if (entry.type === 'section_view') {
      try {
        const cd = entry.raw?.custom_data
        const data = typeof cd === 'string' ? (cd ? JSON.parse(cd) : {}) : (cd || {})
        const sectionId = data?.section_id ?? data?.section
        const sectionLabel = data?.section_label ?? data?.label
        if (sectionId && SECTION_ACTION_IDS.includes(sectionId) && sectionLabel)
          return `Просмотр: ${sectionLabel}`
      } catch (_) {}
    }
    return null
  }, [SECTION_ACTION_IDS])

  const isActionEvent = useCallback((entry) => {
    const name = entry.raw?.event_name
    const actionNames = ['test_complete', 'diagnostics_results_view', 'ikigai_results_view', 'ai_chat_message', 'astrolabe_input', 'astrolabe_action', 'alchemy_item_select', 'alchemy_interaction', 'snitch_action', 'crystal_action']
    if (name && actionNames.includes(name)) return true
    if (entry.type === 'diagnostic' || entry.type === 'ai_interaction') return true
    if (entry.type === 'section_view') {
      try {
        const cd = entry.raw?.custom_data
        const data = typeof cd === 'string' ? (cd ? JSON.parse(cd) : {}) : (cd || {})
        const sectionId = data?.section_id ?? data?.section
        return sectionId && SECTION_ACTION_IDS.includes(sectionId)
      } catch (_) {}
    }
    return false
  }, [SECTION_ACTION_IDS])

  // Extract user_message, ai_response, context for ai_chat_message (chat bubble preview). Always return data for ai_chat_message so the container renders.
  const getAiChatPreview = useCallback((entry) => {
    if (entry.type === 'session_divider') return null
    const raw = entry.raw || {}
    const eventName = raw.event_name
    if (eventName !== 'ai_chat_message' && entry.type !== 'ai_interaction') return null
    const meta = safeParseMeta(raw.metadata)
    const userMessage = meta?.user_message ?? meta?.last_message ?? meta?.message
    const aiResponse = meta?.ai_response ?? meta?.ai_message ?? meta?.response
    const userStr = typeof userMessage === 'string' ? userMessage : (userMessage?.text ?? userMessage?.content ?? '')
    const aiStr = typeof aiResponse === 'string' ? aiResponse : (aiResponse?.text ?? aiResponse?.content ?? '')
    return { user_message: userStr || null, ai_response: aiStr || null, context: meta?.context }
  }, [])

  const CHAT_PREVIEW_MAX_LEN = 180

  const formatTimeOnly = (dateString) => {
    if (!dateString) return '—'
    try {
      const d = new Date(dateString)
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    } catch { return String(dateString) }
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
        onAlchemyClick={onAlchemyClick}
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
                    <span>{reportData?.user?.utm_params && Object.keys(reportData.user.utm_params).length > 0
                      ? Object.entries(reportData.user.utm_params).map(([k, v]) => `${k}=${v}`).join(', ')
                      : 'Отсутствуют'}</span>
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
                {enrichedTimeline.length > 0 && (
                  <div className="journey-timeline">
                    <h4 className="journey-timeline-title">Маршрут активности</h4>
                    <ul className="journey-timeline-list" aria-label="Хронология событий">
                      {enrichedTimeline.map((entry, index) => {
                        if (entry.type === 'session_divider') {
                          return (
                            <li key={`divider-${index}`} className="journey-session-divider" role="separator">
                              <span className="journey-session-divider-line" />
                              <span className="journey-session-divider-label">Новая сессия: {entry.label}</span>
                              <span className="journey-session-divider-line" />
                            </li>
                          )
                        }
                        const titleFull = getEventDisplayTitle(entry)
                        // If title already has an emoji, use it as the icon and show only text (no double emoji)
                        const hasLeadingEmoji = titleFull && /\p{Emoji}/u.test(titleFull)
                        const icon = hasLeadingEmoji
                          ? (titleFull.match(/^\s*(\p{Emoji}\s*)/u)?.[1]?.trim() || getEventIcon(entry))
                          : getEventIcon(entry)
                        const title = hasLeadingEmoji ? (stripLeadingEmoji(titleFull) || titleFull) : titleFull
                        const tsFirst = entry.tsFirst ?? entry.raw?.timestamp ?? entry.ts
                        const tsLast = entry.tsLast ?? entry.ts
                        const showTimeRange = entry.tsFirst != null && entry.tsLast != null && entry.tsFirst !== entry.tsLast
                        const timeDisplay = showTimeRange
                          ? `${formatTimeOnly(tsFirst)} – ${formatTimeOnly(tsLast)}`
                          : formatDateTime(tsFirst)
                        const sameMinuteAsPrevious = entry.sameMinuteAsPrevious === true
                        const contentDetails = getEventContentDetails(entry)
                        const chatPreview = getAiChatPreview(entry)
                        const actionEvent = isActionEvent(entry)
                        const secondary = !contentDetails && !chatPreview && (entry.type === 'miniapp_open' ? (entry.raw?.device_type || entry.raw?.device || null) : null)
                        const truncate = (s, max) => (s?.length > max ? s.slice(0, max) + '…' : s ?? '')
                        const tinySummary = chatPreview
                          ? (chatPreview.user_message ? truncate(chatPreview.user_message, 40) : (chatPreview.ai_response ? truncate(chatPreview.ai_response, 40) : 'Диалог с ИИ'))
                          : (contentDetails || secondary || null)
                        const isExpanded = expandedRow === index
                        const toggleExpanded = () => setExpandedRow((prev) => (prev === index ? null : index))
                        const alchemyEventNames = ['alchemy_item_select', 'alchemy_interaction', 'snitch_action', 'crystal_action']
                        let isAlchemyEvent = alchemyEventNames.includes(entry.raw?.event_name)
                        if (!isAlchemyEvent && entry.type === 'section_view' && entry.raw?.custom_data) {
                          try {
                            const cd = entry.raw.custom_data
                            const data = typeof cd === 'string' ? (cd ? JSON.parse(cd) : {}) : (cd || {})
                            const sid = data?.section_id ?? data?.section
                            isAlchemyEvent = sid && sid.startsWith('alchemy-')
                          } catch (_) {}
                        }
                        const huntStage = getHuntStageFromEntry(entry)
                        const isStage4Conversion = huntStage === 4 && entry.type === 'cta_click'
                        const huntBadge = huntStage != null ? (
                          <span className="journey-event-hunt-badge" title={`Уровень Ханта: ${huntStage}`} aria-hidden>
                            {[null, '①', '②', '③', '④'][huntStage] ?? `[H${huntStage}]`}
                          </span>
                        ) : null
                        const isCtaClick = entry.type === 'cta_click'
                        const isSectionView = entry.type === 'section_view'
                        const showExpandableDetails = entry.showExpandableDetails !== false
                        const RowWrapper = showExpandableDetails ? 'button' : 'div'
                        const rowProps = showExpandableDetails
                          ? { type: 'button', onClick: toggleExpanded, 'aria-expanded': isExpanded, 'aria-controls': `event-details-${index}` }
                          : {}
                        return (
                          <li
                            key={`${entry.type}-${entry.ts}-${index}`}
                            className={`journey-event-card ${actionEvent ? 'journey-event-card--action' : 'journey-event-card--nav'} ${isAlchemyEvent ? 'journey-event-card--alchemy' : ''} ${isCtaClick ? 'journey-event-card--cta' : ''} ${isSectionView ? 'journey-event-card--section-view' : ''} ${isStage4Conversion ? 'journey-event-card--stage4' : ''}`}
                          >
                            <RowWrapper
                              {...rowProps}
                              id={showExpandableDetails ? `event-row-${index}` : undefined}
                              className={`event-row ${entry.type === 'page_view' ? 'event-row--nav' : ''} ${isCtaClick ? 'event-row--cta' : ''} ${isSectionView ? 'event-row--section-view' : ''} ${isStage4Conversion ? 'event-row--stage4' : ''} ${!showExpandableDetails ? 'event-row--compact' : ''}`}
                            >
                              <div className="journey-event-left">
                                {sameMinuteAsPrevious ? (
                                  <span className="journey-event-time-connector" aria-hidden>·</span>
                                ) : (
                                  <span className="journey-event-time">{timeDisplay}</span>
                                )}
                                {huntBadge}
                                <span className="journey-event-icon" aria-hidden>{icon}</span>
                              </div>
                              <div className="journey-event-center">
                                <span className="journey-event-title">{title}</span>
                                {tinySummary && (
                                  <span className="event-row-summary">{tinySummary}</span>
                                )}
                              </div>
                              <div className="journey-event-right">
                                {secondary && !tinySummary && <span className="journey-event-secondary">{secondary}</span>}
                                {showExpandableDetails && <span className={`event-row-chevron ${isExpanded ? 'expanded' : ''}`} aria-hidden>▼</span>}
                              </div>
                            </RowWrapper>
                            {showExpandableDetails && (
                            <div
                              id={`event-details-${index}`}
                              className={`event-details-expanded ${isExpanded ? 'event-details-expanded--open' : ''}`}
                              role="region"
                              aria-labelledby={`event-row-${index}`}
                              aria-hidden={!isExpanded}
                            >
                              {isExpanded && (
                                <>
                                  {(entry.raw?.event_name === 'ai_chat_message' || entry.type === 'ai_interaction') && chatPreview && (
                                    <div className="event-details-content event-details-chat">
                                      <h5 className="event-details-heading">Полный диалог</h5>
                                      {chatPreview.user_message && (
                                        <div className="chat-bubble chat-bubble-user">
                                          <span className="chat-bubble-label">Вы:</span>
                                          <p className="chat-bubble-text">{chatPreview.user_message}</p>
                                        </div>
                                      )}
                                      {chatPreview.ai_response && (
                                        <div className="chat-bubble chat-bubble-ai">
                                          <span className="chat-bubble-label">ИИ:</span>
                                          <p className="chat-bubble-text">{chatPreview.ai_response}</p>
                                        </div>
                                      )}
                                      {!chatPreview.user_message && !chatPreview.ai_response && (
                                        <p className="chat-preview-empty">Нет текста сообщений</p>
                                      )}
                                    </div>
                                  )}
                                  {['test_complete', 'diagnostics_results_view', 'ikigai_results_view'].includes(entry.raw?.event_name) && entry.type === 'diagnostic' && (() => {
                                    const meta = safeParseMeta(entry.raw?.metadata)
                                    const critical = meta.critical_zones ?? []
                                    const unstable = meta.unstable_zones ?? []
                                    const strong = meta.strong_sides ?? []
                                    return (
                                      <div className="event-details-content event-details-test">
                                        <h5 className="event-details-heading">Результаты теста</h5>
                                        <dl className="event-details-dl">
                                          <dt>Балл</dt><dd>{meta.total_score ?? '—'}</dd>
                                          <dt>Категория</dt><dd>{meta.result_category ?? '—'}</dd>
                                          {meta.test_name && <><dt>Тест</dt><dd>{meta.test_name}</dd></>}
                                        </dl>
                                        {(critical.length > 0 || unstable.length > 0 || strong.length > 0) && (
                                          <div className="event-details-diagnostic-report">
                                            {critical.length > 0 && (
                                              <div className="diagnostic-zone diagnostic-zone--critical">
                                                <h6 className="diagnostic-zone-title">Критические зоны</h6>
                                                <p className="diagnostic-zone-desc">Этапы, блокирующие рост</p>
                                                <ul className="diagnostic-zone-list">
                                                  {critical.map((z, i) => (
                                                    <li key={i}>{typeof z === 'object' && z?.name ? z.name : z}</li>
                                                  ))}
                                                </ul>
                                              </div>
                                            )}
                                            {unstable.length > 0 && (
                                              <div className="diagnostic-zone diagnostic-zone--unstable">
                                                <h6 className="diagnostic-zone-title">Нестабильные этапы</h6>
                                                <ul className="diagnostic-zone-list">
                                                  {unstable.map((z, i) => (
                                                    <li key={i}>{typeof z === 'object' && z?.name ? z.name : z}</li>
                                                  ))}
                                                </ul>
                                              </div>
                                            )}
                                            {strong.length > 0 && (
                                              <div className="diagnostic-zone diagnostic-zone--strong">
                                                <h6 className="diagnostic-zone-title">Сильные стороны</h6>
                                                <ul className="diagnostic-zone-list">
                                                  {strong.map((z, i) => (
                                                    <li key={i}>{typeof z === 'object' && z?.name ? z.name : z}</li>
                                                  ))}
                                                </ul>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })()}
                                  {entry.raw?.event_name === 'astrolabe_input' && (() => {
                                    const meta = safeParseMeta(entry.raw?.metadata)
                                    return (
                                      <div className="event-details-content event-details-astrolabe">
                                        <h5 className="event-details-heading">Данные Астролябии</h5>
                                        <div className="astrolabe-cards">
                                          <div className="astrolabe-card"><span className="astrolabe-label">Дата рождения</span><span className="astrolabe-value">{meta.birth_date ?? meta.date ?? '—'}</span></div>
                                          <div className="astrolabe-card"><span className="astrolabe-label">Время</span><span className="astrolabe-value">{meta.birth_time ?? meta.time ?? '—'}</span></div>
                                          <div className="astrolabe-card"><span className="astrolabe-label">Город</span><span className="astrolabe-value">{meta.birth_city ?? meta.city ?? '—'}</span></div>
                                        </div>
                                      </div>
                                    )
                                  })()}
                                  {entry.raw?.event_name === 'alchemy_item_select' && (() => {
                                    const meta = safeParseMeta(entry.raw?.metadata)
                                    const typeLabel = meta.type ? `${meta.type}: ` : ''
                                    const name = meta.name ?? '—'
                                    const meaning = meta.meaning ?? ''
                                    return (
                                      <div className="event-details-content event-details-alchemy-item">
                                        <h5 className="event-details-heading">Выбор предмета</h5>
                                        <p className="event-details-alchemy-type-name"><strong>{typeLabel}{name}</strong></p>
                                        {meaning && <p className="event-details-metadata-text">{meaning}</p>}
                                      </div>
                                    )
                                  })()}
                                  {entry.raw?.event_name === 'alchemy_interaction' && (() => {
                                    const meta = safeParseMeta(entry.raw?.metadata)
                                    const elementLabels = { Candle: 'Свеча', Chalice: 'Чаша', Hourglass: 'Песочные часы' }
                                    const element = meta.element ? (elementLabels[meta.element] || meta.element) : '—'
                                    return (
                                      <div className="event-details-content event-details-alchemy-interaction">
                                        <h5 className="event-details-heading">Артефакт</h5>
                                        <p className="event-details-metadata-text"><strong>Элемент:</strong> {element}</p>
                                      </div>
                                    )
                                  })()}
                                  {(entry.raw?.event_name === 'snitch_action' || entry.raw?.event_name === 'crystal_action') && (() => {
                                    const meta = safeParseMeta(entry.raw?.metadata)
                                    const label = entry.raw?.event_name === 'snitch_action' ? 'Игра' : 'Тест'
                                    const value = entry.raw?.event_name === 'snitch_action' ? (meta.game_name ?? '—') : (meta.test_name ?? '—')
                                    return (
                                      <div className="event-details-content event-details-game-test">
                                        <h5 className="event-details-heading">{entry.raw?.event_name === 'snitch_action' ? 'Запуск игры' : 'Выбор теста'}</h5>
                                        <p className="event-details-metadata-text"><strong>{label}:</strong> {value}</p>
                                      </div>
                                    )
                                  })()}
                                  {entry.raw?.event_name === 'astrolabe_action' && (() => {
                                    const meta = safeParseMeta(entry.raw?.metadata)
                                    return (
                                      <div className="event-details-content event-details-astrolabe-action">
                                        <h5 className="event-details-heading">Действие Астролябии</h5>
                                        <p className="event-details-metadata-text"><strong>Действие:</strong> {meta.action ?? '—'}</p>
                                      </div>
                                    )
                                  })()}
                                  {entry.grouped && entry.grouped.length > 0 && (entry.type === 'page_view' || entry.type === 'content_view') && (
                                    <div className="event-details-content event-details-group">
                                      <h5 className="event-details-heading">Визиты в группе ({entry.grouped.length})</h5>
                                      <ul className="event-details-visits">
                                        {entry.grouped.map((ev, i) => (
                                          <li key={i} className="event-details-visit">
                                            {formatDateTime(ev.raw?.timestamp ?? ev.ts)}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {!chatPreview && !['test_complete', 'diagnostics_results_view', 'ikigai_results_view', 'astrolabe_input', 'astrolabe_action', 'alchemy_item_select', 'alchemy_interaction', 'snitch_action', 'crystal_action'].includes(entry.raw?.event_name) && !entry.grouped?.length && contentDetails && (
                                    <div className="event-details-content"><p className="journey-event-details">{contentDetails}</p></div>
                                  )}
                                </>
                              )}
                            </div>
                            )}
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

        {/* Smart Segmentation Panel (fn_refresh_segments + user_segments) */}
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
                {(() => {
                  const seg = reportData?.user_segments ?? null
                  const huntLevel = seg?.segment_hunt_level != null ? Math.min(4, Math.max(0, Number(seg.segment_hunt_level))) : 0
                  const HUNT_NAMES = ['Безразличие', 'Интерес', 'Поиск', 'Выбор решения', 'Покупка']
                  const huntName = seg ? (HUNT_NAMES[huntLevel] ?? 'Безразличие') : 'Нулевой этап'
                  const motivation = seg?.segment_motivation ?? null
                  const m = String(motivation || '').toLowerCase()
                  const motivationIcons = !motivation || !m.trim()
                    ? ['🔍']
                    : m.includes('смешан')
                      ? ['🧱', '✨']
                      : m.includes('тверд')
                        ? ['🧱']
                        : m.includes('мягк')
                          ? ['✨']
                          : ['🔍']
                  const motivationLabel = motivation ?? 'Интерес не выражен'
                  const temp = seg?.segment_temperature ?? 'Cold'
                  const tempNorm = String(temp).toLowerCase().replace(/\s+/g, '-')
                  const tempLower = String(temp ?? '').toLowerCase()
                  const isReanimation = tempNorm.includes('reanimation')
                  const isHot = tempLower.includes('hot')
                  const isWarm = tempLower.includes('warm')
                  const tempSlug = isHot ? 'hot' : isWarm ? 'warm' : isReanimation ? 'needs-reanimation' : 'cold'
                  const tempEmoji = isHot ? '🔥' : isWarm ? '☀️' : isReanimation ? '⛑️' : '❄️'
                  const tempLabel = isHot ? (temp || 'Hot') : isWarm ? 'Warm' : isReanimation ? 'Нужна реанимация' : temp === 'Ice' || tempLower.includes('ice') ? 'Cold' : temp || 'Cold'
                  const totalTouches = seg?.total_events_count ?? 0
                  const isHighEnergy = totalTouches > 100
                  const engagementIcon = isHighEnergy ? '🏎️' : '⚡'
                  return (
                    <div className="seg-cards-grid">
                      <div className="seg-card seg-card-hunt-bg">
                        <h4 className="seg-card-title">Лестница Ханта (Hunt Level)</h4>
                        <div className="seg-card-visual seg-card-hunt" role="progressbar" aria-valuenow={huntLevel} aria-valuemin={0} aria-valuemax={4} aria-label={`Уровень ${huntLevel}: ${huntName}`}>
                          <div className="seg-card-hunt-track">
                            <div className="seg-card-hunt-fill" style={{ width: `${(huntLevel / 5) * 100}%` }} />
                          </div>
                          <p className="seg-card-value seg-card-hunt-label">Уровень {huntLevel}: {huntName}</p>
                        </div>
                        <p className="seg-card-desc">Текущая ступень осведомлённости в воронке.</p>
                      </div>
                      <div className="seg-card seg-card-motivation-bg">
                        <div className="seg-card-motivation-corner" aria-hidden>
                          {motivationIcons.map((icon, i) => (
                            <span key={i} className="seg-card-motivation-icon">{icon}</span>
                          ))}
                        </div>
                        <h4 className="seg-card-title">Ниша / Мышление (Motivation)</h4>
                        <div className="seg-card-visual seg-card-motivation">
                          <p className="seg-card-value">{motivationLabel}</p>
                        </div>
                        <p className="seg-card-desc">Определено на основе интереса к Alchemy или системным блокам воронки.</p>
                      </div>
                      <div className={`seg-card seg-card-temp-bg seg-card-temp-bg-${tempSlug}`}>
                        <h4 className="seg-card-title">Температура (Temperature)</h4>
                        <div className="seg-card-visual seg-card-temp-visual">
                          <span className="seg-card-temp-emoji" aria-hidden>{tempEmoji}</span>
                          <p className={`seg-card-value seg-card-temp-value seg-card-temp-value-${tempSlug}`}>{tempLabel}</p>
                        </div>
                        <p className="seg-card-desc">Отражает свежесть действий и готовность к целевому действию.</p>
                      </div>
                      <div className={`seg-card seg-card-engagement-bg ${isHighEnergy ? 'seg-card-high-energy' : ''}`}>
                        <h4 className="seg-card-title">Активность (Engagement)</h4>
                        <div className="seg-card-visual seg-card-touches">
                          <span className="seg-card-touches-icon" aria-hidden>{engagementIcon}</span>
                          <span className="seg-card-touches-num">{totalTouches}</span>
                          {isHighEnergy && <span className="seg-card-high-energy-badge">High Energy</span>}
                        </div>
                        <p className="seg-card-value">Всего касаний с системой</p>
                        <p className="seg-card-desc">Общее количество зафиксированных событий и взаимодействий с контентом.</p>
                      </div>
                    </div>
                  )
                })()}
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