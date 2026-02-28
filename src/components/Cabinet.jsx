import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import './Cabinet.css'
import Header from './Header'
import { getSupabase } from '../utils/supabaseClient'
import { useLogEvent } from '../hooks/useLogEvent'
import { userUtils } from '../utils/logging'
import { fetchWithTimeout } from '../utils/fetchWithTimeout'
import { yandexMetricaReachGoal } from '../analytics/yandexMetrica'

const APP_CONFIG_KEY = 'cabinet-zones'

const IMAGE_ASPECT = 1 // 1:1

const STORAGE_KEY = 'cabinet-zones'

const MIN_POINTS = 3

const CABINET_BG_URLS = {
  default: '/images/kabexp.png',
  tea: '/images/kabexptea.png',
  laugh: '/images/kabexpLaught.png'
}

let currentTTSAudio = null

/** Озвучка через Edge TTS (женский голос Svetlana). При ошибке — fallback на Web Speech API. */
async function playWithEdgeTTS(text, onEnd) {
  if (typeof window === 'undefined' || !text || !text.trim()) {
    onEnd?.()
    return false
  }
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.trim() })
    })
    if (!res.ok) {
      let msg = res.statusText
      let code
      let hint
      try {
        const j = await res.json()
        if (j?.message) msg = j.message
        if (j?.code) code = j.code
        if (j?.hint) hint = j.hint
      } catch (_) {}
      if (import.meta.env?.DEV && (code || hint)) {
        console.warn('[Cabinet TTS]', msg, code ? `code: ${code}` : '', hint || '')
      }
      throw new Error(msg)
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    if (currentTTSAudio) {
      currentTTSAudio.pause()
      currentTTSAudio = null
    }
    const audio = new window.Audio(url)
    currentTTSAudio = audio
    audio.onended = () => {
      URL.revokeObjectURL(url)
      currentTTSAudio = null
      onEnd?.()
    }
    audio.onerror = () => {
      URL.revokeObjectURL(url)
      currentTTSAudio = null
      onEnd?.()
    }
    await audio.play()
    return true
  } catch (err) {
    if (import.meta.env?.DEV) {
      console.warn('[Cabinet TTS] Озвучка Светланы недоступна (запустите npm run dev:server для локальной разработки). Используется голос браузера.', err?.message || err)
    }
    return false
  }
}

function stopTTSPlayback() {
  if (currentTTSAudio) {
    currentTTSAudio.pause()
    currentTTSAudio = null
  }
}

/** Озвучивает цитату чая через gTTS (API), с паузой 1 с между текстом и подписью. Без fallback на Web Speech. */
async function speakTeaQuote(text, author, onEnd) {
  const PAUSE_MS = 1000
  const parts = [text, author].filter(Boolean)
  if (parts.length === 0) {
    onEnd?.()
    return
  }

  const playPart = async (index) => {
    if (index >= parts.length) {
      onEnd?.()
      return
    }
    const part = parts[index]
    const whenPartEnds = () => {
      if (index + 1 < parts.length) {
        setTimeout(() => playPart(index + 1), PAUSE_MS)
      } else {
        onEnd?.()
      }
    }

    const used = await playWithEdgeTTS(part, whenPartEnds)
    if (!used) whenPartEnds()
  }

  await playPart(0)
}

const MAX_POINTS = 8

function isPolygonPoints(z, minLen = MIN_POINTS) {
  return z && Array.isArray(z.points) && z.points.length >= minLen &&
    z.points.every((p) => typeof p?.x === 'number' && typeof p?.y === 'number')
}

/** Изменить число вершин: при увеличении — добавляем точку (середина между последней и первой), при уменьшении — обрезаем */
function resizePoints(points, newLen) {
  const n = Math.max(MIN_POINTS, Math.min(MAX_POINTS, Math.round(newLen)))
  const arr = points.slice(0, n).map((p) => ({ ...p }))
  while (arr.length < n) {
    const last = arr[arr.length - 1]
    const first = arr[0]
    arr.push({ x: (last.x + first.x) / 2, y: (last.y + first.y) / 2 })
  }
  return arr
}

function rectToPoints(x, y, width, height) {
  const hw = width / 2
  const hh = height / 2
  return [
    { x: x - hw, y: y - hh },
    { x: x + hw, y: y - hh },
    { x: x + hw, y: y + hh },
    { x: x - hw, y: y + hh }
  ]
}

/** Центроид многоугольника (среднее X и Y в %) — чтобы подпись попадала внутрь clip-path */
function polygonCentroid(points) {
  if (!points?.length) return { x: 50, y: 50 }
  const sumX = points.reduce((s, p) => s + p.x, 0)
  const sumY = points.reduce((s, p) => s + p.y, 0)
  return { x: sumX / points.length, y: sumY / points.length }
}

/** Проверка: точка (x, y) в % внутри многоугольника (массив {x, y} в %) */
function pointInPolygon(x, y, points) {
  let inside = false
  const n = points.length
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = points[i].x
    const yi = points[i].y
    const xj = points[j].x
    const yj = points[j].y
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside
  }
  return inside
}

/** Валидация и нормализация объекта зон (из localStorage или Supabase) */
function parseZonesPayload(v) {
  if (!v || typeof v !== 'object') return null
  if (!v.yinyang || typeof v.yinyang.x !== 'number' || typeof v.yinyang.y !== 'number' || typeof v.yinyang.size !== 'number') return null
  let book = v.book
  if (!isPolygonPoints(book)) {
    if (book && typeof book.x === 'number' && typeof book.y === 'number' && typeof book.width === 'number' && typeof book.height === 'number') {
      book = { points: rectToPoints(book.x, book.y, book.width, book.height) }
    } else {
      book = { points: DEFAULT_BOOK.points.map((p) => ({ ...p })) }
    }
  }
  let laptop = v.laptop
  if (!isPolygonPoints(laptop)) laptop = { points: DEFAULT_LAPTOP.points.map((p) => ({ ...p })) }
  let leftCabinet = v.leftCabinet
  if (!isPolygonPoints(leftCabinet)) leftCabinet = { points: DEFAULT_LEFT_CABINET.points.map((p) => ({ ...p })) }
  let rightCabinet = v.rightCabinet
  if (!isPolygonPoints(rightCabinet)) rightCabinet = { points: DEFAULT_RIGHT_CABINET.points.map((p) => ({ ...p })) }
  let tea = v.tea
  if (!isPolygonPoints(tea)) tea = { points: DEFAULT_TEA.points.map((p) => ({ ...p })) }
  let expert = v.expert
  if (!isPolygonPoints(expert)) expert = { points: DEFAULT_EXPERT.points.map((p) => ({ ...p })) }
  return { yinyang: v.yinyang, book, laptop, leftCabinet, rightCabinet, tea, expert }
}

function loadZones() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return parseZonesPayload(JSON.parse(raw))
  } catch (_) {}
  return null
}

const DEFAULT_YINYANG = {
  x: 50,
  y: 35,
  size: 18
}

// Четырёхугольник по 4 точкам (% от изображения): порядок — верх-лево, верх-право, низ-право, низ-лево
const DEFAULT_BOOK = {
  points: [
    { x: 28, y: 53 },
    { x: 42, y: 55 },
    { x: 40, y: 72 },
    { x: 30, y: 70 }
  ]
}

const DEFAULT_LAPTOP = {
  points: [
    { x: 55, y: 45 },
    { x: 75, y: 48 },
    { x: 72, y: 68 },
    { x: 58, y: 65 }
  ]
}

const DEFAULT_LEFT_CABINET = {
  points: [
    { x: 10, y: 40 },
    { x: 28, y: 42 },
    { x: 26, y: 75 },
    { x: 12, y: 73 }
  ]
}

const DEFAULT_RIGHT_CABINET = {
  points: [
    { x: 72, y: 40 },
    { x: 90, y: 42 },
    { x: 88, y: 75 },
    { x: 74, y: 73 }
  ]
}

const DEFAULT_TEA = {
  points: [
    { x: 38, y: 48 },
    { x: 52, y: 50 },
    { x: 50, y: 65 },
    { x: 40, y: 63 }
  ]
}

const TEA_QUOTES = [
  { author: 'Лу Юй', text: '«Чай особенно подходит людям чистого поведения и скромной добродетели».' },
  { author: 'Китайская пословица', text: '«Лучше три дня без пищи, чем один день без чая».' },
  { author: 'Чань-буддийская формула', text: '«Чай и дзен — одного вкуса».' },
  { author: 'Русская поговорка', text: '«Чай пить — не дрова рубить».' },
  { author: 'Чжаочжоу', text: 'Монах спрашивает о пути. Мастер отвечает: «Пей чай».' },
  { author: 'Нативная реклама!', text: 'Недавно была в Сочи. Там есть прекрасный чайный клуб, называется Мэр-Пуэр.' },
  { author: 'Нативная реклама', text: 'В Перми лучший чай можно найти в доме чая и шёлка Красота востока.' }
]

const DEFAULT_EXPERT = {
  points: [
    { x: 50, y: 25 },
    { x: 65, y: 26 },
    { x: 70, y: 35 },
    { x: 62, y: 42 },
    { x: 52, y: 38 }
  ]
}

function Cabinet() {
  const { logContentView, trackSectionView, logEvent } = useLogEvent()
  const navigate = useNavigate()
  const containerRef = useRef(null)
  const [zoneStyles, setZoneStyles] = useState({ yinyang: null, book: null, laptop: null, leftCabinet: null, rightCabinet: null, tea: null, expert: null })
  const saved = loadZones()
  const [coordsYinyang, setCoordsYinyang] = useState(() => saved?.yinyang ? { ...saved.yinyang } : { ...DEFAULT_YINYANG })
  const [coordsBook, setCoordsBook] = useState(() => {
    const b = saved?.book
    if (b && isPolygonPoints(b)) return { points: b.points.map((p) => ({ ...p })) }
    return { points: DEFAULT_BOOK.points.map((p) => ({ ...p })) }
  })
  const [coordsLaptop, setCoordsLaptop] = useState(() => {
    const L = saved?.laptop
    if (L && isPolygonPoints(L)) return { points: L.points.map((p) => ({ ...p })) }
    return { points: DEFAULT_LAPTOP.points.map((p) => ({ ...p })) }
  })
  const [coordsLeftCabinet, setCoordsLeftCabinet] = useState(() => {
    const L = saved?.leftCabinet
    if (L && isPolygonPoints(L)) return { points: L.points.map((p) => ({ ...p })) }
    return { points: DEFAULT_LEFT_CABINET.points.map((p) => ({ ...p })) }
  })
  const [coordsRightCabinet, setCoordsRightCabinet] = useState(() => {
    const R = saved?.rightCabinet
    if (R && isPolygonPoints(R)) return { points: R.points.map((p) => ({ ...p })) }
    return { points: DEFAULT_RIGHT_CABINET.points.map((p) => ({ ...p })) }
  })
  const [coordsTea, setCoordsTea] = useState(() => {
    const T = saved?.tea
    if (T && isPolygonPoints(T)) return { points: T.points.map((p) => ({ ...p })) }
    return { points: DEFAULT_TEA.points.map((p) => ({ ...p })) }
  })
  const [coordsExpert, setCoordsExpert] = useState(() => {
    const E = saved?.expert
    if (E && isPolygonPoints(E)) return { points: E.points.map((p) => ({ ...p })) }
    return { points: DEFAULT_EXPERT.points.map((p) => ({ ...p })) }
  })
  const [selectedZone, setSelectedZone] = useState('yinyang')
  const [showDebug, setShowDebug] = useState(() =>
    typeof window !== 'undefined' &&
    (window.location.hash === '#cabinet-debug' || localStorage.getItem('app_debug_mode') === 'true')
  )
  const [showTeaOverlay, setShowTeaOverlay] = useState(false)
  const [showLaughBackground, setShowLaughBackground] = useState(false)
  const [teaQuoteIndex, setTeaQuoteIndex] = useState(0)
  const laughTimerRef = useRef(null)
  const [showExpertOverlay, setShowExpertOverlay] = useState(false)
  const [expertMessages, setExpertMessages] = useState([])
  const [expertInput, setExpertInput] = useState('')
  const [isLoadingExpert, setIsLoadingExpert] = useState(false)
  const [showFullExpertHistory, setShowFullExpertHistory] = useState(false)
  const [saveToast, setSaveToast] = useState(null)
  const [now, setNow] = useState(() => new Date())
  const [showLabelsAndGlow, setShowLabelsAndGlow] = useState(false)
  const saveToastRef = useRef(null)
  const [bgFront, setBgFront] = useState('default')
  const [bgBack, setBgBack] = useState('default')
  const [expertUserName, setExpertUserName] = useState('Путник')
  const [isSoundMuted, setIsSoundMuted] = useState(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('app_sound_enabled') === 'false') return true
    return localStorage.getItem('cabinet-sound-muted') === 'true'
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const user = window.Telegram?.WebApp?.initDataUnsafe?.user ?? window.TelegramWebApp?.initDataUnsafe?.user
    const name = user ? (user.first_name || user.username || 'Путник') : 'Путник'
    setExpertUserName(name)
  }, [])

  useEffect(() => {
    localStorage.setItem('cabinet-sound-muted', String(isSoundMuted))
  }, [isSoundMuted])

  const handleToggleSound = () => setIsSoundMuted((prev) => !prev)

  useEffect(() => {
    const next = showLaughBackground ? 'laugh' : showTeaOverlay ? 'tea' : 'default'
    setBgFront((prev) => {
      if (prev === next) return prev
      setBgBack(prev)
      return next
    })
  }, [showTeaOverlay, showLaughBackground])

  useEffect(() => {
    Object.values(CABINET_BG_URLS).forEach((src) => {
      const img = new Image()
      img.src = src
    })
  }, [])

  useEffect(() => {
    const img = new Image()
    let timeoutId = null
    const onDone = () => {
      timeoutId = setTimeout(() => setShowLabelsAndGlow(true), 2000)
    }
    img.onload = onDone
    img.onerror = onDone
    img.src = '/images/kabexp.png'
    return () => {
      img.onload = null
      img.onerror = null
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [])

  useEffect(() => {
    const tick = () => setNow(new Date())
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => () => {
    if (saveToastRef.current) clearTimeout(saveToastRef.current)
    if (laughTimerRef.current) clearTimeout(laughTimerRef.current)
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel()
    stopTTSPlayback()
  }, [])

  // Загрузка зон из Supabase при монтировании (сохраняется после публикации)
  useEffect(() => {
    let cancelled = false
    getSupabase()
      .then((supabase) => {
        if (!supabase || cancelled) return
        return supabase.from('app_config').select('value').eq('key', APP_CONFIG_KEY).single()
      })
      .then((res) => {
        if (cancelled || !res?.data?.value) return
        const parsed = parseZonesPayload(res.data.value)
        if (!parsed) return
        setCoordsYinyang({ ...parsed.yinyang })
        setCoordsBook({ points: parsed.book.points.map((p) => ({ ...p })) })
        setCoordsLaptop({ points: parsed.laptop.points.map((p) => ({ ...p })) })
        setCoordsLeftCabinet({ points: parsed.leftCabinet.points.map((p) => ({ ...p })) })
        setCoordsRightCabinet({ points: parsed.rightCabinet.points.map((p) => ({ ...p })) })
        setCoordsTea({ points: parsed.tea.points.map((p) => ({ ...p })) })
        setCoordsExpert({ points: parsed.expert.points.map((p) => ({ ...p })) })
        const payload = {
          yinyang: parsed.yinyang,
          book: parsed.book,
          laptop: parsed.laptop,
          leftCabinet: parsed.leftCabinet,
          rightCabinet: parsed.rightCabinet,
          tea: parsed.tea,
          expert: parsed.expert
        }
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
        } catch (_) {}
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    logContentView('page', 'cabinet', {
      contentTitle: 'Кабинет',
      page: '/cabinet'
    })
    trackSectionView('cabinet')
    yandexMetricaReachGoal(null, 'cabinet_page_view')
  }, [logContentView, trackSectionView])

  useEffect(() => {
    const updateZones = () => {
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      /* Квадратная картинка везде вписывается целиком (contain): зоны считаем в этих границах */
      let imgLeft, imgTop, imgW, imgH
      if (w >= h) {
        imgH = h
        imgW = h * IMAGE_ASPECT
        imgLeft = (w - imgW) / 2
        imgTop = 0
      } else {
        imgW = w
        imgH = w / IMAGE_ASPECT
        imgLeft = 0
        imgTop = (h - imgH) / 2
      }
      const baseW = Math.min(imgW, imgH)
      const yinyangSize = baseW * (coordsYinyang.size / 100)
      const bookClip = coordsBook.points.map((p) => `${p.x}% ${p.y}%`).join(', ')
      const laptopClip = coordsLaptop.points.map((p) => `${p.x}% ${p.y}%`).join(', ')
      const leftCabinetClip = coordsLeftCabinet.points.map((p) => `${p.x}% ${p.y}%`).join(', ')
      const rightCabinetClip = coordsRightCabinet.points.map((p) => `${p.x}% ${p.y}%`).join(', ')
      const teaClip = coordsTea.points.map((p) => `${p.x}% ${p.y}%`).join(', ')
      const expertClip = coordsExpert.points.map((p) => `${p.x}% ${p.y}%`).join(', ')
      setZoneStyles({
        yinyang: {
          left: imgLeft + imgW * (coordsYinyang.x / 100) - yinyangSize / 2,
          top: imgTop + imgH * (coordsYinyang.y / 100) - yinyangSize / 2,
          width: yinyangSize,
          height: yinyangSize
        },
        book: {
          left: imgLeft,
          top: imgTop,
          width: imgW,
          height: imgH,
          clipPath: `polygon(${bookClip})`
        },
        laptop: {
          left: imgLeft,
          top: imgTop,
          width: imgW,
          height: imgH,
          clipPath: `polygon(${laptopClip})`
        },
        leftCabinet: {
          left: imgLeft,
          top: imgTop,
          width: imgW,
          height: imgH,
          clipPath: `polygon(${leftCabinetClip})`
        },
        rightCabinet: {
          left: imgLeft,
          top: imgTop,
          width: imgW,
          height: imgH,
          clipPath: `polygon(${rightCabinetClip})`
        },
        tea: {
          left: imgLeft,
          top: imgTop,
          width: imgW,
          height: imgH,
          clipPath: `polygon(${teaClip})`
        },
        expert: {
          left: imgLeft,
          top: imgTop,
          width: imgW,
          height: imgH,
          clipPath: `polygon(${expertClip})`
        }
      })
    }
    updateZones()
    window.addEventListener('resize', updateZones)
    return () => window.removeEventListener('resize', updateZones)
  }, [coordsYinyang, coordsBook, coordsLaptop, coordsLeftCabinet, coordsRightCabinet, coordsTea, coordsExpert])

  const handleAlchemyClick = () => navigate('/alchemy')

  const handleBookClick = (e) => {
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    if (pointInPolygon(x, y, coordsBook.points)) navigate('/profile/about')
  }

  const handleLaptopClick = (e) => {
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    if (pointInPolygon(x, y, coordsLaptop.points)) navigate('/admin')
  }

  const handleLeftCabinetClick = (e) => {
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    if (pointInPolygon(x, y, coordsLeftCabinet.points)) navigate('/cabinet/shelf')
  }

  const handleRightCabinetClick = (e) => {
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    if (pointInPolygon(x, y, coordsRightCabinet.points)) navigate('/cabinet/shelf')
  }

  const handleTeaClick = (e) => {
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    if (!pointInPolygon(x, y, coordsTea.points)) return
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel()
    stopTTSPlayback()
    const nativeIndex = TEA_QUOTES.findIndex((q) => q.author === 'Нативная реклама!')
    const quoteIndex = Math.random() < 0.4
      ? nativeIndex >= 0 ? nativeIndex : 0
      : Math.floor(Math.random() * TEA_QUOTES.length)
    setTeaQuoteIndex(quoteIndex)
    setShowTeaOverlay(true)
    const quote = TEA_QUOTES[quoteIndex]
    const onQuoteEnd = () => {
      setShowTeaOverlay(false)
      if (quote.author === 'Нативная реклама!') {
        setShowLaughBackground(true)
        if (laughTimerRef.current) clearTimeout(laughTimerRef.current)
        laughTimerRef.current = setTimeout(() => {
          setShowLaughBackground(false)
          laughTimerRef.current = null
        }, 5000)
      }
    }
    if (isSoundMuted) {
      setTimeout(onQuoteEnd, 4000)
    } else {
      speakTeaQuote(quote.text, quote.author, onQuoteEnd)
    }
  }

  const handleExpertClick = (e) => {
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    if (!pointInPolygon(x, y, coordsExpert.points)) return
    setShowExpertOverlay(true)
  }

  const getTgUserId = () => {
    if (typeof window === 'undefined') return null
    const u = window.Telegram?.WebApp?.initDataUnsafe?.user ?? window.TelegramWebApp?.initDataUnsafe?.user
    return u?.id != null ? String(u.id) : null
  }

  const expertInitDoneRef = useRef(false)

  const saveExpertMessage = useCallback(async (direction, text) => {
    const supabase = await getSupabase()
    if (!supabase) return
    const tgUserId = getTgUserId()
    const cookieId = userUtils.getCookieId()
    if (!tgUserId && !cookieId) return
    await supabase.from('cabinet_expert_chat_messages').insert({
      tg_user_id: tgUserId ? Number(tgUserId) : null,
      cookie_id: cookieId || null,
      direction,
      message_text: text
    })
  }, [])

  const initExpertDialogue = useCallback(async () => {
    setIsLoadingExpert(true)
    try {
      const response = await fetchWithTimeout('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: '[Пользователь открыл диалог. Инициируй разговор: поприветствуй и задай направляющий вопрос о том, что привело его в кабинет.]',
          promptType: 'cabinet_expert',
          userName: expertUserName,
          messageCount: 0,
          history: []
        })
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        console.warn('[Cabinet Expert] API не 200:', response.status, data)
      }
      const aiResponse = data.response || 'Чувствуете глубину? Что привело вас в этот кабинет?'
      setExpertMessages((prev) => [...prev, { role: 'assistant', content: aiResponse }])
      await saveExpertMessage('outbound', aiResponse)
    } catch (_) {
      const fallback = 'Чувствуете глубину? Что привело вас в этот кабинет?'
      setExpertMessages((prev) => [...prev, { role: 'assistant', content: fallback }])
      await saveExpertMessage('outbound', fallback)
    } finally {
      setIsLoadingExpert(false)
    }
  }, [saveExpertMessage, expertUserName])

  const loadExpertHistory = useCallback(async () => {
    const supabase = await getSupabase()
    if (!supabase) return
    const tgUserId = getTgUserId()
    const cookieId = userUtils.getCookieId()
    let rows = []
    if (tgUserId) {
      const { data } = await supabase
        .from('cabinet_expert_chat_messages')
        .select('direction, message_text, created_at')
        .eq('tg_user_id', Number(tgUserId))
        .order('created_at', { ascending: true })
      rows = data || []
    } else if (cookieId) {
      const { data } = await supabase
        .from('cabinet_expert_chat_messages')
        .select('direction, message_text, created_at')
        .eq('cookie_id', cookieId)
        .order('created_at', { ascending: true })
      rows = data || []
    }
    const msgs = rows.map((r) => ({
      role: r.direction === 'inbound' ? 'user' : 'assistant',
      content: r.message_text || ''
    }))
    setExpertMessages(msgs)
    if (msgs.length === 0 && !expertInitDoneRef.current) {
      expertInitDoneRef.current = true
      initExpertDialogue()
    }
  }, [initExpertDialogue])

  useEffect(() => {
    if (showExpertOverlay) {
      loadExpertHistory()
    } else {
      expertInitDoneRef.current = false
      if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel()
      stopTTSPlayback()
    }
  }, [showExpertOverlay, loadExpertHistory])

  const renderExpertMessage = (text) => {
    if (!text) return null
    const elements = []
    const markdownRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g
    let lastIndex = 0
    let match
    while ((match = markdownRegex.exec(text)) !== null) {
      if (match.index > lastIndex) elements.push(text.slice(lastIndex, match.index))
      elements.push(
        <a key={`link-${elements.length}`} href={match[2]} target="_blank" rel="noopener noreferrer" className="cabinet-expert-link">
          {match[1]}
        </a>
      )
      lastIndex = match.lastIndex
    }
    let tail = lastIndex < text.length ? text.slice(lastIndex) : ''
    const urlRegex = /https?:\/\/[^\s\]\)]+/g
    const urlMatches = [...tail.matchAll(urlRegex)]
    if (urlMatches.length > 0) {
      let i = 0
      urlMatches.forEach((m, idx) => {
        const start = m.index
        if (start > i) elements.push(tail.slice(i, start))
        elements.push(
          <a key={`url-${idx}`} href={m[0]} target="_blank" rel="noopener noreferrer" className="cabinet-expert-link">
            Перейти по ссылке
          </a>
        )
        i = start + m[0].length
      })
      if (i < tail.length) elements.push(tail.slice(i))
    } else if (tail) {
      elements.push(tail)
    }
    return elements.length ? elements : text
  }

  const handleExpertSend = async () => {
    if (!expertInput.trim() || isLoadingExpert) return
    const userQuestion = expertInput.trim()
    setExpertInput('')
    setExpertMessages((prev) => [...prev, { role: 'user', content: userQuestion }])
    setIsLoadingExpert(true)
    await saveExpertMessage('inbound', userQuestion)
    const history = [...expertMessages, { role: 'user', content: userQuestion }].map((m) => ({ role: m.role, content: m.content }))
    try {
      const response = await fetchWithTimeout('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userQuestion,
          promptType: 'cabinet_expert',
          userName: expertUserName,
          messageCount: history.filter((m) => m.role === 'user').length + 1,
          history
        })
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        console.warn('[Cabinet Expert] API не 200:', response.status, data)
      }
      const aiResponse = data.response || 'Не удалось получить ответ. Попробуйте ещё раз.'
      setExpertMessages((prev) => [...prev, { role: 'assistant', content: aiResponse }])
      await saveExpertMessage('outbound', aiResponse)
      logEvent('ai', 'ai_chat_message', {
        page: '/cabinet',
        metadata: { context: 'cabinet_expert', user_message: userQuestion, ai_response: aiResponse }
      })
    } catch (err) {
      const errMsg = err?.name === 'AbortError' ? 'Запрос занял слишком много времени.' : (err?.message || 'Ошибка сети.')
      setExpertMessages((prev) => [...prev, { role: 'assistant', content: errMsg }])
      await saveExpertMessage('outbound', errMsg)
    } finally {
      setIsLoadingExpert(false)
    }
  }

  const saveCoords = () => {
    const payload = {
      yinyang: coordsYinyang,
      book: coordsBook,
      laptop: coordsLaptop,
      leftCabinet: coordsLeftCabinet,
      rightCabinet: coordsRightCabinet,
      tea: coordsTea,
      expert: coordsExpert
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    setShowDebug(false)
    getSupabase().then((supabase) => {
      if (!supabase) {
        setSaveToast({ text: 'Supabase не настроен — настройки только в этом браузере', isError: true })
        if (saveToastRef.current) clearTimeout(saveToastRef.current)
        saveToastRef.current = setTimeout(() => { setSaveToast(null); saveToastRef.current = null }, 4000)
        return
      }
      supabase.from('app_config').upsert({ key: APP_CONFIG_KEY, value: payload, updated_at: new Date().toISOString() }, { onConflict: 'key' })
        .then(({ error }) => {
          if (error) {
            setSaveToast({ text: 'Не удалось сохранить в облако: ' + (error.message || 'ошибка'), isError: true })
          } else {
            setSaveToast({ text: 'Сохранено в облако — настройки будут одинаковы во всех браузерах и после публикации', isError: false })
          }
          if (saveToastRef.current) clearTimeout(saveToastRef.current)
          saveToastRef.current = setTimeout(() => { setSaveToast(null); saveToastRef.current = null }, 5000)
        })
        .catch(() => {
          setSaveToast({ text: 'Ошибка сохранения в облако', isError: true })
          if (saveToastRef.current) clearTimeout(saveToastRef.current)
          saveToastRef.current = setTimeout(() => { setSaveToast(null); saveToastRef.current = null }, 4000)
        })
    })
  }

  const resetCurrentZone = () => {
    if (selectedZone === 'yinyang') setCoordsYinyang({ ...DEFAULT_YINYANG })
    else if (selectedZone === 'book') setCoordsBook({ points: DEFAULT_BOOK.points.map((p) => ({ ...p })) })
    else if (selectedZone === 'laptop') setCoordsLaptop({ points: DEFAULT_LAPTOP.points.map((p) => ({ ...p })) })
    else if (selectedZone === 'leftCabinet') setCoordsLeftCabinet({ points: DEFAULT_LEFT_CABINET.points.map((p) => ({ ...p })) })
    else if (selectedZone === 'rightCabinet') setCoordsRightCabinet({ points: DEFAULT_RIGHT_CABINET.points.map((p) => ({ ...p })) })
    else if (selectedZone === 'tea') setCoordsTea({ points: DEFAULT_TEA.points.map((p) => ({ ...p })) })
    else setCoordsExpert({ points: DEFAULT_EXPERT.points.map((p) => ({ ...p })) })
  }

  const resetAllZones = () => {
    setCoordsYinyang({ ...DEFAULT_YINYANG })
    setCoordsBook({ points: DEFAULT_BOOK.points.map((p) => ({ ...p })) })
    setCoordsLaptop({ points: DEFAULT_LAPTOP.points.map((p) => ({ ...p })) })
    setCoordsLeftCabinet({ points: DEFAULT_LEFT_CABINET.points.map((p) => ({ ...p })) })
    setCoordsRightCabinet({ points: DEFAULT_RIGHT_CABINET.points.map((p) => ({ ...p })) })
    setCoordsTea({ points: DEFAULT_TEA.points.map((p) => ({ ...p })) })
    setCoordsExpert({ points: DEFAULT_EXPERT.points.map((p) => ({ ...p })) })
    localStorage.removeItem(STORAGE_KEY)
  }

  const coordsY = coordsYinyang
  const coordsB = coordsBook
  const coordsL = coordsLaptop
  const coordsLCab = coordsLeftCabinet
  const coordsRCab = coordsRightCabinet
  const coordsT = coordsTea
  const coordsE = coordsExpert

  const labelAtCentroid = (points) => {
    const c = polygonCentroid(points)
    return { position: 'absolute', left: `${c.x}%`, top: `${c.y}%`, transform: 'translate(-50%, -50%)' }
  }

  return (
    <div className="cabinet-root">
      <Header
        onAvatarClick={() => navigate('/profile')}
        onConsultation={() => navigate('/diagnostics')}
        onBack={() => navigate('/funnel')}
        onAlchemyClick={() => navigate('/alchemy')}
        onHomeClick={() => navigate('/home')}
        activeMenuId="cabinet"
      />
      <button
        type="button"
        className="cabinet-sound-toggle"
        onClick={handleToggleSound}
        title={isSoundMuted ? 'Включить озвучку' : 'Выключить озвучку'}
        aria-label={isSoundMuted ? 'Включить озвучку' : 'Выключить озвучку'}
      >
        {isSoundMuted ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16.5 12C16.5 10.23 15.48 8.71 14 7.97V10.18L16.45 12.63C16.48 12.43 16.5 12.22 16.5 12Z" fill="currentColor"/>
            <path d="M19 12C19 12.94 18.8 13.82 18.46 14.64L19.97 16.15C20.63 14.91 21 13.5 21 12C21 7.72 18.01 4.14 14 3.23V5.29C16.89 6.15 19 8.83 19 12ZM4.27 3L3 4.27L7.73 9H3V15H7L12 20V13.27L16.25 17.53C15.58 18.04 14.83 18.46 14 18.7V20.77C15.38 20.45 16.63 19.82 17.68 18.96L19.73 21L21 19.73L12 10.73L4.27 3ZM12 4L9.91 6.09L12 8.18V4Z" fill="currentColor"/>
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 9V15H7L12 20V4L7 9H3ZM16.5 12C16.5 10.23 15.48 8.71 14 7.97V16.02C15.48 15.29 16.5 13.77 16.5 12ZM14 3.23V5.29C16.89 6.15 19 8.83 19 12C19 15.17 16.89 17.85 14 18.71V20.77C18.01 19.86 21 16.28 21 12C21 7.72 18.01 4.14 14 3.23Z" fill="currentColor"/>
          </svg>
        )}
      </button>
      <div className={`cabinet-page${showTeaOverlay ? ' cabinet-page--tea' : ''}${showExpertOverlay ? ' cabinet-page--expert' : ''}${showLabelsAndGlow ? ' cabinet-zones-ready' : ''}`} ref={containerRef}>
        <div className="cabinet-background cabinet-background--back" style={{ backgroundImage: `url(${CABINET_BG_URLS[bgBack]})` }} aria-hidden="true" />
        <div className="cabinet-background cabinet-background--front" style={{ backgroundImage: `url(${CABINET_BG_URLS[bgFront]})` }} aria-label="Кабинет" />
        {showTeaOverlay && (
          <div className="cabinet-tea-overlay" aria-live="polite">
            <div className="cabinet-tea-quote">
              <p className="cabinet-tea-quote-text">{TEA_QUOTES[teaQuoteIndex].text}</p>
              <p className="cabinet-tea-quote-author">— {TEA_QUOTES[teaQuoteIndex].author}</p>
            </div>
          </div>
        )}
        {showExpertOverlay && (
          <div className="cabinet-expert-overlay" aria-live="polite">
            <div className="cabinet-expert-panel">
              <div className="cabinet-expert-header">
                <span className="cabinet-expert-title">Эксперт</span>
                <button
                  type="button"
                  className="cabinet-expert-close"
                  onClick={() => setShowExpertOverlay(false)}
                  aria-label="Закрыть"
                >
                  ×
                </button>
              </div>
              <div className="cabinet-expert-messages">
                {showFullExpertHistory ? (
                  expertMessages.map((msg, i) => (
                    <div key={i} className={`cabinet-expert-msg ${msg.role === 'user' ? 'cabinet-expert-msg-user' : 'cabinet-expert-msg-assistant'}`}>
                      <p>{msg.role === 'assistant' ? renderExpertMessage(msg.content) : msg.content}</p>
                    </div>
                  ))
                ) : (
                  expertMessages.length > 0 && (
                    <div className={`cabinet-expert-msg ${expertMessages[expertMessages.length - 1].role === 'user' ? 'cabinet-expert-msg-user' : 'cabinet-expert-msg-assistant'}`}>
                      <p>{expertMessages[expertMessages.length - 1].role === 'assistant' ? renderExpertMessage(expertMessages[expertMessages.length - 1].content) : expertMessages[expertMessages.length - 1].content}</p>
                    </div>
                  )
                )}
                {isLoadingExpert && (
                  <div className="cabinet-expert-msg cabinet-expert-msg-assistant">
                    <p className="cabinet-expert-typing">
                      <span className="typing-dot">.</span>
                      <span className="typing-dot">.</span>
                      <span className="typing-dot">.</span>
                    </p>
                  </div>
                )}
              </div>
              {expertMessages.length > 1 && (
                <button
                  type="button"
                  className="cabinet-expert-expand"
                  onClick={() => setShowFullExpertHistory((v) => !v)}
                >
                  {showFullExpertHistory ? 'Свернуть' : 'Вся переписка'}
                </button>
              )}
              <div className="cabinet-expert-input-wrap">
                <input
                  type="text"
                  className="cabinet-expert-input"
                  placeholder="Задайте вопрос..."
                  value={expertInput}
                  onChange={(e) => setExpertInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleExpertSend())}
                  disabled={isLoadingExpert}
                />
                <button
                  type="button"
                  className="cabinet-expert-send"
                  onClick={handleExpertSend}
                  disabled={!expertInput.trim() || isLoadingExpert}
                  aria-label="Отправить"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
        {zoneStyles.yinyang && (
          <button
            type="button"
            className={`cabinet-zone cabinet-zone-yinyang ${showDebug && selectedZone === 'yinyang' ? 'cabinet-zone-debug' : ''}`}
            style={zoneStyles.yinyang}
            onClick={handleAlchemyClick}
            aria-label="Открыть Цифровую Алхимию"
            title="Цифровая Алхимия"
          >
            <div className="cabinet-yinyang-clock" aria-hidden="true">
              <div
                className="cabinet-yinyang-hand cabinet-yinyang-hand-hour"
                style={{ transform: `rotate(${(now.getHours() % 12) * 30 + now.getMinutes() * 0.5}deg)` }}
              />
              <div
                className="cabinet-yinyang-hand cabinet-yinyang-hand-minute"
                style={{ transform: `rotate(${now.getMinutes() * 6}deg)` }}
              />
            </div>
            <span className="cabinet-yinyang-al">AL</span>
          </button>
        )}
        {zoneStyles.book && (
          <button
            type="button"
            className={`cabinet-zone cabinet-zone-book ${showDebug && selectedZone === 'book' ? 'cabinet-zone-debug' : ''}`}
            style={zoneStyles.book}
            onClick={handleBookClick}
            aria-label="Обо мне"
            title="Обо мне"
          >
            <span className="cabinet-zone-label" style={labelAtCentroid(coordsB.points)}>Обо мне</span>
          </button>
        )}
        {zoneStyles.laptop && (
          <button
            type="button"
            className={`cabinet-zone cabinet-zone-laptop ${showDebug && selectedZone === 'laptop' ? 'cabinet-zone-debug' : ''}`}
            style={zoneStyles.laptop}
            onClick={handleLaptopClick}
            aria-label="Администрирование"
            title="Администрирование"
          >
            <span className="cabinet-zone-label" style={labelAtCentroid(coordsL.points)}>Админка</span>
          </button>
        )}
        {zoneStyles.leftCabinet && (
          <button
            type="button"
            className={`cabinet-zone cabinet-zone-left-cabinet ${showDebug && selectedZone === 'leftCabinet' ? 'cabinet-zone-debug' : ''}`}
            style={zoneStyles.leftCabinet}
            onClick={handleLeftCabinetClick}
            aria-label="Левый шкаф"
            title="Левый шкаф"
          >
            <span className="cabinet-zone-label" style={labelAtCentroid(coordsLCab.points)}>Левый шкаф</span>
          </button>
        )}
        {zoneStyles.rightCabinet && (
          <button
            type="button"
            className={`cabinet-zone cabinet-zone-right-cabinet ${showDebug && selectedZone === 'rightCabinet' ? 'cabinet-zone-debug' : ''}`}
            style={zoneStyles.rightCabinet}
            onClick={handleRightCabinetClick}
            aria-label="Правый шкаф"
            title="Правый шкаф"
          >
          </button>
        )}
        {zoneStyles.tea && (
          <button
            type="button"
            className={`cabinet-zone cabinet-zone-tea ${showDebug && selectedZone === 'tea' ? 'cabinet-zone-debug' : ''}`}
            style={zoneStyles.tea}
            onClick={handleTeaClick}
            aria-label="Чай"
            title="Чай"
          >
            <span className="cabinet-zone-label" style={labelAtCentroid(coordsT.points)}>Чай</span>
          </button>
        )}
        {zoneStyles.expert && (
          <button
            type="button"
            className={`cabinet-zone cabinet-zone-expert ${showDebug && selectedZone === 'expert' ? 'cabinet-zone-debug' : ''}`}
            style={zoneStyles.expert}
            onClick={handleExpertClick}
            aria-label="Эксперт"
            title="Эксперт"
          >
            <span className="cabinet-zone-label" style={labelAtCentroid(coordsE.points)}>Эксперт</span>
          </button>
        )}
      </div>

      {showDebug && (
        <div className="cabinet-debug">
          <div className="cabinet-debug-panel">
            <div className="cabinet-debug-panel-header">
              <h3>Настройка зон</h3>
              <p className="cabinet-debug-sync-hint">После «Сохранить и закрыть» настройки сохраняются в облако (Supabase) и подхватываются во всех браузерах и после публикации.</p>
              <div className="cabinet-debug-tabs">
                <button
                  type="button"
                  className={selectedZone === 'yinyang' ? 'active' : ''}
                  onClick={() => setSelectedZone('yinyang')}
                >
                  Инь-ян
                </button>
                <button
                  type="button"
                  className={selectedZone === 'book' ? 'active' : ''}
                  onClick={() => setSelectedZone('book')}
                >
                  Книга «Обо мне»
                </button>
                <button
                  type="button"
                  className={selectedZone === 'laptop' ? 'active' : ''}
                  onClick={() => setSelectedZone('laptop')}
                >
                  Ноутбук
                </button>
                <button
                  type="button"
                  className={selectedZone === 'leftCabinet' ? 'active' : ''}
                  onClick={() => setSelectedZone('leftCabinet')}
                >
                  Левый шкаф
                </button>
                <button
                  type="button"
                  className={selectedZone === 'rightCabinet' ? 'active' : ''}
                  onClick={() => setSelectedZone('rightCabinet')}
                >
                  Правый шкаф
                </button>
                <button
                  type="button"
                  className={selectedZone === 'tea' ? 'active' : ''}
                  onClick={() => setSelectedZone('tea')}
                >
                  Чай
                </button>
                <button
                  type="button"
                  className={selectedZone === 'expert' ? 'active' : ''}
                  onClick={() => setSelectedZone('expert')}
                >
                  Эксперт
                </button>
              </div>
            </div>
            <div className="cabinet-debug-panel-body">
            <p className="cabinet-debug-hint">
              {selectedZone === 'yinyang'
                ? 'Круг: центр X, Y и диаметр (%).'
                : 'Многоугольник: от 3 до 8 точек (X, Y в % от изображения).'}
            </p>

            {selectedZone === 'yinyang' ? (
              <>
                <label>
                  X (центр, %): <strong>{coordsY.x}</strong>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={coordsY.x}
                    onChange={(e) => setCoordsYinyang((c) => ({ ...c, x: Number(e.target.value) }))}
                  />
                </label>
                <label>
                  Y (центр, %): <strong>{coordsY.y}</strong>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={coordsY.y}
                    onChange={(e) => setCoordsYinyang((c) => ({ ...c, y: Number(e.target.value) }))}
                  />
                </label>
                <label>
                  Размер — диаметр (%): <strong>{coordsY.size}</strong>
                  <input
                    type="range"
                    min={5}
                    max={40}
                    value={coordsY.size}
                    onChange={(e) => setCoordsYinyang((c) => ({ ...c, size: Number(e.target.value) }))}
                  />
                </label>
              </>
            ) : selectedZone === 'book' ? (
              <>
                <div className="cabinet-debug-point-count">
                  <label>Количество точек:</label>
                  <select value={coordsB.points.length} onChange={(e) => setCoordsBook((c) => ({ ...c, points: resizePoints(c.points, Number(e.target.value)) }))}>
                    {[3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                {coordsB.points.map((p, i) => (
                <div key={i} className="cabinet-debug-point">
                  <span>Точка {i + 1}</span>
                  <label>
                    X (%): <strong>{p.x}</strong>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={p.x}
                      onChange={(e) => setCoordsBook((c) => ({
                        ...c,
                        points: c.points.map((pt, j) => j === i ? { ...pt, x: Number(e.target.value) } : pt)
                      }))}
                    />
                  </label>
                  <label>
                    Y (%): <strong>{p.y}</strong>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={p.y}
                      onChange={(e) => setCoordsBook((c) => ({
                        ...c,
                        points: c.points.map((pt, j) => j === i ? { ...pt, y: Number(e.target.value) } : pt)
                      }))}
                    />
                  </label>
                </div>
              ))}
              </>
            ) : selectedZone === 'laptop' ? (
              <>
                <div className="cabinet-debug-point-count">
                  <label>Количество точек:</label>
                  <select value={coordsL.points.length} onChange={(e) => setCoordsLaptop((c) => ({ ...c, points: resizePoints(c.points, Number(e.target.value)) }))}>
                    {[3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                {coordsL.points.map((p, i) => (
                <div key={i} className="cabinet-debug-point">
                  <span>Точка {i + 1}</span>
                  <label>
                    X (%): <strong>{p.x}</strong>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={p.x}
                      onChange={(e) => setCoordsLaptop((c) => ({
                        ...c,
                        points: c.points.map((pt, j) => j === i ? { ...pt, x: Number(e.target.value) } : pt)
                      }))}
                    />
                  </label>
                  <label>
                    Y (%): <strong>{p.y}</strong>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={p.y}
                      onChange={(e) => setCoordsLaptop((c) => ({
                        ...c,
                        points: c.points.map((pt, j) => j === i ? { ...pt, y: Number(e.target.value) } : pt)
                      }))}
                    />
                  </label>
                </div>
              ))}
              </>
            ) : selectedZone === 'leftCabinet' ? (
              <>
                <div className="cabinet-debug-point-count">
                  <label>Количество точек:</label>
                  <select value={coordsLCab.points.length} onChange={(e) => setCoordsLeftCabinet((c) => ({ ...c, points: resizePoints(c.points, Number(e.target.value)) }))}>
                    {[3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                {coordsLCab.points.map((p, i) => (
                <div key={i} className="cabinet-debug-point">
                  <span>Точка {i + 1}</span>
                  <label>
                    X (%): <strong>{p.x}</strong>
                    <input type="range" min={0} max={100} value={p.x} onChange={(e) => setCoordsLeftCabinet((c) => ({ ...c, points: c.points.map((pt, j) => j === i ? { ...pt, x: Number(e.target.value) } : pt) }))} />
                  </label>
                  <label>
                    Y (%): <strong>{p.y}</strong>
                    <input type="range" min={0} max={100} value={p.y} onChange={(e) => setCoordsLeftCabinet((c) => ({ ...c, points: c.points.map((pt, j) => j === i ? { ...pt, y: Number(e.target.value) } : pt) }))} />
                  </label>
                </div>
              ))}
              </>
            ) : selectedZone === 'rightCabinet' ? (
              <>
                <div className="cabinet-debug-point-count">
                  <label>Количество точек:</label>
                  <select value={coordsRCab.points.length} onChange={(e) => setCoordsRightCabinet((c) => ({ ...c, points: resizePoints(c.points, Number(e.target.value)) }))}>
                    {[3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                {coordsRCab.points.map((p, i) => (
                <div key={i} className="cabinet-debug-point">
                  <span>Точка {i + 1}</span>
                  <label>
                    X (%): <strong>{p.x}</strong>
                    <input type="range" min={0} max={100} value={p.x} onChange={(e) => setCoordsRightCabinet((c) => ({ ...c, points: c.points.map((pt, j) => j === i ? { ...pt, x: Number(e.target.value) } : pt) }))} />
                  </label>
                  <label>
                    Y (%): <strong>{p.y}</strong>
                    <input type="range" min={0} max={100} value={p.y} onChange={(e) => setCoordsRightCabinet((c) => ({ ...c, points: c.points.map((pt, j) => j === i ? { ...pt, y: Number(e.target.value) } : pt) }))} />
                  </label>
                </div>
              ))}
              </>
            ) : selectedZone === 'tea' ? (
              <>
                <div className="cabinet-debug-point-count">
                  <label>Количество точек:</label>
                  <select value={coordsT.points.length} onChange={(e) => setCoordsTea((c) => ({ ...c, points: resizePoints(c.points, Number(e.target.value)) }))}>
                    {[3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                {coordsT.points.map((p, i) => (
                <div key={i} className="cabinet-debug-point">
                  <span>Точка {i + 1}</span>
                  <label>
                    X (%): <strong>{p.x}</strong>
                    <input type="range" min={0} max={100} value={p.x} onChange={(e) => setCoordsTea((c) => ({ ...c, points: c.points.map((pt, j) => j === i ? { ...pt, x: Number(e.target.value) } : pt) }))} />
                  </label>
                  <label>
                    Y (%): <strong>{p.y}</strong>
                    <input type="range" min={0} max={100} value={p.y} onChange={(e) => setCoordsTea((c) => ({ ...c, points: c.points.map((pt, j) => j === i ? { ...pt, y: Number(e.target.value) } : pt) }))} />
                  </label>
                </div>
              ))}
              </>
            ) : (
              <>
                <div className="cabinet-debug-point-count">
                  <label>Количество точек:</label>
                  <select value={coordsE.points.length} onChange={(e) => setCoordsExpert((c) => ({ ...c, points: resizePoints(c.points, Number(e.target.value)) }))}>
                    {[3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                {coordsE.points.map((p, i) => (
                <div key={i} className="cabinet-debug-point">
                  <span>Точка {i + 1}</span>
                  <label>
                    X (%): <strong>{p.x}</strong>
                    <input type="range" min={0} max={100} value={p.x} onChange={(e) => setCoordsExpert((c) => ({ ...c, points: c.points.map((pt, j) => j === i ? { ...pt, x: Number(e.target.value) } : pt) }))} />
                  </label>
                  <label>
                    Y (%): <strong>{p.y}</strong>
                    <input type="range" min={0} max={100} value={p.y} onChange={(e) => setCoordsExpert((c) => ({ ...c, points: c.points.map((pt, j) => j === i ? { ...pt, y: Number(e.target.value) } : pt) }))} />
                  </label>
                </div>
              ))}
              </>
            )}
            </div>
            <div className="cabinet-debug-actions">
              <button type="button" onClick={saveCoords}>Сохранить и закрыть</button>
              <button type="button" onClick={resetCurrentZone}>Сбросить текущую зону</button>
              <button type="button" onClick={resetAllZones}>Сбросить все</button>
              <button type="button" onClick={() => setShowDebug(false)}>Закрыть без сохранения</button>
            </div>
          </div>
        </div>
      )}

      {saveToast && (
        <div className={`cabinet-save-toast ${saveToast.isError ? 'cabinet-save-toast-error' : ''}`} role="status">
          {saveToast.text}
        </div>
      )}

      {/* Кнопка настройки зон временно скрыта. Чтобы показать: раскомментировать и вернуть условие (import.meta.env?.DEV || window.location.hash === '#cabinet-debug') */}
      {false && !showDebug && (
        <button
          type="button"
          className="cabinet-debug-toggle"
          onClick={() => setShowDebug(true)}
          title="Настроить зоны"
        >
          Настроить зоны
        </button>
      )}
    </div>
  )
}

export default Cabinet

