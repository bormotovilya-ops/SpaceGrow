import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from './Header'
import BackToCabinet from './BackToCabinet'
import { getSupabase } from '../utils/supabaseClient'
import { userUtils } from '../utils/logging'
import './AboutUser.css'

const TEST_LABELS = {
  diagnostics_results_view: 'Диагностика системы продаж',
  ikigai_results_view: 'Матрица Икигай',
  onboarding_results_view: 'Знакомство',
  test_complete: 'Тест',
  eq_result: 'EQ (Эмоциональный интеллект)',
  peoplegames_result: 'Трансактный анализ'
}

/** Список тестов и тренингов для отображения (1 строка на каждый) */
const ALL_ITEMS = [
  { eventType: 'diagnostic', eventName: 'diagnostics_results_view', label: 'Диагностика системы продаж' },
  { eventType: 'diagnostic', eventName: 'ikigai_results_view', label: 'Матрица Икигай' },
  { eventType: 'diagnostic', eventName: 'onboarding_results_view', label: 'Знакомство' },
  { eventType: 'training', eventName: 'eq_result', label: 'EQ (Эмоциональный интеллект)' },
  { eventType: 'training', eventName: 'peoplegames_result', label: 'Трансактный анализ' }
]

function safeParseMeta(metadata) {
  if (metadata == null) return {}
  if (typeof metadata === 'object') return metadata
  try { return typeof metadata === 'string' ? JSON.parse(metadata) : {} } catch { return {} }
}

/** Группирует diagnostic-события по тесту, считает прохождения и извлекает баллы */
function buildTestSummary(events) {
  const byTest = {}
  for (const r of events || []) {
    const meta = safeParseMeta(r.metadata)
    const label = TEST_LABELS[r.event_name] || r.event_name || 'Тест'
    if (!byTest[label]) byTest[label] = { count: 0, scores: [] }
    byTest[label].count += 1
    const score = meta.total_score
    if (score != null && score !== '') byTest[label].scores.push(Number(score))
  }
  return byTest
}

/** Группирует training-события по тренингу: прохождения, успешные (только status=прошел), баллы показываем в любом случае */
function buildTrainingSummary(events) {
  const byTraining = {}
  for (const r of events || []) {
    const meta = safeParseMeta(r.metadata)
    const label = TEST_LABELS[r.event_name] || r.event_name || 'Тренинг'
    if (!byTraining[label]) byTraining[label] = { count: 0, passedCount: 0, scores: [] }
    byTraining[label].count += 1
    if (meta.status === 'прошел') byTraining[label].passedCount += 1
    const pts = meta.points
    if (pts != null && pts !== '') byTraining[label].scores.push(Number(pts))
  }
  return byTraining
}

/** Знак зодиака по дню и месяцу */
function getZodiacSign(day, month) {
  const d = parseInt(day, 10)
  const m = parseInt(month, 10)
  if (m === 1 && d >= 20) return { emoji: '♒', name: 'Водолей' }
  if (m === 1 && d <= 19) return { emoji: '♑', name: 'Козерог' }
  if (m === 2 && d >= 19) return { emoji: '♓', name: 'Рыбы' }
  if (m === 2 && d <= 18) return { emoji: '♒', name: 'Водолей' }
  if (m === 3 && d >= 21) return { emoji: '♈', name: 'Овен' }
  if (m === 3 && d <= 20) return { emoji: '♓', name: 'Рыбы' }
  if (m === 4 && d >= 20) return { emoji: '♉', name: 'Телец' }
  if (m === 4 && d <= 19) return { emoji: '♈', name: 'Овен' }
  if (m === 5 && d >= 21) return { emoji: '♊', name: 'Близнецы' }
  if (m === 5 && d <= 20) return { emoji: '♉', name: 'Телец' }
  if (m === 6 && d >= 21) return { emoji: '♋', name: 'Рак' }
  if (m === 6 && d <= 20) return { emoji: '♊', name: 'Близнецы' }
  if (m === 7 && d >= 23) return { emoji: '♌', name: 'Лев' }
  if (m === 7 && d <= 22) return { emoji: '♋', name: 'Рак' }
  if (m === 8 && d >= 23) return { emoji: '♍', name: 'Дева' }
  if (m === 8 && d <= 22) return { emoji: '♌', name: 'Лев' }
  if (m === 9 && d >= 23) return { emoji: '♎', name: 'Весы' }
  if (m === 9 && d <= 22) return { emoji: '♍', name: 'Дева' }
  if (m === 10 && d >= 23) return { emoji: '♏', name: 'Скорпион' }
  if (m === 10 && d <= 22) return { emoji: '♎', name: 'Весы' }
  if (m === 11 && d >= 22) return { emoji: '♐', name: 'Стрелец' }
  if (m === 11 && d <= 21) return { emoji: '♏', name: 'Скорпион' }
  if (m === 12 && d >= 22) return { emoji: '♑', name: 'Козерог' }
  if (m === 12 && d <= 21) return { emoji: '♐', name: 'Стрелец' }
  return null
}

/** Парсинг даты рождения → { day, month } для зодиака */
function parseBirthDateForZodiac(birthDateStr) {
  if (!birthDateStr) return null
  const s = String(birthDateStr).trim()
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/) || s.match(/^(\d{2})\.(\d{2})\.(\d{4})/) || s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/)
  if (match) {
    const [, a, b, c] = match
    const day = a.length === 4 ? c : a
    const month = a.length === 4 ? b : b
    return { day, month }
  }
  return null
}

/** Расшифровка UTM: человекочитаемые подписи для стандартных значений */
const UTM_SOURCE_LABELS = { google: 'Google', telegram: 'Telegram', vk: 'ВКонтакте', yandex: 'Яндекс', facebook: 'Facebook', instagram: 'Instagram', direct: 'Прямой заход' }
const UTM_MEDIUM_LABELS = { cpc: 'Контекстная реклама', cpm: 'Медийная реклама', email: 'Email', social: 'Соцсети', organic: 'Органический поиск', referral: 'Переход по ссылке' }
function formatUtmDisplay(params) {
  if (!params || !(params.utm_source || params.utm_medium || params.utm_campaign)) return null
  const parts = []
  if (params.utm_source) {
    const label = UTM_SOURCE_LABELS[params.utm_source.toLowerCase()] || params.utm_source
    parts.push(`Источник: ${label}`)
  }
  if (params.utm_medium) {
    const label = UTM_MEDIUM_LABELS[params.utm_medium.toLowerCase()] || params.utm_medium
    parts.push(`Канал: ${label}`)
  }
  if (params.utm_campaign) parts.push(`Кампания: ${params.utm_campaign}`)
  return parts.length ? parts.join(' · ') : null
}

function getTgUser() {
  if (typeof window === 'undefined') return null
  const u = window.Telegram?.WebApp?.initDataUnsafe?.user ?? window.TelegramWebApp?.initDataUnsafe?.user
  return u || null
}

function AboutUser() {
  const navigate = useNavigate()
  const [bookOpen, setBookOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userInfo, setUserInfo] = useState(null)
  const [testResults, setTestResults] = useState([])
  const [birthDate, setBirthDate] = useState(null)
  const [zodiac, setZodiac] = useState(null)
  const [utmParams, setUtmParams] = useState(null)

  const loadData = useCallback(async () => {
    const tgUser = getTgUser()
    const userId = tgUser?.id != null ? String(tgUser.id) : null
    const cookieId = userUtils.getCookieId()

    const fromTg = {
      firstName: tgUser?.first_name ?? '',
      lastName: tgUser?.last_name ?? '',
      username: tgUser?.username ?? null
    }
    setUserInfo({
      firstName: fromTg.firstName,
      lastName: fromTg.lastName,
      username: fromTg.username,
      userId
    })

    if (!userId && !cookieId) {
      setLoading(false)
      return
    }

    const guestMode = !userId && !!cookieId
    if (guestMode) {
      setUserInfo((prev) => ({ ...prev, firstName: 'Гость', lastName: '', username: null }))
    }

    try {
      const supabase = await getSupabase()
      if (supabase) {
        let sessionIds = []

        if (userId) {
          const { data: profileRow } = await supabase
            .from('users')
            .select('user_id, username, first_name, last_name')
            .eq('user_id', userId)
            .maybeSingle()
          if (profileRow) {
            setUserInfo((prev) => ({
              ...prev,
              firstName: profileRow.first_name ?? prev?.firstName ?? '',
              lastName: profileRow.last_name ?? prev?.lastName ?? '',
              username: profileRow.username ?? prev?.username ?? null
            }))
          }

          const { data: sessions } = await supabase
            .from('site_sessions')
            .select('id')
            .eq('tg_user_id', userId)
          sessionIds = (sessions || []).map((s) => s.id)
        } else if (cookieId) {
          const { data: sessions } = await supabase
            .from('site_sessions')
            .select('id')
            .eq('cookie_id', cookieId)
          sessionIds = (sessions || []).map((s) => s.id)
        }
        if (sessionIds.length) {
          const { data: diagnosticEvents } = await supabase
            .from('site_events')
            .select('created_at, event_name, metadata')
            .eq('event_type', 'diagnostic')
            .in('session_id', sessionIds)
            .order('created_at', { ascending: false })
            .limit(100)
          const { data: trainingEvents } = await supabase
            .from('site_events')
            .select('created_at, event_name, metadata')
            .eq('event_type', 'training')
            .in('session_id', sessionIds)
            .in('event_name', ['eq_result', 'peoplegames_result'])
            .order('created_at', { ascending: false })
            .limit(100)
          const testSummary = buildTestSummary(diagnosticEvents)
          const trainingSummary = buildTrainingSummary(trainingEvents)
          const rows = ALL_ITEMS.map(({ eventType, eventName, label }) => {
            if (eventType === 'diagnostic') {
              const s = testSummary[label] || { count: 0, scores: [] }
              return { testName: label, count: s.count, points: s.scores.length ? Math.max(...s.scores) : null, passed: s.count > 0 }
            }
            const s = trainingSummary[label] || { count: 0, passedCount: 0, scores: [] }
            return { testName: label, count: s.count, points: s.scores.length ? Math.max(...s.scores) : null, passed: s.passedCount > 0 }
          })
          setTestResults(rows)
        }

        if (sessionIds.length) {
          try {
            const { data: astroRows } = await supabase
              .from('site_events')
              .select('metadata')
              .in('session_id', sessionIds)
              .eq('event_name', 'astrolabe_input')
              .limit(1)
            const firstAstro = astroRows?.[0]?.metadata
            const astroMeta = typeof firstAstro === 'string' ? (() => { try { return JSON.parse(firstAstro) } catch { return {} } })() : (firstAstro || {})
            const bd = astroMeta.birth_date ?? astroMeta.date ?? null
            if (bd) {
              setBirthDate(bd)
              const parsed = parseBirthDateForZodiac(bd)
              if (parsed) setZodiac(getZodiacSign(parsed.day, parsed.month))
            }
          } catch (_) {}
        }

        try {
          let identityRows = null
          if (userId) {
            const { data } = await supabase
              .from('user_identities')
              .select('utm_source, utm_medium, utm_campaign')
              .eq('tg_user_id', userId)
            identityRows = data
          } else if (cookieId) {
            const { data } = await supabase
              .from('user_identities')
              .select('utm_source, utm_medium, utm_campaign')
              .eq('cookie_id', cookieId)
            identityRows = data
          }
          const firstWithUtm = identityRows?.find((r) => r.utm_source || r.utm_medium || r.utm_campaign)
          if (firstWithUtm) {
            setUtmParams({
              utm_source: firstWithUtm.utm_source ?? null,
              utm_medium: firstWithUtm.utm_medium ?? null,
              utm_campaign: firstWithUtm.utm_campaign ?? null
            })
          }
        } catch (_) {}
      }
    } catch (_) {}
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const t = setTimeout(() => setBookOpen(true), 150)
    return () => clearTimeout(t)
  }, [])

  const displayName = [userInfo?.firstName, userInfo?.lastName].filter(Boolean).join(' ') || 'Гость'
  const displayUsername = userInfo?.username ? `@${userInfo.username}` : null

  return (
    <div className="about-user-root">
      <Header
        onAvatarClick={() => navigate('/profile')}
        onConsultation={() => navigate('/diagnostics')}
        onBack={() => navigate('/cabinet')}
        onAlchemyClick={() => navigate('/alchemy')}
        onHomeClick={() => navigate('/home')}
        activeMenuId="cabinet"
      />
      <div className="about-user-back-wrap">
        <BackToCabinet />
      </div>
      <div className={`about-user-book ${bookOpen ? 'about-user-book--open' : ''}`}>
        <div className="about-user-book-frame">
          <div className="about-user-book-spine" aria-hidden="true" />
          <div className="about-user-book-pages">
            <div className="about-user-page about-user-page--left">
              <div className="about-user-page-header">
                <div className="about-user-back-inline">
                  <BackToCabinet />
                </div>
                <h2 className="about-user-page-title">Обо мне</h2>
              </div>
              {loading ? (
                <p className="about-user-loading">Загрузка…</p>
              ) : (
                <div className="about-user-info">
                  <div className="about-user-row">
                    <span className="about-user-label">Имя</span>
                    <span className="about-user-value">{displayName}</span>
                  </div>
                  {displayUsername && (
                    <div className="about-user-row">
                      <span className="about-user-label">Ник</span>
                      <span className="about-user-value">{displayUsername}</span>
                    </div>
                  )}
                  <div className="about-user-row">
                    <span className="about-user-label">Дата рождения</span>
                    <span className="about-user-value">{birthDate || '—'}</span>
                  </div>
                  {zodiac && (
                    <div className="about-user-row">
                      <span className="about-user-label">Знак зодиака</span>
                      <span className="about-user-value">{zodiac.emoji} {zodiac.name}</span>
                    </div>
                  )}
                  {formatUtmDisplay(utmParams) && (
                    <div className="about-user-row">
                      <span className="about-user-label">UTM-метка</span>
                      <span className="about-user-value about-user-value--utm">{formatUtmDisplay(utmParams)}</span>
                    </div>
                  )}
                  {userInfo?.userId && (
                    <div className="about-user-row">
                      <span className="about-user-label">ID</span>
                      <span className="about-user-value about-user-value--muted">{userInfo.userId}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="about-user-page about-user-page--right">
              <h2 className="about-user-page-title">Тесты и тренинги</h2>
              {loading ? (
                <p className="about-user-loading">Загрузка…</p>
              ) : (
                <ul className="about-user-tests">
                  {testResults.map((item, i) => (
                    <li
                      key={i}
                      className={`about-user-test-item about-user-test-item--row ${item.passed ? 'about-user-test-item--passed' : ''}`}
                    >
                      <span className={`about-user-test-status ${item.passed ? 'about-user-test-status--ok' : 'about-user-test-status--fail'}`} aria-hidden="true">
                        {item.passed ? '✓' : '✗'}
                      </span>
                      <span className="about-user-test-name">{item.testName}</span>
                      <span className="about-user-test-meta">
                        {item.count > 0 && <span>{item.count} {item.count === 1 ? 'прохождение' : item.count < 5 ? 'прохождения' : 'прохождений'}</span>}
                        {item.points != null && <span className="about-user-test-points">Баллы: {item.points}</span>}
                        {item.count === 0 && item.points == null && <span className="about-user-test-empty">—</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AboutUser
