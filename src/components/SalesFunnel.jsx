import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Portfolio from './Portfolio'
import Header from './Header'
import ChatBot from './ChatBot'
import './SalesFunnel.css'
import { yandexMetricaReachGoal } from '../analytics/yandexMetrica'
import { openTelegramLink } from '../utils/telegram'
import { useLogEvent } from '../hooks/useLogEvent'
import { getSupabase } from '../utils/supabaseClient'
import { funnelData } from '../data/funnelData'

function SalesFunnel() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logCTAClick, logContentView, logEvent, trackSectionView } = useLogEvent()
  const [showPortfolio, setShowPortfolio] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [userList, setUserList] = useState([])
  const [userListLoading, setUserListLoading] = useState(false)

  // Page tracking: log visit for current path
  useEffect(() => {
    const path = location.pathname || '/funnel'
    if (!path) return
    logEvent('visit', 'page_view', { page: path })
  }, [location.pathname, logEvent])

  useEffect(() => {
    logContentView('page', 'funnel_diagram', { content_title: 'Диаграмма воронки', page: '/funnel' })
  }, [logContentView])

  // Один вызов при загрузке: ID из sitemapData (funnel = funnel_root), в логе сразу красивое название 📉 Воронка
  useEffect(() => {
    trackSectionView('funnel')
  }, [trackSectionView])

  // Fetch user list with segments
  useEffect(() => {
    let cancelled = false
    const fetchUserList = async () => {
      const supabase = await getSupabase()
      if (!supabase) return
      setUserListLoading(true)
      try {
        const { data, error } = await supabase
          .from('users')
          .select('user_id, username, first_name, user_segments(*)')
        if (cancelled) return
        if (error) {
          console.warn('User list fetch error:', error.message)
          setUserList([])
          return
        }
        const rows = (data || []).map((row) => {
          const seg = row.user_segments?.[0]
          return {
            user_id: row.user_id,
            username: row.username ?? null,
            first_name: row.first_name ?? null,
            segment_motivation: seg?.segment_motivation ?? null,
            segment_temperature: seg?.segment_temperature ?? null,
            segment_hunt_level: seg?.segment_hunt_level != null ? Math.min(4, Math.max(0, Number(seg.segment_hunt_level))) : null
          }
        })
        setUserList(rows)
      } finally {
        if (!cancelled) setUserListLoading(false)
      }
    }
    fetchUserList()
    return () => { cancelled = true }
  }, [])

  const handleBlockClick = async (block) => {
    yandexMetricaReachGoal(null, 'funnel_block_open', { blockId: block?.id })
    await logCTAClick('funnel_block_click', {
      ctaText: block?.name,
      ctaLocation: 'sales_funnel',
      previousStep: 'viewing_funnel',
      page: '/funnel'
    })
    navigate(`/block/${block.id}`)
  }

  const handleAuthorClick = () => {
    yandexMetricaReachGoal(null, 'open_portfolio')
    setShowPortfolio(true)
  }

  const handleConsultation = () => {
    yandexMetricaReachGoal(null, 'open_diagnostics')
    navigate('/diagnostics')
  }

  const handleStageConsultation = async () => {
    const url = 'https://t.me/ilyaborm'
    await logCTAClick('funnel_consultation_tg', {
      page: '/funnel',
      section_id: 'funnel-diagram',
      cta_opens_tg: true,
      ctaText: 'Связаться в Telegram',
      ctaLocation: 'sales_funnel'
    })
    const opened = openTelegramLink(url)
    yandexMetricaReachGoal(null, 'contact_telegram_click', { placement: 'funnel_stage_cta', url, opened })
  }

  const handleAlchemyClick = () => {
    yandexMetricaReachGoal(null, 'open_alchemy')
    navigate('/alchemy')
  }

  const handleChatClick = () => {
    yandexMetricaReachGoal(null, 'open_chat')
    setShowChat(true)
  }

  const handleAvatarClick = () => {
    yandexMetricaReachGoal(null, 'open_profile')
    navigate('/profile')
  }

  const handleHomeClick = () => {
    yandexMetricaReachGoal(null, 'home_click')
    navigate('/home')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handlePortalClick = () => {
    yandexMetricaReachGoal(null, 'funnel_diagram_open')
    navigate('/funnel')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="sales-funnel-container">
      <Header
        onAvatarClick={handleAvatarClick}
        onConsultation={handleConsultation}
        onAlchemyClick={handleAlchemyClick}
        onHomeClick={handleHomeClick}
        onBack={handlePortalClick}
        activeMenuId="portal"
      />

      <div id="funnel-diagram" className="funnel-wrapper">
        <div className="funnel-blocks" id="funnel-blocks">
          {funnelData.slice(0, 6).map((block, index) => (
            <React.Fragment key={block.id}>
              <div
                className={`funnel-block ${block.id === 'product' ? 'product-block' : ''}`}
                style={{
                  '--block-color': block.color,
                  '--block-width': `${block.width}px`
                }}
                onClick={() => handleBlockClick(block)}
              >
                <img src={block.image} alt={block.name} className="block-image" />
                <span className="block-name">{block.name}</span>
              </div>
              {index < 5 && (
                <div className={`funnel-arrow ${block.id === 'autofunnel' ? 'product-arrow' : ''}`}>
                  <svg width="20" height="20" viewBox="0 0 20 20" className="arrow-svg">
                    <line x1="10" y1="0" x2="10" y2="15" stroke="#ffffff" strokeWidth="2" strokeOpacity="0.8" markerEnd={`url(#arrowhead-vertical-${index})`} />
                    <defs>
                      <marker id={`arrowhead-vertical-${index}`} markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto">
                        <polygon points="0 0, 10 5, 0 10" fill="#ffffff" fillOpacity="0.8" />
                      </marker>
                    </defs>
                  </svg>
                </div>
              )}
            </React.Fragment>
          ))}
          <div className="funnel-arrow money-arrow">
            <svg width="20" height="20" viewBox="0 0 20 20" className="arrow-svg">
              <line x1="10" y1="0" x2="10" y2="15" stroke="#ffffff" strokeWidth="2" strokeOpacity="0.8" markerEnd="url(#arrowhead-vertical-money)" />
              <defs>
                <marker id="arrowhead-vertical-money" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto">
                  <polygon points="0 0, 10 5, 0 10" fill="#ffffff" fillOpacity="0.8" />
                </marker>
              </defs>
            </svg>
          </div>
          <div className="result-blocks-container">
            {funnelData.slice(6).map((block) => (
              <div
                key={block.id}
                className={`funnel-block result-block`}
                style={{ '--block-color': block.color, '--block-width': `${block.width}px` }}
                onClick={() => handleBlockClick(block)}
              >
                <img src={block.image} alt={block.name} className="block-image" />
                <span className="block-name">{block.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="funnel-user-list-section">
        <h3 className="funnel-user-list-title">Пользователи воронки</h3>
        {userListLoading ? (
          <div className="funnel-user-list-loading">
            <div className="loading-spinner" /> Загрузка...
          </div>
        ) : (
          <div className="funnel-user-list-wrapper">
            <table className="funnel-user-list-table" aria-label="Список пользователей с сегментами">
              <thead>
                <tr>
                  <th>user_id</th>
                  <th>Пользователь</th>
                  <th>Ниша</th>
                  <th>Hunt Ladder</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {userList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="funnel-user-list-empty">Нет данных</td>
                  </tr>
                ) : (
                  userList.map((u) => (
                    <tr key={u.user_id ?? 'unknown'}>
                      <td>{u.user_id ?? '—'}</td>
                      <td>{u.first_name ?? u.username ?? '—'}</td>
                      <td>{u.segment_motivation ?? '—'}</td>
                      <td>
                        <div className="hunt-ladder-cell">
                          <div className="hunt-ladder-bar" role="progressbar" aria-valuenow={u.segment_hunt_level ?? 0} aria-valuemin={0} aria-valuemax={4}>
                            <div className="hunt-ladder-fill" style={{ width: u.segment_hunt_level != null ? `${((u.segment_hunt_level + 1) / 5) * 100}%` : '0%' }} />
                          </div>
                          <span className="hunt-ladder-label">{u.segment_hunt_level != null ? `${u.segment_hunt_level}/4` : '—'}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`segment-status-badge segment-status--${(u.segment_temperature || '').toLowerCase().replace(/\s+/g, '-')}`}>
                          {u.segment_temperature === 'Hot' ? 'Hot' : u.segment_temperature === 'Warm' ? 'Warm' : u.segment_temperature === 'Needs Reanimation' ? '⚠️ Needs Reanimation' : u.segment_temperature === 'Ice' ? 'В процессе анализа' : u.segment_temperature ?? '—'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showPortfolio && (
        <Portfolio onClose={() => setShowPortfolio(false)} onConsultation={handleConsultation} />
      )}
      {showChat && <ChatBot onClose={() => setShowChat(false)} />}
    </div>
  )
}

export default SalesFunnel
