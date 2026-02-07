import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import Header from './Header'
import Funnel3D from './Funnel3D'
import './Diagnostics.css'
import { yandexMetricaReachGoal } from '../analytics/yandexMetrica'
import { openTelegramChat } from '../utils/telegram'
import { useLogEvent } from '../hooks/useLogEvent'
import { getSupabase } from '../utils/supabaseClient'

// IKIGAI Venn Diagram (4 overlapping circles)
const IkigaiVenn = ({ data = {}, sectors = [], threshold = 3.5, size = 360 }) => {
  const center = size / 2
  const offset = 80
  const r = 120

  // positions: top-left (passion), top-right (skill), bottom-left (mission), bottom-right (money)
  const positions = {
    passion: { cx: center - offset, cy: center - offset / 2 }, // Любовь
    skill: { cx: center + offset, cy: center - offset / 2 },   // Мастерство
    mission: { cx: center - offset, cy: center + offset / 2 }, // Миссия
    money: { cx: center + offset, cy: center + offset / 2 }    // Деньги
  }

  const COLORS = {
    skill: '#3A7BD5',    // sapphire blue (luxury)
    passion: '#E94E4E',  // deep coral/wine
    mission: '#2ECC71',  // emerald/minty
    money: '#F1C40F'     // matte gold / champagne
  }

  const active = {}
  sectors.forEach(s => { active[s] = (data[s] || 0) >= threshold })
  const allActive = sectors.every(s => active[s])

  return (
    <div className="ikigai-venn-container" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <filter id="goldGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#FFD700" floodOpacity="0.95" />
          </filter>

          {/* radial gradients for luxury fills */}
          <radialGradient id="gradPassion" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#F4A6A6" />
            <stop offset="100%" stopColor="#E94E4E" />
          </radialGradient>
          <radialGradient id="gradSkill" cx="70%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#7FB4F0" />
            <stop offset="100%" stopColor="#3A7BD5" />
          </radialGradient>
          <radialGradient id="gradMission" cx="30%" cy="70%" r="70%">
            <stop offset="0%" stopColor="#8FE7B8" />
            <stop offset="100%" stopColor="#2ECC71" />
          </radialGradient>
          <radialGradient id="gradMoney" cx="70%" cy="70%" r="70%">
            <stop offset="0%" stopColor="#FFE98A" />
            <stop offset="100%" stopColor="#F1C40F" />
          </radialGradient>
        </defs>

        {sectors.map((s) => {
          const pos = positions[s] || { cx: center, cy: center }
          const isOn = !!active[s]
          const color = COLORS[s] || '#ccc'
          const gradId = s === 'passion' ? 'gradPassion' : s === 'skill' ? 'gradSkill' : s === 'mission' ? 'gradMission' : 'gradMoney'
          return (
            <g key={s}>
              <circle
                cx={pos.cx}
                cy={pos.cy}
                r={r}
                fill={isOn ? `url(#${gradId})` : 'none'}
                fillOpacity={isOn ? 0.95 : 0}
                stroke={isOn ? 'none' : 'rgba(255,255,255,0.18)'}
                strokeWidth={isOn ? 0 : 2}
                style={{ transition: 'all 280ms ease', mixBlendMode: isOn ? 'screen' : 'normal' }}
              />

              {/* Name inside circle with opaque pill background to ensure readability when circles overlap */}
              <g style={{ pointerEvents: 'none' }}>
                {/* pill background */}
                <rect
                  x={pos.cx - 46}
                  y={pos.cy - 12}
                  rx={10}
                  ry={10}
                  width={92}
                  height={24}
                  fill="rgba(255,255,255,0.92)"
                  stroke="rgba(0,0,0,0.06)"
                />
                <text
                  x={pos.cx}
                  y={pos.cy + 5}
                  textAnchor="middle"
                  className="question-stage-name"
                  style={{ fontSize: 12, letterSpacing: '1.6px', fill: COLORS[s], fontWeight: 700 }}
                >
                  {s === 'passion' ? 'ЛЮБОВЬ' : s === 'skill' ? 'МАСТЕРСТВО' : s === 'mission' ? 'МИССИЯ' : s === 'money' ? 'ДЕНЬГИ' : s}
                </text>
              </g>
            </g>
          )
        })}

        {/* Small numbered sector markers (approximate positions for 13 internal sectors) */}
        {[
          { x: center - 40, y: center - 60, n: 1 },
          { x: center + 40, y: center - 60, n: 2 },
          { x: center - 60, y: center - 20, n: 3 },
          { x: center + 60, y: center - 20, n: 4 },
          { x: center - 90, y: center + 10, n: 5 },
          { x: center - 20, y: center + 20, n: 6 },
          { x: center + 20, y: center + 20, n: 7 },
          { x: center + 90, y: center + 10, n: 8 },
          { x: center - 30, y: center + 70, n: 9 },
          { x: center + 30, y: center + 70, n: 10 },
          { x: center, y: center - 10, n: 11 },
          { x: center - 10, y: center + 10, n: 12 },
          { x: center + 10, y: center + 10, n: 13 }
        ].map(m => (
          <text key={m.n} x={m.x} y={m.y} textAnchor="middle" style={{ fontSize: 9, fill: 'rgba(255,255,255,0.7)', opacity: 0.7, fontFamily: 'monospace' }}>{m.n}</text>
        ))}

        {/* center intersection glow when all active */}
        {allActive && (
          <g filter="url(#goldGlow)">
            <circle cx={center} cy={center} r={44} fill="#FFD700" fillOpacity={0.95} />
          </g>
        )}

      </svg>
    </div>
  )
}

const UniversalTest = ({ data, onBack, onAvatarClick, onAlchemyClick, onConsultation, onChatClick, onHomeClick }) => {
  const { logContentView, logCTAClick, logEvent, getSessionInfo } = useLogEvent()
  const { settings, stages, questions, commonAnswerOptions, answerOptions, welcome, results: resultsMapping, cta } = data
  const totalQuestions = questions.length
  const resultsLoggedRef = useRef(false)
  const onboardingSavedRef = useRef(false)

  useEffect(() => {
    logContentView('page', 'diagnostics', { content_title: welcome?.title || 'Диагностика в подарок' })
  }, [logContentView, welcome?.title])

  const COOKIE_PREFIX = `${settings.logicType.toLowerCase()}_`
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [showResults, setShowResults] = useState(false)

  const allQuestions = questions.map(q => {
    const stage = stages.find(s => s.id === q.stageId)
    return { ...q, stageName: stage?.name || q.stageId, stageImage: stage?.image, stageSubtitle: stage?.subtitle }
  })

  const handleStart = async () => {
    resultsLoggedRef.current = false
    await logCTAClick('diagnostics_start', {
      ctaText: welcome?.buttonText || 'Начать диагностику',
      ctaLocation: 'diagnostics',
      previousStep: 'viewing_intro',
      page: '/diagnostics'
    })
    setCurrentStep(1)
    setAnswers({})
    setShowResults(false)
  }
  const handleAnswer = (qId, val) => {
    const newAnswers = { ...answers, [qId]: val }
    setAnswers(newAnswers)
    // Если вариантов нет — не шагаем дальше
    if (currentStep < totalQuestions) {
      setTimeout(() => setCurrentStep(currentStep + 1), 300)
    } else {
      setShowResults(true)
      setCurrentStep(totalQuestions + 1)
    }
  }

  const calculateResults = () => {
    // IKIGAI logic (existing)
    if (settings.logicType === 'IKIGAI') {
      const sectorScores = {}; const sectors = ['passion', 'skill', 'mission', 'money']
      sectors.forEach(s => {
        const qInSector = questions.filter(q => q.stageId === s)
        const sum = qInSector.reduce((acc, q) => acc + (answers[q.id] || 0), 0)
        sectorScores[s] = qInSector.length > 0 ? sum / qInSector.length : 0
      })
      const binaryKey = sectors.map(s => (sectorScores[s] >= settings.threshold ? '1' : '0')).join('')
      return { sectorScores, result: resultsMapping[binaryKey] || resultsMapping['0000'], sectors, binaryKey }
    }

    // ONBOARDING: no numeric scoring, just show default result
    if (settings.logicType === 'ONBOARDING') {
      return { result: resultsMapping?.default || {} }
    }

    // Default: DIAGNOSTICS-like logic — compute per-stage averages and classify
    const stageResults = (stages || []).map(stage => {
      // collect answers for questions that belong to this stage
      const qInStage = questions.filter(q => q.stageId === stage.id)
      const scores = qInStage.map(q => answers[q.id] || 0)
      const avg = scores.length > 0 ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0
      return {
        ...stage,
        score: avg,
        questionScores: scores
      }
    })

    const critical = stageResults.filter(r => r.score <= 30).sort((a, b) => a.score - b.score)
    const unstable = stageResults.filter(r => r.score > 30 && r.score < 70).sort((a, b) => a.score - b.score)
    const strong = stageResults.filter(r => r.score >= 70).sort((a, b) => b.score - a.score)

    return { results: stageResults, critical, unstable, strong }
  }

  // Log test_complete once when results are shown (Diagnostics or Ikigai or Onboarding) — full metadata for report
  useEffect(() => {
    if (!showResults) return
    if (resultsLoggedRef.current) return
    const calc = calculateResults()
    const testName = settings.logicType === 'IKIGAI' ? 'ikigai' : settings.logicType === 'ONBOARDING' ? 'onboarding' : 'diagnostics'
    let totalScore = 0
    let resultCategory = ''
    let scoresByCategory = {}
    let criticalZones = []
    let unstableZones = []
    let strongSides = []

    let formattedResult = ''

    if (settings.logicType === 'IKIGAI') {
      const scores = calc.sectorScores || {}
      const vals = Object.values(scores)
      totalScore = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
      resultCategory = calc.result?.title || ''
      scoresByCategory = { ...scores }
      criticalZones = []
      unstableZones = []
      strongSides = []
      formattedResult = `Мой результат Икигай: ${calc.result?.title || 'Икигай'}. Маска: ${calc.binaryKey || '0000'}. Хочу обсудить, как это реализовать.`
    } else if (settings.logicType === 'ONBOARDING') {
      resultCategory = calc.result?.title || 'onboarding'
      formattedResult = calc.result?.title ? `Знакомство: ${calc.result.title}` : 'Прошёл тест Знакомство.'
    } else {
      const r = calc.results || []
      totalScore = r.length ? r.reduce((s, x) => s + (x.score || 0), 0) / r.length : 0
      resultCategory = calc.critical?.length ? 'critical' : calc.unstable?.length ? 'unstable' : 'strong'
      scoresByCategory = (r || []).reduce((acc, x) => ({ ...acc, [x.name]: x.score }), {})
      criticalZones = (calc.critical || []).map(c => ({ name: c.name, score: c.score }))
      unstableZones = (calc.unstable || []).map(u => ({ name: u.name, score: u.score }))
      strongSides = (calc.strong || []).map(s => ({ name: s.name, score: s.score }))
      formattedResult = formatResultsForTelegram(calc)
    }

    resultsLoggedRef.current = true
    const eventName = testName === 'diagnostics' ? 'diagnostics_results_view' : testName === 'ikigai' ? 'ikigai_results_view' : 'onboarding_results_view'
    const baseMetadata = {
      test_name: testName,
      total_score: Math.round(totalScore),
      result_category: resultCategory,
      scores_by_category: scoresByCategory,
      critical_zones: criticalZones,
      unstable_zones: unstableZones,
      strong_sides: strongSides,
      formatted_result: formattedResult
    }
    if (testName === 'onboarding' && answers) {
      const huntMatch = answers.ob_2 != null ? String(answers.ob_2).match(/^hunt_(\d)$/) : null
      const segmentHuntLevel = huntMatch ? parseInt(huntMatch[1], 10) : null
      baseMetadata.segment_motivation = answers.ob_1 || null
      baseMetadata.segment_temperature = answers.ob_4 || null
      baseMetadata.segment_scale = answers.ob_3 || null
      baseMetadata.segment_hunt_level = segmentHuntLevel
    }
    logEvent('diagnostic', eventName, {
      page: '/diagnostics',
      section_id: testName === 'diagnostics' ? 'diagnostics' : testName === 'ikigai' ? 'alchemy-ikigai' : 'alchemy-onboarding',
      metadata: baseMetadata
    })
  }, [showResults, answers, settings.logicType, logEvent])

  // ONBOARDING: при показе результатов — сохранить/обновить user_segments (hunt 1–5, temperature, scale).
  // Идентификация: по tg_user_id (Telegram) или по cookie_id (гость). Хотя бы один должен быть задан.
  useEffect(() => {
    if (settings.logicType !== 'ONBOARDING' || !showResults) return
    if (onboardingSavedRef.current) {
      console.log('[Onboarding] Сохранение уже выполнено, пропуск')
      return
    }

    const sessionInfo = getSessionInfo()
    const tgUserId = sessionInfo.tgUserId ?? window.Telegram?.WebApp?.initDataUnsafe?.user?.id ?? null
    const cookieId = sessionInfo.cookieId ?? null

    if (tgUserId == null && (cookieId == null || String(cookieId).trim() === '')) {
      console.warn('[Onboarding] Нет ни tg_user_id, ни cookie_id. Данные не сохранены.')
      return
    }

    const huntVal = answers.ob_2
    const huntMatch = huntVal != null ? String(huntVal).match(/^hunt_(\d)$/) : null
    const huntLevel = huntMatch ? parseInt(huntMatch[1], 10) : null
    const scale = answers.ob_3 || null
    const temperature = answers.ob_4 || null
    const motivation = answers.ob_1 || null

    if (huntLevel == null || huntLevel < 1 || huntLevel > 5) {
      console.warn('[Onboarding] Некорректный уровень Ханта:', huntVal, '->', huntLevel, '. Ответы:', answers)
      return
    }

    console.log('[Onboarding] Сохраняем в user_segments:', { tg_user_id: tgUserId, cookie_id: cookieId ? `${String(cookieId).slice(0, 8)}…` : null, hunt_level: huntLevel, motivation, scale, temperature })
    onboardingSavedRef.current = true
    const now = new Date().toISOString()
    const payload = {
      p_tg_user_id: tgUserId ?? null,
      p_cookie_id: cookieId ?? null,
      p_segment_hunt_level: huntLevel,
      p_segment_motivation: motivation || null,
      p_segment_temperature: temperature || null,
      p_segment_scale: scale || null,
      p_updated_at: now,
      p_last_update: now
    }

    getSupabase()
      .then((supabase) => {
        if (!supabase) {
          console.warn('[Onboarding] Supabase клиент недоступен (VITE_SUPABASE_URL/KEY?). Данные не сохранены.')
          onboardingSavedRef.current = false
          return
        }
        console.log('[Onboarding] Вызов RPC upsert_user_segment_from_onboarding', { ...payload, p_cookie_id: payload.p_cookie_id ? `${String(payload.p_cookie_id).slice(0, 8)}…` : null })
        return supabase.rpc('upsert_user_segment_from_onboarding', payload)
      })
      .then((result) => {
        if (result == null) return
        const { data, error } = result
        if (error) {
          console.error('[Onboarding] Ошибка RPC upsert_user_segment_from_onboarding:', error.message, error.code, error.details)
          onboardingSavedRef.current = false
          return
        }
        console.log('[Onboarding] RPC выполнен успешно', data != null ? { data } : '')
      })
      .catch((err) => {
        console.error('[Onboarding] Исключение при сохранении:', err)
        onboardingSavedRef.current = false
      })
  }, [showResults, answers, settings.logicType, getSessionInfo])

  // Helpers for diagnostics rendering and messaging
  const getDetailedConclusion = (critical, unstable, strong) => {
    const totalStages = (stages || []).length
    const criticalCount = critical.length
    const unstableCount = unstable.length
    const strongCount = strong.length
    let conclusion = ''

    if (criticalCount > 0) {
      conclusion = `Вижу ${criticalCount === 1 ? 'критическую зону' : 'критические зоны'}:`
      conclusion += '\n' + critical.map(c => `• ${c.name}`).join('\n')
      conclusion += '\nЭти этапы блокируют рост — любые вложения в трафик здесь не окупаются.'

      if (unstableCount > 0) {
        conclusion += `\n\nТакже есть нестабильные этапы, их стоит подтянуть:`
        conclusion += '\n' + unstable.map(u => `• ${u.name}`).join('\n')
      }

      if (strongCount > 0) {
        conclusion += `\n\nХорошая новость: ${strong.map(s => s.name).join(', ')} работают хорошо. Используем их как опору.`
      }

      conclusion += '\n\nЧто делаем:'
      conclusion += '\n1. Сначала закрываем критические зоны — это даст максимальный рост'
      conclusion += '\n2. Затем донастраиваем нестабильные этапы'
    }
    else if (unstableCount > 0 && strongCount === 0) {
      conclusion = `Все этапы требуют донастройки:`
      conclusion += '\n' + unstable.map(u => `• ${u.name}`).join('\n')
      conclusion += '\n\nПотенциал есть, но система работает нестабильно. Нужно проработать каждый этап, чтобы получить предсказуемый результат.'
      conclusion += '\n\nДавай обсудим план улучшений для каждого этапа?'
    }
    else if (unstableCount > 0 && strongCount > 0) {
      conclusion = `Система работает неравномерно.`
      conclusion += `\n\nНестабильные этапы (${unstableCount}):`
      conclusion += '\n' + unstable.map(u => `• ${u.name}`).join('\n')
      conclusion += `\n\nСильные стороны (${strongCount}):`
      conclusion += '\n' + strong.map(s => `• ${s.name}`).join('\n')
      conclusion += '\n\nСтратегия: используем опыт сильных зон для донастройки нестабильных этапов.'
      conclusion += '\n\nОбсудим план выравнивания воронки?'
    }
    else if (strongCount === totalStages) {
      conclusion = `Отличные результаты! Все этапы работают на высоком уровне:`
      conclusion += '\n' + strong.map(s => `• ${s.name}`).join('\n')
      conclusion += '\n\nСледующий шаг: масштабирование. Увеличиваем трафик и инвестируем в развитие.'
      conclusion += '\n\nГотов обсудить стратегию масштабирования?'
    }
    else if (strongCount > 0 && unstableCount === 0 && criticalCount === 0) {
      conclusion = `У тебя сильная система! Эти этапы работают отлично:`
      conclusion += '\n' + strong.map(s => `• ${s.name}`).join('\n')
      conclusion += '\n\nСистема готова к масштабированию.'
      conclusion += '\n\nОбсудим стратегию роста?'
    }
    else {
      conclusion = 'Проанализировал результаты по каждому этапу. Давай определим приоритеты и составим план действий вместе?'
    }

    return conclusion
  }

  const formatResultsForTelegram = (calc) => {
    const { results, critical, unstable, strong } = calc
    let message = 'Добрый день!\n\n'
    message += 'Я прошел диагностику цепочки продаж своего продукта, вот его результаты:\n\n'
    results.forEach((result) => {
      const emoji = result.score <= 30 ? '🔴' : result.score < 70 ? '🟡' : '🟢'
      message += `${emoji} ${result.name}: ${result.score}%\n`
    })

    message += '\n'
    if (critical.length > 0) {
      message += `🔴 Основные утечки системы: ${critical.map(c => c.name).join(', ')}\n`
    }
    if (unstable.length > 0) {
      message += `🟡 Зоны нестабильности: ${unstable.map(u => u.name).join(', ')}\n`
    }
    if (strong.length > 0) {
      message += `🟢 Сильные стороны: ${strong.map(s => s.name).join(', ')}\n`
    }

    message += '\n'
    message += getDetailedConclusion(critical, unstable, strong).replace(/\*\*/g, '')
    message += '\n\nДавайте обсудим результаты и сформируем конкретный план действий для улучшения!'
    return message
  }

  const formatResultsForTelegramCompact = (calc) => {
    const { results, critical, unstable, strong } = calc
    let message = 'Добрый день!\n\n'
    message += 'Я прошел диагностику цепочки продаж. Результаты:\n\n'
    results.forEach((result) => { message += `${result.name}: ${result.score}%\n` })
    if (critical.length > 0) message += `\nКритические зоны: ${critical.map(c => c.name).join(', ')}`
    if (unstable.length > 0) message += `\nНестабильные зоны: ${unstable.map(u => u.name).join(', ')}`
    if (strong.length > 0) message += `\nСильные стороны: ${strong.map(s => s.name).join(', ')}`
    message += '\n\nХочу обсудить план действий по улучшению. Когда удобно пообщаться?'
    return message
  }

  const handleResultsConsultation = async (e) => {
    const buttonText = e?.target?.innerText?.trim()
    await logCTAClick('diagnostics_consult', {
      page: '/diagnostics',
      section_id: 'diagnostics',
      cta_opens_tg: true,
      ctaText: buttonText || 'Обсудить план действий',
      element_text: buttonText,
      ctaLocation: 'diagnostics'
    })
    const calc = calculateResults()
    const rawMessage = formatResultsForTelegram(calc)
    const compactMessage = formatResultsForTelegramCompact(calc)
    const fullEncodedLen = encodeURIComponent(rawMessage).length
    const compactEncodedLen = encodeURIComponent(compactMessage).length
    const MAX_ENCODED_LEN = 900
    const message = fullEncodedLen <= MAX_ENCODED_LEN ? rawMessage : compactEncodedLen <= MAX_ENCODED_LEN ? compactMessage : `${compactMessage.slice(0,450)}…`
    const opened = openTelegramChat('ilyaborm', message)
    yandexMetricaReachGoal(null, 'diagnostics_send_telegram', { to: 'telegram', opened })
  }

  const handleIkigaiDiscuss = async (e) => {
    const buttonText = e?.target?.innerText?.trim()
    await logCTAClick('ikigai_discuss', {
      page: '/diagnostics',
      section_id: 'alchemy-ikigai',
      cta_opens_tg: true,
      ctaText: buttonText || 'Обсудить результат с экспертом',
      element_text: buttonText,
      ctaLocation: 'diagnostics'
    })
    const calc = calculateResults()
    const title = calc.result?.title || 'Икигай'
    const mask = calc.binaryKey || '0000'
    const message = `Мой результат Икигай: ${title}. Маска: ${mask}. Хочу обсудить, как это реализовать.`
    const opened = openTelegramChat('ilyaborm', message)
    yandexMetricaReachGoal(null, 'ikigai_discuss', { opened, mask })
  }

  if (currentStep === 0) {
    // Split welcome.description into intro (title/summary) and instruction block
    let introHtml = welcome?.description || ''
    let instructionHtml = ''
    // Use DOMParser in browser environment to extract the instruction block(s)
    // Normalize and remove any instruction nodes (diagnostics- or ikigai- prefixed)
    if (typeof window !== 'undefined' && welcome?.description) {
      try {
        const parser = new DOMParser()
        const doc = parser.parseFromString(welcome.description, 'text/html')
        // select any instruction blocks (both diagnostics and ikigai variants)
        const instrNodes = doc.querySelectorAll('.diagnostics-instruction, .ikigai-instruction')
        if (instrNodes && instrNodes.length > 0) {
          // collect outerHTML of all instruction nodes
          instructionHtml = Array.from(instrNodes).map(n => n.outerHTML).join('')
          // remove instruction nodes from the document so introHtml contains only the intro
          Array.from(instrNodes).forEach(n => n.remove())
          introHtml = doc.body.innerHTML

          // convert any diagnostics-specific classes to ikigai ones so styles are consistent
          instructionHtml = instructionHtml
            .replace(/diagnostics-instruction/g, 'ikigai-instruction')
            .replace(/diagnostics-instruction-list/g, 'ikigai-instruction-list')
            .replace(/diagnostics-instruction-item/g, 'ikigai-instruction-item')
            .replace(/diagnostics-instruction-emoji/g, 'ikigai-instruction-emoji')
            .replace(/diagnostics-instruction-content/g, 'ikigai-instruction-content')
            .replace(/diagnostics-instruction-title/g, 'ikigai-instruction-title')
            .replace(/diagnostics-instruction-text/g, 'ikigai-instruction-text')
            // also normalize existing ikigai-prefixed classes (no-op but safe)
            .replace(/ikigai-instruction/g, 'ikigai-instruction')
            .replace(/ikigai-instruction-list/g, 'ikigai-instruction-list')
            .replace(/ikigai-instruction-item/g, 'ikigai-instruction-item')
            .replace(/ikigai-instruction-emoji/g, 'ikigai-instruction-emoji')
            .replace(/ikigai-instruction-content/g, 'ikigai-instruction-content')
            .replace(/ikigai-instruction-title/g, 'ikigai-instruction-title')
            .replace(/ikigai-instruction-text/g, 'ikigai-instruction-text')
        }
      } catch (e) {
        // If parsing fails, fallback to rendering whole description as before
        introHtml = welcome?.description || ''
        instructionHtml = ''
      }
    }

    return (
      <div className="diagnostics-container">
        <Header
          onAvatarClick={onAvatarClick || onBack}
          onConsultation={onConsultation}
          onBack={onBack}
          onAlchemyClick={onAlchemyClick}
          onHomeClick={onHomeClick}
          onChatClick={onChatClick}
          activeMenuId="diagnostics"
        />
        <div className="diagnostics-intro">
          <div className="diagnostics-intro-content">
            <h1 className="diagnostics-intro-title">{welcome?.title}</h1>

            {/* Render intro (main + sub) */}
            {introHtml && (
              <div dangerouslySetInnerHTML={{ __html: introHtml }} />
            )}

            {/* Render instruction block separately and apply ikigai styles */}
            {instructionHtml ? (
              <div dangerouslySetInnerHTML={{ __html: instructionHtml }} />
            ) : (
              // fallback for older tests that have no separate instruction block
              <div className="diagnostics-instruction-box" style={{
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                padding: '20px',
                margin: '20px 0',
                textAlign: 'left',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                lineHeight: '1.6'
              }}>
                <div dangerouslySetInnerHTML={{ __html: welcome?.description }} />
              </div>
            )}

            <button className="diagnostics-start-btn" onClick={handleStart}>{welcome?.buttonText || 'Начать диагностику'}</button>
          </div>
        </div>
      </div>
    )
  }

  if (showResults) {
    const calc = calculateResults()

    // IKIGAI result view
    if (settings.logicType === 'IKIGAI') {
      const formattedDesc = (calc.result?.description || '')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br />')

      return (
        <div className="diagnostics-container">
          <Header
            onBack={onBack}
            onConsultation={onConsultation}
            onAlchemyClick={onAlchemyClick}
            onHomeClick={onHomeClick}
            onChatClick={onChatClick}
            activeMenuId="diagnostics"
          />

          {/* Use canonical diagnostics layout so the results title is consistently
              positioned just below the fixed Header. We rely on CSS variables
              (--app-header-height) defined in Header.css and Diagnostics.css so
              the title remains visible and doesn't get hidden behind the header. */}
          <div className="diagnostics-results">
            <div className="diagnostics-results-content" style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center', padding: '20px' }}>
              <div style={{ width: '100%', maxWidth: 840, textAlign: 'center', color: 'rgba(255,255,255,0.9)', fontSize: 16, fontWeight: 600, letterSpacing: '1.2px', marginBottom: 2 }}>Ваш результат:</div>
              <h1 className="diagnostics-results-title">{calc.result?.title}</h1>

              {/* Central block: diagram - fixed sized container, centered */}
              <div style={{ width: '100%', maxWidth: 520, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IkigaiVenn data={calc.sectorScores} sectors={calc.sectors} threshold={settings.threshold} size={420} />
              </div>

              {/* Description block (conclusion-wrapper with avatar) */}
              <motion.div
                className="conclusion-wrapper"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12, duration: 0.45 }}
                style={{ width: '100%', maxWidth: 840, display: 'flex', gap: 16, alignItems: 'flex-start' }}
              >
                <img src="/images/me.jpg" alt="Эксперт" className="conclusion-avatar" />
                <div className="conclusion-text" dangerouslySetInnerHTML={{ __html: formattedDesc }} />
              </motion.div>

              {/* Buttons at the bottom, full-width centered */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22, duration: 0.45 }}
                style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 6 }}
              >
                <button className="diagnostics-consultation-btn diagnostics-fix-btn" onClick={handleIkigaiDiscuss}>
                  <span className="btn-glow"></span>
                  Обсудить результат с экспертом
                </button>
              </motion.div>
            </div>
          </div>
        </div>
      )
    }

    // ONBOARDING result view (same layout as ikigai: title + description, no chart)
    if (settings.logicType === 'ONBOARDING') {
      const result = calc.result || {}
      const formattedDesc = (result.description || '')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br />')

      return (
        <div className="diagnostics-container">
          <Header
            onBack={onBack}
            onConsultation={onConsultation}
            onAlchemyClick={onAlchemyClick}
            onHomeClick={onHomeClick}
            onChatClick={onChatClick}
            activeMenuId="diagnostics"
          />
          <div className="diagnostics-results">
            <div className="diagnostics-results-content" style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center', padding: '20px' }}>
              <div style={{ width: '100%', maxWidth: 840, textAlign: 'center', color: 'rgba(255,255,255,0.9)', fontSize: 16, fontWeight: 600, letterSpacing: '1.2px', marginBottom: 2 }}>Ваш результат:</div>
              <h1 className="diagnostics-results-title">{result.title}</h1>
              <motion.div
                className="conclusion-wrapper"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12, duration: 0.45 }}
                style={{ width: '100%', maxWidth: 840, display: 'flex', gap: 16, alignItems: 'flex-start' }}
              >
                <img src="/images/me.jpg" alt="Эксперт" className="conclusion-avatar" />
                <div className="conclusion-text" dangerouslySetInnerHTML={{ __html: formattedDesc }} />
              </motion.div>
            </div>
          </div>
        </div>
      )
    }

    // Diagnostics-style result view
    const { results, critical, unstable, strong } = calc
    const detailedConclusion = getDetailedConclusion(critical, unstable, strong)

    return (
      <div className="diagnostics-container diagnostics-container-results">
        <Header
          onBack={onBack}
          onConsultation={onConsultation}
          onAlchemyClick={onAlchemyClick}
          onHomeClick={onHomeClick}
          onChatClick={onChatClick}
          activeMenuId="diagnostics"
        />
        <div className="diagnostics-results">
          <div className="diagnostics-results-content">
            <h1 className="diagnostics-results-title">Результаты диагностики</h1>

            {/* Funnel visualization (3D) */}
            <Funnel3D results={results} />

            {/* Analysis sections */}
            <div className="diagnostics-analysis">
              {critical.length > 0 && (
                <div className="analysis-section">
                  <div className="analysis-section-header analysis-critical">
                    <div className="analysis-icon">🔴</div>
                    <div className="analysis-section-title">
                      <strong>Основные утечки системы</strong>
                      {critical.length > 1 && <span className="analysis-count"> ({critical.length})</span>}
                    </div>
                  </div>
                  <div className="analysis-section-items">
                    {critical.map(item => (
                      <div key={item.id} className="analysis-item analysis-critical">
                        <div className="analysis-item-content">
                          <span className="analysis-item-name">{item.name}</span>
                          <span className="analysis-item-score">{item.score}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {unstable.length > 0 && (
                <div className="analysis-section">
                  <div className="analysis-section-header analysis-unstable">
                    <div className="analysis-icon">🟡</div>
                    <div className="analysis-section-title">
                      <strong>Зоны нестабильности</strong>
                      {unstable.length > 1 && <span className="analysis-count"> ({unstable.length})</span>}
                    </div>
                  </div>
                  <div className="analysis-section-items">
                    {unstable.map(item => (
                      <div key={item.id} className="analysis-item analysis-unstable">
                        <div className="analysis-item-content">
                          <span className="analysis-item-name">{item.name}</span>
                          <span className="analysis-item-score">{item.score}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {strong.length > 0 && (
                <div className="analysis-section">
                  <div className="analysis-section-header analysis-strong">
                    <div className="analysis-icon">🟢</div>
                    <div className="analysis-section-title">
                      <strong>Сильные стороны</strong>
                      {strong.length > 1 && <span className="analysis-count"> ({strong.length})</span>}
                    </div>
                  </div>
                  <div className="analysis-section-items">
                    {strong.map(item => (
                      <div key={item.id} className="analysis-item analysis-strong">
                        <div className="analysis-item-content">
                          <span className="analysis-item-name">{item.name}</span>
                          <span className="analysis-item-score">{item.score}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Conclusion */}
            <div className="diagnostics-conclusion">
              <div className="conclusion-wrapper">
                <img src="/images/me.jpg" alt="Эксперт" className="conclusion-avatar" />
                <div className="conclusion-text" dangerouslySetInnerHTML={{
                  __html: detailedConclusion
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/• /g, '<span class="list-marker">•</span> ')
                    .replace(/(\d+)\. /g, '<span class="list-number">$1.</span> ')
                    .replace(/\n\n+/g, '<br /><br />')
                    .replace(/\n/g, '<br />')
                    .replace(/🔴|🟡|✅/g, '')
                }} />
              </div>
            </div>

            {/* Final CTA block */}
            <motion.div
              className="diagnostics-final-block"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <h2 className="final-block-title">Готовы улучшить свою воронку?</h2>
              <p className="final-block-text">
                {critical.length > 0
                  ? 'На консультации мы разберём конкретные шаги по устранению критических зон и выстроим работающую систему продаж. Вы получите чёткий план действий с приоритетами.'
                  : unstable.length > 0 && strong.length > 0
                  ? 'На консультации мы выровняем нестабильные этапы, используя опыт из ваших сильных зон. Разберём, как масштабировать успешные части системы.'
                  : strong.length === results.length
                  ? 'На консультации мы обсудим стратегию масштабирования: как увеличить трафик, масштабировать воронку и максимизировать прибыль от работающей системы.'
                  : 'На консультации мы разберём каждый этап вашей воронки и сформируем конкретный план улучшений для роста продаж.'
                }
              </p>
              <div className="final-block-benefits">
                <div className="benefit-item">
                  <span className="benefit-icon">✓</span>
                  <span>Глубокий анализ текущей ситуации</span>
                </div>
                <div className="benefit-item">
                  <span className="benefit-icon">✓</span>
                  <span>Конкретный план улучшений с приоритетами</span>
                </div>
                <div className="benefit-item">
                  <span className="benefit-icon">✓</span>
                  <span>Внедрение инструментов для оптимизации воронки</span>
                </div>
              </div>
            </motion.div>

            <div className="diagnostics-consultation">
              <button className="diagnostics-consultation-btn diagnostics-fix-btn" onClick={handleResultsConsultation}>
                <span className="btn-glow"></span>
                Обсудить план действий
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const currentQuestion = allQuestions[currentStep - 1]
  // Normalize answer options into a single array so we can safely reference its length.
  // Support per-question embedded options (currentQuestion.options or currentQuestion.answerOptions),
  // a global map `answerOptions` keyed by question id, or a shared `commonAnswerOptions`.
  // Options may use either .label or .text for display.
  const rawOptions = (currentQuestion && (
    currentQuestion.options ||
    currentQuestion.answerOptions ||
    (answerOptions && answerOptions[currentQuestion.id]) ||
    commonAnswerOptions
  )) || (commonAnswerOptions || [])
  const optionsToRender = rawOptions.map(opt => ({ ...opt, label: opt.label ?? opt.text }))
  return (
    <div className="diagnostics-container">
      <Header
        onBack={() => setCurrentStep(currentStep - 1)}
        onConsultation={onConsultation}
        onAlchemyClick={onAlchemyClick}
        onHomeClick={onHomeClick}
        onAvatarClick={onAvatarClick}
        onChatClick={onChatClick}
        activeMenuId="diagnostics"
      />
      <div className="diagnostics-question">
        <div className="diagnostics-progress">
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${(currentStep / totalQuestions) * 100}%` }}
            />
          </div>
          <div className="progress-text">Вопрос {currentStep} из {totalQuestions}</div>
        </div>

        <div className="question-content">
          <div className="question-content-wrapper">
            <div className="question-stage">
              {currentQuestion?.stageImage && (
                <img src={currentQuestion.stageImage} alt={currentQuestion.stageName} className="question-stage-image" />
              )}
              <div>
                <h2 className="question-stage-name">{currentQuestion?.stageName}</h2>
                {currentQuestion?.stageSubtitle && (
                  <p className="question-stage-subtitle">{currentQuestion.stageSubtitle}</p>
                )}
              </div>
            </div>

            <div className="message-wrapper message-wrapper-left">
              <img src="/images/me.jpg" alt="Аватар" className="message-avatar" />
              <div className="dialog-message question-message visible">
                <span className="message-arrow message-arrow-left">◂</span>
                <p>{currentQuestion?.text}</p>
              </div>
            </div>
          </div>

          <div className="answer-options">
              {optionsToRender.map((opt, i) => {
                const isLast = i === optionsToRender.length - 1
                return (
                  <button
                    key={i}
                    className={`dialog-message answer-message poll-option visible ${answers[currentQuestion?.id] === opt.value ? 'selected' : ''}`}
                    onClick={() => handleAnswer(currentQuestion.id, opt.value)}
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  >
                    <div className="answer-option-label">{opt.label}</div>
                    {answers[currentQuestion?.id] === opt.value && (
                      <div className="poll-checkmark">✓</div>
                    )}
                    {isLast && <span className="message-arrow message-arrow-right">▸</span>}
                  </button>
                )
              })}
            </div>
         </div>
      </div>
    </div>
  )
}

export default UniversalTest
