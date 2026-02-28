import React, { useEffect, Suspense, lazy } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { openTelegramLink } from '../utils/telegram'
import { yandexMetricaReachGoal } from '../analytics/yandexMetrica'
import { useLogEvent } from '../hooks/useLogEvent'
import { getBlockById, getNextBlockId } from '../data/funnelData'

// Ленивая загрузка тяжёлых страниц — уменьшает начальный бандл и время до первого отображения на слабых устройствах
const Profile = lazy(() => import('./Profile'))
const Alchemy = lazy(() => import('./Alchemy'))
const Diagnostics = lazy(() => import('./Diagnostics'))
const Home = lazy(() => import('./Home'))
const PersonReport = lazy(() => import('./PersonReport'))
const BlockDetail = lazy(() => import('./BlockDetail'))
const AdminSettings = lazy(() => import('./AdminSettings'))
const AdminChats = lazy(() => import('./AdminChats'))
const AdminDashboard = lazy(() => import('./AdminDashboard'))

export function ProfileRoute() {
  const navigate = useNavigate()
  return (
    <Profile
      onBack={() => navigate('/funnel')}
      onAvatarClick={() => navigate('/funnel')}
      onDiagnostics={() => navigate('/diagnostics')}
      onAlchemyClick={() => navigate('/alchemy')}
      onChatClick={() => {}}
      onHomeClick={() => navigate('/home')}
      onPersonReport={() => navigate('/personreport')}
    />
  )
}

export function AlchemyRoute() {
  const navigate = useNavigate()
  return (
    <Alchemy
      onBack={() => navigate('/funnel')}
      onAvatarClick={() => navigate('/profile')}
      onChatClick={() => {}}
      onDiagnostics={() => navigate('/diagnostics')}
      onHomeClick={() => navigate('/home')}
    />
  )
}

export function DiagnosticsRoute() {
  const navigate = useNavigate()
  return (
    <Diagnostics
      onBack={() => navigate('/funnel')}
      onAvatarClick={() => navigate('/profile')}
      onAlchemyClick={() => navigate('/alchemy')}
      onChatClick={() => {}}
      onHomeClick={() => navigate('/home')}
    />
  )
}

export function HomeRoute() {
  const navigate = useNavigate()
  return (
    <Home
      onDiagnostics={() => navigate('/diagnostics')}
      onTechnologies={() => navigate('/funnel')}
      onAlchemy={() => navigate('/alchemy')}
      onPortal={() => navigate('/funnel')}
      onAvatarClick={() => navigate('/profile')}
    />
  )
}

export function PersonReportRoute() {
  const navigate = useNavigate()
  return (
    <PersonReport
      onBack={() => navigate('/funnel')}
      onAvatarClick={() => navigate('/profile')}
      onHomeClick={() => navigate('/home')}
      onDiagnostics={() => navigate('/diagnostics')}
      onAlchemyClick={() => navigate('/alchemy')}
    />
  )
}

export function AdminDashboardRoute() {
  const navigate = useNavigate()
  return (
    <AdminDashboard
      onBack={() => navigate('/funnel')}
      onAvatarClick={() => navigate('/profile')}
      onConsultation={() => navigate('/diagnostics')}
      onAlchemyClick={() => navigate('/alchemy')}
      onHomeClick={() => navigate('/home')}
    />
  )
}

export function AdminSettingsRoute() {
  const navigate = useNavigate()
  return (
    <AdminSettings
      onBack={() => navigate('/admin')}
      onAvatarClick={() => navigate('/profile')}
      onConsultation={() => navigate('/diagnostics')}
      onAlchemyClick={() => navigate('/alchemy')}
      onHomeClick={() => navigate('/home')}
    />
  )
}

export function AdminChatsRoute() {
  const navigate = useNavigate()
  return (
    <AdminChats
      onBack={() => navigate('/admin')}
      onAvatarClick={() => navigate('/profile')}
      onConsultation={() => navigate('/diagnostics')}
      onAlchemyClick={() => navigate('/alchemy')}
      onHomeClick={() => navigate('/home')}
    />
  )
}

export function BlockDetailRoute() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { trackSectionView, logCTAClick } = useLogEvent()
  const block = getBlockById(id)

  useEffect(() => {
    if (block) trackSectionView(`block-${block.id}`)
  }, [block, trackSectionView])

  if (!block) {
    navigate('/funnel', { replace: true })
    return null
  }

  const nextId = getNextBlockId(block.id)
  const handleStageConsultation = async () => {
    const url = 'https://t.me/ilyaborm'
    await logCTAClick('block_consultation_tg', {
      page: `/block/${block.id}`,
      section_id: `block-${block.id}`,
      cta_opens_tg: true,
      ctaText: 'Связаться в Telegram',
      ctaLocation: 'block_detail'
    })
    openTelegramLink(url)
    yandexMetricaReachGoal(null, 'contact_telegram_click', { placement: 'block_detail', url })
  }

  return (
    <BlockDetail
      block={block}
      onBack={() => navigate('/funnel')}
      onConsultation={handleStageConsultation}
      onDiagnostics={handleStageConsultation}
      onAvatarClick={() => navigate('/profile')}
      onAlchemyClick={() => navigate('/alchemy')}
      onChatClick={() => {}}
      onHomeClick={() => navigate('/home')}
      onNextBlock={nextId ? () => navigate(`/block/${nextId}`) : undefined}
    />
  )
}
