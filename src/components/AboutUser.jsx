import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from './Header'
import BackToCabinet from './BackToCabinet'
import { getSupabase } from '../utils/supabaseClient'
import './AboutUser.css'

const TEST_LABELS = {
  diagnostics_results_view: 'Диагностика системы продаж',
  ikigai_results_view: 'Матрица Икигай',
  onboarding_results_view: 'Знакомство',
  test_complete: 'Тест'
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

  const loadData = useCallback(async () => {
    const tgUser = getTgUser()
    const userId = tgUser?.id != null ? String(tgUser.id) : null

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

    if (!userId) {
      setLoading(false)
      return
    }

    try {
      const supabase = await getSupabase()
      if (supabase) {
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
        const sessionIds = (sessions || []).map((s) => s.id)
        if (sessionIds.length) {
          const { data: events } = await supabase
            .from('site_events')
            .select('created_at, event_name, metadata')
            .eq('event_type', 'diagnostic')
            .in('session_id', sessionIds)
            .order('created_at', { ascending: false })
            .limit(100)
          const list = (events || []).map((r) => {
            const meta = typeof r.metadata === 'string' ? (() => { try { return JSON.parse(r.metadata) } catch { return {} } })() : (r.metadata || {})
            const label = TEST_LABELS[r.event_name] || r.event_name || 'Тест'
            const result = meta.result?.title ?? meta.title ?? meta.total_score != null ? `Баллы: ${meta.total_score}` : null
            return {
              testName: label,
              date: r.created_at,
              result
            }
          })
          setTestResults(list)
        }

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
          if (bd) setBirthDate(bd)
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
      <div className="back-to-cabinet-wrap">
        <BackToCabinet />
      </div>
      <div className={`about-user-book ${bookOpen ? 'about-user-book--open' : ''}`}>
        <div className="about-user-book-frame">
          <div className="about-user-book-spine" aria-hidden="true" />
          <div className="about-user-book-pages">
            <div className="about-user-page about-user-page--left">
              <h2 className="about-user-page-title">Обо мне</h2>
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
              <h2 className="about-user-page-title">Пройденные тесты</h2>
              {loading ? (
                <p className="about-user-loading">Загрузка…</p>
              ) : testResults.length === 0 ? (
                <p className="about-user-empty">Пока нет пройденных тестов.</p>
              ) : (
                <ul className="about-user-tests">
                  {testResults.map((item, i) => (
                    <li key={i} className="about-user-test-item">
                      <span className="about-user-test-name">{item.testName}</span>
                      <span className="about-user-test-date">
                        {item.date ? new Date(item.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                      </span>
                      {item.result && <span className="about-user-test-result">{item.result}</span>}
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
