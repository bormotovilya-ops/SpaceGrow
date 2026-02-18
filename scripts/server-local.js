// Локальный сервер для разработки
// Эмулирует Vercel Serverless Function для /api/chat
// Запуск: node server-local.js

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFile, appendFile, mkdir, existsSync } from 'fs'
import { promises as fs } from 'fs'
import { google } from 'googleapis'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Parse User-Agent string to get device type and browser (no external deps).
 * @param {string} ua - User-Agent header
 * @returns {{ deviceType: string, browser: string }}
 */
function parseUserAgent(ua) {
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
  else if (s.includes('msie') || s.includes('trident/')) browser = 'IE'
  return { deviceType, browser }
}

let _sheetsClient = null
let _sheetsHeaderEnsured = false

function getEnv(name) {
  return process.env[name] ? String(process.env[name]) : ''
}

function getSheetsConfig() {
  const enabled = getEnv('GSHEETS_LOGGING_ENABLED') === 'true'
  const spreadsheetId = getEnv('GSHEETS_SPREADSHEET_ID')
  const sheetName = getEnv('GSHEETS_SHEET_NAME') || 'Logs'
  const clientEmail = getEnv('GSHEETS_SERVICE_ACCOUNT_EMAIL')
  const privateKey = getEnv('GSHEETS_PRIVATE_KEY').replace(/\\n/g, '\n')
  return { enabled, spreadsheetId, sheetName, clientEmail, privateKey }
}

async function getSheetsClient() {
  const cfg = getSheetsConfig()
  if (!cfg.enabled) return null
  if (!cfg.spreadsheetId || !cfg.clientEmail || !cfg.privateKey) return null

  if (_sheetsClient) return _sheetsClient

  const auth = new google.auth.JWT({
    email: cfg.clientEmail,
    key: cfg.privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  _sheetsClient = google.sheets({ version: 'v4', auth })
  return _sheetsClient
}

async function ensureSheetsHeader() {
  const cfg = getSheetsConfig()
  const sheets = await getSheetsClient()
  if (!sheets) return
  if (_sheetsHeaderEnsured) return

  try {
    const range = `${cfg.sheetName}!A1:H1`
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: cfg.spreadsheetId,
      range,
    })
    const hasHeader = Array.isArray(existing.data?.values) && existing.data.values.length > 0 && existing.data.values[0].length > 0
    if (!hasHeader) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: cfg.spreadsheetId,
        range: `${cfg.sheetName}!A1`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [[
            'timestamp',
            'ip',
            'userAgent',
            'messageCount',
            'source',
            'message',
            'response',
            'shouldAddCTA',
          ]],
        },
      })
    }
  } catch (e) {
    // Не критично
  } finally {
    _sheetsHeaderEnsured = true
  }
}

async function logConversationToGoogleSheets(entry) {
  const cfg = getSheetsConfig()
  const sheets = await getSheetsClient()
  if (!sheets) return false

  await ensureSheetsHeader()

  await sheets.spreadsheets.values.append({
    spreadsheetId: cfg.spreadsheetId,
    range: `${cfg.sheetName}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [[
        entry.timestamp,
        entry.client?.ip || '',
        entry.client?.userAgent || '',
        entry.messageCount ?? 0,
        entry.source || '',
        entry.message || '',
        entry.response || '',
        entry.shouldAddCTA ? 'true' : 'false',
      ]],
    },
  })
  return true
}

// Функция для логирования переписки
async function logConversation(message, response, clientInfo = {}, req = null) {
  try {
    const timestamp = new Date().toISOString()
    // __dirname указывает на scripts/, нужно подняться на уровень выше для папки logs
    const rootDir = join(__dirname, '..')
    const logDir = join(rootDir, 'logs')
    const logFile = join(logDir, `chat-${new Date().toISOString().split('T')[0]}.log`)
    
    // Создаем директорию logs, если её нет (игнорируем ошибку, если уже существует)
    try {
      await mkdir(logDir, { recursive: true })
    } catch (e) {
      // Директория уже существует или нет прав - продолжаем
    }
    
    const clientIP = clientInfo.ip || req?.ip || req?.connection?.remoteAddress || 'unknown'
    const userAgent = clientInfo.userAgent || req?.headers?.['user-agent'] || 'unknown'
    
    const logEntry = {
      timestamp,
      client: {
        ip: clientIP,
        userAgent: userAgent
      },
      message,
      response,
      messageCount: clientInfo.messageCount || 0,
      source: clientInfo.source || 'unknown',
      shouldAddCTA: !!clientInfo.shouldAddCTA,
    }
    
    // Пишем в Google Sheets (если настроено)
    try {
      const ok = await Promise.race([
        logConversationToGoogleSheets(logEntry),
        new Promise((resolve) => setTimeout(() => resolve(false), 1500)),
      ])
      if (ok) {
        console.log('📊 Conversation logged to Google Sheets')
        return
      }
    } catch (e) {
      // игнорируем, пишем в файл ниже
    }

    const logLine = JSON.stringify(logEntry) + '\n'
    await appendFile(logFile, logLine, 'utf-8')
    console.log('📝 Conversation logged to:', logFile)
  } catch (error) {
    // Логирование не критично, просто выводим в консоль
    console.error('⚠️ Failed to log conversation:', error.message)
    console.log('📝 Conversation log (fallback):', {
      timestamp: new Date().toISOString(),
      message,
      response: response?.substring(0, 100) + '...',
      messageCount: clientInfo.messageCount || 0
    })
  }
}

// Загружаем .env из корня проекта (__dirname указывает на scripts/)
dotenv.config({ path: join(__dirname, '..', '.env') })

// Функция для загрузки файлов знаний
async function loadKnowledgeFiles() {
  try {
    // __dirname указывает на scripts/, нужно подняться на уровень выше
    const rootDir = join(__dirname, '..')
    const knowledgePath = join(rootDir, 'site_knowledge.md')
    
    console.log('🔍 Загрузка файла знаний:', {
      __dirname,
      rootDir,
      knowledgePath,
      exists: existsSync(knowledgePath)
    })
    
    const siteKnowledge = await readFile(knowledgePath, 'utf-8').catch((err) => {
      console.error('❌ Ошибка чтения файла знаний:', err.message)
      return null
    })
    
    if (!siteKnowledge) {
      console.error('❌ Файл site_knowledge.md не найден или пуст по пути:', knowledgePath)
    } else {
      console.log('✅ Файл знаний загружен, размер:', siteKnowledge.length, 'символов')
    }
    
    return {
      siteKnowledge: siteKnowledge || 'Файл site_knowledge.md не найден'
    }
  } catch (error) {
    console.error('❌ Ошибка при загрузке файлов знаний:', error)
    return {
      siteKnowledge: 'Ошибка загрузки site_knowledge.md'
    }
  }
}

const app = express()
const PORT = 5001

app.use(cors())
app.use(express.json())

// Supabase connectivity test (no auth required)
app.get('/api/test-db', async (_req, res) => {
  try {
    const SUPABASE_URL = getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL')
    const SUPABASE_KEY = getEnv('SUPABASE_ANON_KEY') || getEnv('SUPABASE_KEY') || getEnv('VITE_SUPABASE_ANON_KEY')
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return res.status(200).json({
        status: 'error',
        error: 'SUPABASE_URL or SUPABASE_ANON_KEY not set in .env',
      })
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
    const { data, error } = await supabase.from('users').select('count').limit(1)
    if (error) {
      return res.status(200).json({ status: 'error', error: error.message })
    }
    return res.status(200).json({
      status: 'connected',
      message: 'Supabase is reachable',
      data,
    })
  } catch (err) {
    return res.status(200).json({ status: 'error', error: err.message })
  }
})

// Personal report by cookie (matches Vercel /api/user/by-cookie/:cookie_id/personal-report)
// Returns: user, journey, segmentation, recommendations, session_duration; timestamps as ISO (TIMESTAMPTZ).
app.get('/api/user/by-cookie/:cookie_id/personal-report', async (req, res) => {
  const cookieId = req.params.cookie_id
  if (!cookieId) {
    return res.status(400).json({ error: 'cookie_id is required' })
  }

  const SUPABASE_URL = getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL')
  const SUPABASE_KEY = getEnv('SUPABASE_ANON_KEY') || getEnv('SUPABASE_KEY') || getEnv('VITE_SUPABASE_ANON_KEY')
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase is not configured' })
  }

  const safeParse = (v) => {
    try { return v ? JSON.parse(v) : {} } catch { return {} }
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

    // Fetch site_sessions (session_start, session_end as TIMESTAMPTZ; user_agent for device/browser)
    let sessions = []
    try {
      const { data, error } = await supabase
        .from('site_sessions')
        .select('id, cookie_id, tg_user_id, session_start, session_end, user_agent, referrer, source, utm_params, page_id')
        .eq('cookie_id', cookieId)
        .order('session_start', { ascending: false })
        .limit(50)
      if (!error && data) sessions = data
    } catch (e) {
      console.warn('Personal report: site_sessions fetch failed', e.message)
    }

    // Fetch all site_events for this cookie_id (created_at as TIMESTAMPTZ)
    let siteEvents = []
    try {
      const { data, error } = await supabase
        .from('site_events')
        .select('*')
        .eq('cookie_id', cookieId)
        .order('created_at', { ascending: false })
        .limit(200)
      if (!error && data) siteEvents = data
    } catch (e) {
      console.warn('Personal report: site_events fetch failed', e.message)
    }

    const sessionIds = new Set(sessions.map(s => s.id))
    const eventsBySession = {}
    siteEvents.forEach(ev => {
      const sid = ev.session_id
      if (sid != null && sessionIds.has(sid)) {
        if (!eventsBySession[sid]) eventsBySession[sid] = []
        eventsBySession[sid].push(ev)
      }
    })

    // Session duration: first to last event in session, or session_end - session_start
    const sessionDurationsSeconds = []
    sessions.forEach(s => {
      const start = s.session_start ? new Date(s.session_start).getTime() : null
      const end = s.session_end ? new Date(s.session_end).getTime() : null
      const evs = eventsBySession[s.id] || []
      const times = evs.map(e => new Date(e.created_at).getTime()).filter(Boolean)
      let durationSec = 0
      if (end && start && end > start) durationSec = Math.round((end - start) / 1000)
      else if (times.length >= 2) {
        const first = Math.min(...times)
        const last = Math.max(...times)
        durationSec = Math.round((last - first) / 1000)
      }
      if (durationSec > 0) sessionDurationsSeconds.push(durationSec)
    })
    const totalSessionDurationSeconds = sessionDurationsSeconds.reduce((a, b) => a + b, 0)

    // User-Agent enrichment for sessions
    const miniapp_opens = sessions.map(s => {
      const { deviceType, browser } = parseUserAgent(s.user_agent || '')
      return {
        timestamp: s.session_start, // keep ISO string (TIMESTAMPTZ)
        page: s.page_id || 'Главная',
        device: s.device_type || deviceType,
        browser: browser,
        device_type: s.device_type || deviceType
      }
    })

    const byType = (type) => siteEvents.filter(e => e.event_type === type)
    const mapContent = (r) => {
      const m = safeParse(r.metadata)
      return {
        section: m.content_type || r.event_name || '—',
        content_id: m.content_id ?? null,
        content_title: m.content_title ?? null,
        time_spent: m.time_spent || 0,
        scroll_depth: m.scroll_depth || 0,
        timestamp: r.created_at
      }
    }
    const mapAi = (r) => {
      const m = safeParse(r.metadata)
      return {
        messages_count: m.messages_count || 0,
        topics: m.topics || [],
        duration: m.duration || 0,
        timestamp: r.created_at
      }
    }
    const mapDiagnostic = (r) => {
      const m = safeParse(r.metadata)
      const start = m.start_time ? new Date(m.start_time).getTime() : 0
      const end = m.end_time ? new Date(m.end_time).getTime() : 0
      return {
        progress: m.progress ?? m.completion_rate ?? 0,
        results: m.results ?? null,
        time_spent: (end && start ? Math.round((end - start) / 1000) : 0),
        timestamp: r.created_at
      }
    }
    const mapGame = (r) => {
      const m = safeParse(r.metadata)
      return {
        game_type: m.game_type || 'Неизвестно',
        achievement: m.achievement ?? m.achievements ?? [],
        score: m.score ?? m.final_score ?? 0,
        timestamp: r.created_at
      }
    }
    const mapCta = (r) => {
      const m = safeParse(r.metadata)
      return {
        cta_text: m.cta_text ?? m.button_text ?? null,
        cta_location: m.cta_location || m.ctaText || 'Неизвестно',
        previous_step: m.previous_step || m.previousStep || 'Неизвестно',
        step_duration: m.step_duration ?? m.duration ?? 0,
        timestamp: r.created_at
      }
    }

    const content_views = byType('content_view').map(mapContent)
    const ai_interactions = byType('ai_interaction').map(mapAi)
    const diagnostics = byType('diagnostic').map(mapDiagnostic)
    const game_actions = byType('game_action').map(mapGame)
    const cta_clicks = byType('cta_click').map(mapCta)

    const firstSession = sessions.length ? sessions[sessions.length - 1] : null
    const user = {
      tg_user_id: firstSession?.tg_user_id ?? null,
      cookie_id: cookieId,
      traffic_source: firstSession?.source ?? 'Не определен',
      utm_params: firstSession?.utm_params ? safeParse(firstSession.utm_params) : {},
      referrer: firstSession?.referrer ?? null,
      first_visit_date: firstSession?.session_start ?? null
    }

    const totalSessions = sessions.length
    const diagnosticsCompleted = diagnostics.some(d => (d.progress || 0) >= 100) || diagnostics.length > 0
    const engagementLevel = (content_views.length + ai_interactions.length) > 30 ? 'high' : ((content_views.length + ai_interactions.length) > 5 ? 'medium' : 'low')
    const segmentation = {
      user_segment: diagnosticsCompleted ? 'engaged' : (totalSessions > 5 ? 'engaged' : 'newcomer'),
      engagement_level: engagementLevel,
      total_sessions: totalSessions,
      diagnostics_completed: diagnosticsCompleted,
      last_activity: miniapp_opens.length ? miniapp_opens[0].timestamp : null,
      session_duration_seconds: totalSessionDurationSeconds,
      session_duration_display: totalSessionDurationSeconds ? `${Math.floor(totalSessionDurationSeconds / 60)}м ${totalSessionDurationSeconds % 60}с` : null
    }

    const recommendations = {
      next_steps: segmentation.user_segment === 'newcomer' ? ['Пройти диагностику для персональных рекомендаций', 'Изучить основные разделы сайта'] : ['Связаться для детального обсуждения'],
      automatic_actions: [],
      content_suggestions: ['Введение', 'Кейсы'],
      cta_suggestions: ['Записаться на консультацию']
    }

    const journey = {
      miniapp_opens,
      content_views,
      ai_interactions,
      diagnostics,
      game_actions,
      cta_clicks
    }

    const payload = {
      user,
      journey,
      segmentation,
      recommendations,
      session_duration_seconds: totalSessionDurationSeconds,
      generated_at: new Date().toISOString()
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    return res.status(200).json(payload)
  } catch (err) {
    console.error('Personal report by cookie failed:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// Track session start/end (matches backend /api/track-session, Python db or Supabase)
// Expected table: site_sessions with columns: id, cookie_id, tg_user_id, session_start, session_end, user_agent, ip, referrer (+ optional: source, utm_*, device_*, geo_*, etc.)
// If site_sessions does not exist in Supabase, run the SQL from scripts/create_pg_schema.py or the snippet in LOGGING_README.md (CREATE TABLE site_sessions ...).
app.post('/api/track-session', async (req, res) => {
  const data = req.body || {}
  const cookieId = data.cookie_id
  const action = data.action
  const sessionId = data.session_id

  if (!cookieId) {
    return res.status(400).json({ error: 'cookie_id обязателен' })
  }

  const SUPABASE_URL = getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL')
  const SUPABASE_KEY = getEnv('SUPABASE_ANON_KEY') || getEnv('SUPABASE_KEY') || getEnv('VITE_SUPABASE_ANON_KEY')
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase is not configured' })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
    const ip = req.ip || req.connection?.remoteAddress || req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || null
    const userAgent = data.user_agent || req.headers?.['user-agent'] || null
    const referrer = data.referrer || null

    if (action === 'start') {
      const tgUserId = data.tg_user_id != null ? Number(data.tg_user_id) : null
      const insertPayload = {
        cookie_id: cookieId,
        tg_user_id: tgUserId ?? null,
        user_agent: userAgent,
        ip: ip,
        referrer: referrer
      }
      console.log('[track-session] Insert payload (columns must exist in site_sessions):', Object.keys(insertPayload))

      let row, error
      try {
        const result = await supabase
          .from('site_sessions')
          .insert(insertPayload)
          .select('id')
          .single()
        row = result.data
        error = result.error
      } catch (insertErr) {
        console.error('Supabase Error Details:', insertErr)
        console.error('Supabase Error (code/name):', insertErr?.code, insertErr?.name)
        return res.status(500).json({
          error: insertErr.message || 'Insert threw',
          debug: process.env.NODE_ENV !== 'production' ? { message: insertErr.message } : undefined
        })
      }

      if (error) {
        console.error('Supabase Error Details:', error)
        console.error('Supabase Error (full):', JSON.stringify(error, null, 2))
        return res.status(500).json({ error: error.message })
      }
      const id = row?.id != null ? Number(row.id) : null
      if (id == null || !Number.isInteger(id)) {
        return res.status(500).json({ error: 'Failed to create session' })
      }
      return res.status(200).json({ session_id: id, status: 'started' })
    }

    if (action === 'end' && sessionId != null) {
      const id = Number(sessionId)
      if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ error: 'Неверный session_id' })
      }
      let updated, error
      try {
        const result = await supabase
          .from('site_sessions')
          .update({ session_end: new Date().toISOString() })
          .eq('id', id)
          .is('session_end', null)
          .select('id')
        updated = result.data
        error = result.error
      } catch (updateErr) {
        console.error('Supabase Error Details (session end):', updateErr)
        return res.status(500).json({ error: updateErr.message || 'Update threw' })
      }

      if (error) {
        console.error('Supabase Error Details (session end):', error)
        return res.status(500).json({ error: error.message })
      }
      const success = Array.isArray(updated) && updated.length > 0
      return res.status(200).json({ success, status: 'ended' })
    }

    return res.status(400).json({ error: 'Неверное действие или отсутствует session_id' })
  } catch (err) {
    console.error('track-session failed:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// Helper: insert a row into site_events and return { ok, error }
async function insertSiteEvent(supabase, row) {
  try {
    const { data, error } = await supabase
      .from('site_events')
      .insert(row)
      .select('id')
      .single()
    if (error) return { ok: false, error: error.message }
    return { ok: true, id: data?.id }
  } catch (e) {
    return { ok: false, error: e.message || 'Insert failed' }
  }
}

// POST /api/log/source-visit — log traffic source visit (cookie_id, session_id, source, utm_params, referrer, tg_user_id)
app.post('/api/log/source-visit', async (req, res) => {
  const data = req.body || {}
  const cookieId = data.cookie_id
  const sessionId = data.session_id

  if (!cookieId || sessionId == null) {
    return res.status(400).json({ error: 'cookie_id and session_id are required' })
  }

  const SUPABASE_URL = getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL')
  const SUPABASE_KEY = getEnv('SUPABASE_ANON_KEY') || getEnv('SUPABASE_KEY') || getEnv('VITE_SUPABASE_ANON_KEY')
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase is not configured' })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
    const metadata = {
      source: data.source ?? null,
      utm_params: data.utm_params ?? null,
      referrer: data.referrer ?? null,
    }
    const row = {
      cookie_id: cookieId,
      session_id: Number(sessionId),
      tg_user_id: data.tg_user_id != null ? Number(data.tg_user_id) : null,
      event_type: 'source_visit',
      event_name: 'source_visit',
      page: null,
      metadata,
    }
    const result = await insertSiteEvent(supabase, row)
    if (!result.ok) {
      console.error('[log/source-visit] Insert failed:', result.error)
      return res.status(500).json({ error: result.error })
    }
    console.log('[log/source-visit] Inserted site_events id:', result.id, 'session_id:', sessionId, 'source:', data.source)
    return res.status(200).json({ ok: true, id: result.id })
  } catch (err) {
    console.error('log/source-visit failed:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// POST /api/log/miniapp-open — log miniapp open (cookie_id, session_id, device, page_id, tg_user_id)
app.post('/api/log/miniapp-open', async (req, res) => {
  const data = req.body || {}
  const cookieId = data.cookie_id
  const sessionId = data.session_id

  if (!cookieId || sessionId == null) {
    return res.status(400).json({ error: 'cookie_id and session_id are required' })
  }

  const SUPABASE_URL = getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL')
  const SUPABASE_KEY = getEnv('SUPABASE_ANON_KEY') || getEnv('SUPABASE_KEY') || getEnv('VITE_SUPABASE_ANON_KEY')
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase is not configured' })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
    const metadata = {
      device: data.device ?? null,
      page_id: data.page_id ?? null,
    }
    const row = {
      cookie_id: cookieId,
      session_id: Number(sessionId),
      tg_user_id: data.tg_user_id != null ? Number(data.tg_user_id) : null,
      event_type: 'miniapp_open',
      event_name: 'miniapp_open',
      page: data.page_id ?? null,
      metadata,
    }
    const result = await insertSiteEvent(supabase, row)
    if (!result.ok) {
      console.error('[log/miniapp-open] Insert failed:', result.error)
      return res.status(500).json({ error: result.error })
    }
    console.log('[log/miniapp-open] Inserted site_events id:', result.id, 'session_id:', sessionId, 'page_id:', data.page_id)
    return res.status(200).json({ ok: true, id: result.id })
  } catch (err) {
    console.error('log/miniapp-open failed:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// POST /api/log/content-view — log content view (cookie_id, session_id, content_type, content_id, content_title, section, time_spent, scroll_depth, tg_user_id)
app.post('/api/log/content-view', async (req, res) => {
  const data = req.body || {}
  const cookieId = data.cookie_id
  const sessionId = data.session_id

  if (!cookieId || sessionId == null) {
    return res.status(400).json({ error: 'cookie_id and session_id are required' })
  }

  const SUPABASE_URL = getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL')
  const SUPABASE_KEY = getEnv('SUPABASE_ANON_KEY') || getEnv('SUPABASE_KEY') || getEnv('VITE_SUPABASE_ANON_KEY')
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase is not configured' })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
    const metadata = {
      content_type: data.content_type ?? null,
      content_id: data.content_id ?? null,
      content_title: data.content_title ?? data.contentTitle ?? null,
      section: data.section ?? null,
      time_spent: data.time_spent != null ? Number(data.time_spent) : (data.timeSpent != null ? Number(data.timeSpent) : null),
      scroll_depth: data.scroll_depth != null ? Number(data.scroll_depth) : (data.scrollDepth != null ? Number(data.scrollDepth) : null),
    }
    const row = {
      cookie_id: cookieId,
      session_id: Number(sessionId),
      tg_user_id: data.tg_user_id != null ? Number(data.tg_user_id) : null,
      event_type: 'content_view',
      event_name: 'content_view',
      page: data.content_id ?? data.section ?? null,
      metadata,
    }
    const result = await insertSiteEvent(supabase, row)
    if (!result.ok) {
      console.error('[log/content-view] Insert failed:', result.error)
      return res.status(500).json({ error: result.error })
    }
    console.log('[log/content-view] Inserted site_events id:', result.id, 'session_id:', sessionId, 'content_type:', data.content_type, 'content_id:', data.content_id)
    return res.status(200).json({ ok: true, id: result.id })
  } catch (err) {
    console.error('log/content-view failed:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// POST /api/log/personal-path-view — log personal path/view (cookie_id, session_id; optional open_time, duration, downloaded, tg_user_id)
app.post('/api/log/personal-path-view', async (req, res) => {
  const data = req.body || {}
  const cookieId = data.cookie_id
  const sessionId = data.session_id

  if (!cookieId || sessionId == null) {
    return res.status(400).json({ error: 'cookie_id and session_id are required' })
  }

  const SUPABASE_URL = getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL')
  const SUPABASE_KEY = getEnv('SUPABASE_ANON_KEY') || getEnv('SUPABASE_KEY') || getEnv('VITE_SUPABASE_ANON_KEY')
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase is not configured' })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
    const metadata = {
      open_time: data.open_time != null ? data.open_time : null,
      duration: data.duration != null ? Number(data.duration) : null,
      downloaded: data.downloaded === true || data.downloaded === 'true',
    }
    const row = {
      cookie_id: cookieId,
      session_id: Number(sessionId),
      tg_user_id: data.tg_user_id != null ? Number(data.tg_user_id) : null,
      event_type: 'personal_path_view',
      event_name: 'personal_path_view',
      page: null,
      metadata,
    }
    const result = await insertSiteEvent(supabase, row)
    if (!result.ok) {
      console.error('[log/personal-path-view] Insert failed:', result.error)
      return res.status(500).json({ error: result.error })
    }
    console.log('[log/personal-path-view] Inserted site_events id:', result.id, 'session_id:', sessionId)
    return res.status(200).json({ ok: true, id: result.id })
  } catch (err) {
    console.error('log/personal-path-view failed:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// POST /api/log/cta-click — log CTA click (cookie_id, session_id; cta_id, button_text; optional cta_type, cta_text, cta_location, etc.)
app.post('/api/log/cta-click', async (req, res) => {
  const data = req.body || {}
  const cookieId = data.cookie_id
  const sessionId = data.session_id

  if (!cookieId || sessionId == null) {
    return res.status(400).json({ error: 'cookie_id and session_id are required' })
  }

  const SUPABASE_URL = getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL')
  const SUPABASE_KEY = getEnv('SUPABASE_ANON_KEY') || getEnv('SUPABASE_KEY') || getEnv('VITE_SUPABASE_ANON_KEY')
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase is not configured' })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
    const ctaId = data.cta_id ?? data.cta_type ?? null
    const buttonText = data.button_text ?? data.cta_text ?? data.ctaText ?? null
    const metadata = {
      cta_id: ctaId,
      button_text: buttonText,
      cta_type: data.cta_type ?? null,
      cta_text: data.cta_text ?? data.ctaText ?? buttonText,
      cta_location: data.cta_location ?? data.ctaLocation ?? null,
      previous_step: data.previous_step ?? data.previousStep ?? null,
      step_duration: data.step_duration != null ? Number(data.step_duration) : (data.stepDuration != null ? Number(data.stepDuration) : null),
    }
    const row = {
      cookie_id: cookieId,
      session_id: Number(sessionId),
      tg_user_id: data.tg_user_id != null ? Number(data.tg_user_id) : null,
      event_type: 'cta_click',
      event_name: 'cta_click',
      page: ctaId ?? buttonText,
      metadata,
    }
    const result = await insertSiteEvent(supabase, row)
    if (!result.ok) {
      console.error('[log/cta-click] Insert failed:', result.error)
      return res.status(500).json({ error: result.error })
    }
    console.log('[log/cta-click] Inserted site_events id:', result.id, 'session_id:', sessionId, 'cta_id:', ctaId, 'button_text:', buttonText)
    return res.status(200).json({ ok: true, id: result.id })
  } catch (err) {
    console.error('log/cta-click failed:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// Функция для очистки markdown-символов из ответа
function cleanResponse(text) {
  if (!text) return text
  
  // Убираем markdown-символы
  let cleaned = text
    .replace(/\*\*/g, '') // Убираем **
    .replace(/###/g, '') // Убираем ###
    .replace(/\|\|/g, '') // Убираем ||
    .replace(/-----+/g, '') // Убираем ----- и более
    .replace(/---+/g, '') // Убираем --- и более
    .trim()
  
  return cleaned
}

const CTA_MARKDOWN = '[Записаться на диагностику](https://t.me/ilyaborm)'
const CTA_URL = 'https://t.me/ilyaborm'

function formatFinalResponse(rawText, shouldAddCTA) {
  const text = cleanResponse(rawText || '')

  // Убираем возможные литералы "\n" / "\r" из ответа модели (в т.ч. двойное экранирование)
  let main = text
    // \n, \\n, \\\\n -> убираем любые "\" перед n/r
    .replace(/\\+n/g, ' ')
    .replace(/\\+r/g, ' ')
    // иногда модель пишет именно "\n\n" как текст
    .replace(/\\n\\n/g, ' ')
    .replace(/\\r\\n/g, ' ')
    // нормализуем настоящие переводы строк в пробел (чтобы не было пустых строк перед CTA)
    .replace(/[\r\n]+/g, ' ')

  // Убираем CTA, если модель добавила его сама (чтобы контролировать частоту)
  main = main
    .replace(/\[Записаться на диагностику\]\(https:\/\/t\.me\/ilyaborm\)/g, '')
    .replaceAll(CTA_MARKDOWN, '')
    .replaceAll(CTA_URL, '')
    .trim()

  if (!shouldAddCTA) {
    return main
  }

  return (main ? `${main}\n` : '') + CTA_MARKDOWN
}

// Функция для обработки заглушки (предопределенные ответы)
async function handleMockResponse(message, systemContext, res, messageCount = 0, req = null) {
  const lowerMessage = message.toLowerCase().trim()
  
  // Предопределенные ответы на частые вопросы
  const responses = {
    'привет': 'Привет! Я Илья Бормотов, IT-интегратор и архитектор автоматизированных интеллектуальных цепочек продаж. Чем могу помочь?',
    'здравствуй': 'Здравствуйте! Я Илья Бормотов. Готов ответить на ваши вопросы о моих услугах.',
    'как дела': 'Отлично, спасибо! Готов помочь вам с вопросами по автоматизации продаж и созданию воронок.',
    'что ты делаешь': 'Я создаю автоматизированные цепочки продаж для онлайн-школ. Это включает: сайты, лендинги, воронки продаж, обучающие курсы и интеграцию всех элементов в единую систему.',
    'чем занимаешься': 'Я IT-интегратор с 19+ годами опыта. Специализируюсь на создании автоматизированных интеллектуальных цепочек продаж для онлайн-школ и экспертов.',
    'какой этап цепочки продаж помогает расположить к себе аудиторию': 'Этап "Прогрев" помогает расположить к себе аудиторию. Это важный этап воронки, где мы даем ценность, обучаем и создаем доверие перед предложением.',
    'прогрев': 'Прогрев - это этап воронки, где мы даем ценность аудитории, обучаем и создаем доверие. Это помогает расположить к себе клиентов перед предложением услуг.',
    'контакты': 'Со мной можно связаться:\n- Telegram: @ilyaborm\n- Канал: @SoulGuideIT\n- Телефон: +7 (999) 123-77-88\n- Email: bormotovilya@gmail.com',
    'как связаться': 'Со мной можно связаться:\n- Telegram: @ilyaborm\n- Канал: @SoulGuideIT\n- Телефон: +7 (999) 123-77-88\n- Email: bormotovilya@gmail.com',
    'телефон': 'Мой телефон: +7 (999) 123-77-88. Также можете написать в Telegram: @ilyaborm',
    'telegram': 'Мой Telegram: @ilyaborm. Также есть канал: @SoulGuideIT',
    'опыт': 'У меня 19+ лет опыта в IT, из них 15 лет в Enterprise. С 2018 года - индивидуальный предприниматель. С 2023 года фокус на Telegram-экосистеме и автоматизации продаж.',
    'сколько лет опыта': 'У меня 19+ лет опыта в IT, из них 15 лет в Enterprise. Работал руководителем группы аналитики для крупных госпроектов.',
    'стоимость': 'Стоимость зависит от проекта. Максимальный чек за одного бота - 500 тыс. руб. Предлагаю бесплатную диагностику воронки или мини-аудит бизнес-процессов.',
    'цена': 'Стоимость зависит от проекта. Предлагаю бесплатную диагностику воронки для оценки вашей ситуации.',
    'бесплатно': 'Да, предлагаю бесплатную диагностику воронки или мини-аудит бизнес-процессов. Это включает карту проблем, оценку потерь и прогноз точек роста.',
    'диагностика': 'Предлагаю бесплатную диагностику воронки или мини-аудит бизнес-процессов. Это поможет выявить проблемы, оценить потери и найти точки роста. Свяжитесь со мной для подробностей.',
  }
  
  // Ищем точное совпадение или частичное
  for (const [key, value] of Object.entries(responses)) {
    if (lowerMessage.includes(key)) {
      const cleanedResponse = formatFinalResponse(value, messageCount > 0 && messageCount % 3 === 0)
      console.log('📝 Mock response found for key:', key)
      // Логируем переписку (не блокируем ответ)
      logConversation(message, cleanedResponse, { messageCount, shouldAddCTA: messageCount > 0 && messageCount % 3 === 0, source: 'mock' }, req).catch(() => {})
      return res.status(200).json({ response: cleanedResponse, source: 'mock' })
    }
  }

  // Если не найдено, возвращаем общий ответ
  const defaultResponse = `Спасибо за вопрос! Я Илья Бормотов, IT-интегратор и архитектор автоматизированных интеллектуальных цепочек продаж. 

Для более подробного ответа свяжитесь со мной напрямую:
- Telegram: @ilyaborm
- Канал: @SoulGuideIT
- Телефон: +7 (999) 123-77-88
- Email: bormotovilya@gmail.com

Также предлагаю бесплатную диагностику воронки или мини-аудит бизнес-процессов.`
  
  const cleanedDefaultResponse = formatFinalResponse(defaultResponse, messageCount > 0 && messageCount % 3 === 0)
  console.log('📝 Using default mock response')
  // Логируем переписку (не блокируем ответ)
  logConversation(message, cleanedDefaultResponse, { messageCount, shouldAddCTA: messageCount > 0 && messageCount % 3 === 0, source: 'mock' }, req).catch(() => {})
  return res.status(200).json({ response: cleanedDefaultResponse, source: 'mock' })
}

// Функция для умной обрезки текста по предложениям (без потери смысла)
function truncateText(text, maxChars = 5000) {
  if (!text || text.length <= maxChars) return text
  
  // Обрезаем до maxChars, но ищем последнюю точку, восклицательный или вопросительный знак
  // чтобы не обрезать посередине предложения
  let truncated = text.substring(0, maxChars)
  
  // Ищем последнее завершенное предложение
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('. '),
    truncated.lastIndexOf('!\n'),
    truncated.lastIndexOf('?\n'),
    truncated.lastIndexOf('.\n'),
    truncated.lastIndexOf('! '),
    truncated.lastIndexOf('? ')
  )
  
  // Если нашли конец предложения в последних 200 символах, обрезаем там
  if (lastSentenceEnd > maxChars - 200 && lastSentenceEnd > 0) {
    truncated = truncated.substring(0, lastSentenceEnd + 1)
  }
  
  return truncated + '\n\n[Текст обрезан для экономии токенов]'
}

// Функция для формирования полного промпта с файлами знаний
async function buildSystemContext(shouldAddCTA = false) {
  const knowledge = await loadKnowledgeFiles()
  
  // Файл теперь короткий (около 4000 символов), используем полностью без обрезки
  const siteKnowledge = knowledge.siteKnowledge || ''
  
  // Логируем, что попадает в промпт (проверка на наличие ключевой информации)
  const hasCityInfo = siteKnowledge.includes('Родился в Перми') || siteKnowledge.includes('живу в Сочи') || siteKnowledge.includes('Перми')
  const isMockContent = siteKnowledge.includes('Файл site_knowledge.md не найден') || siteKnowledge.length < 100
  
  console.log('📋 Knowledge file loaded:', {
    originalLength: siteKnowledge.length,
    hasCityInfo: hasCityInfo,
    isMockContent: isMockContent,
    preview: siteKnowledge.substring(0, 200) + '...'
  })
  
  if (isMockContent) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: Файл знаний не загружен! Используется заглушка.')
    console.error('🔍 Проверьте путь к файлу site_knowledge.md')
  }
  
  if (!hasCityInfo && !isMockContent) {
    console.warn('⚠️ WARNING: City information (Пермь/Сочи) not found in knowledge file!')
  }

  // Формируем инструкцию о CTA (без вывода литералов вида "\n")
  const ctaInstruction = shouldAddCTA
    ? '\n\nВАЖНО: В ЭТОМ ответе добавь CTA в самом конце на новой строке (один перенос строки, без пустой строки, без символов "\\n"). Формат CTA ровно такой: [Записаться на диагностику](https://t.me/ilyaborm)'
    : '\n\nВАЖНО: В ЭТОМ ответе НЕ добавляй CTA.'
  
  return `Ты — Илья Бормотов, IT-интегратор и архитектор АИЦП. Отвечай на вопросы как мой "цифровой двойник", опираясь на базу знаний ниже.

# База знаний:
${siteKnowledge}

# КРИТИЧЕСКИ ВАЖНО - Честность и точность:
- НИКОГДА не выдумывай факты, которых нет в базе знаний выше
- НЕ придумывай информацию о семье, друзьях, личной жизни, если её нет в базе знаний
- НЕ сочиняй детали биографии, проекты, кейсы или события, которых нет в файле
- Если информации нет в базе знаний — честно признай это и мягко переведи разговор к теме сайта (АИЦП, автоматизация продаж, воронки, диагностика)
- Пример: "Об этом не расскажу, но могу помочь с автоматизацией вашей воронки продаж. [Записаться на диагностику](https://t.me/ilyaborm)"

# Правила ответа:
- Говори от первого лица (Я, меня, мой), обращайся на "вы"
- Максимальная длина ответа — 330 символов. Только суть!
- Если добавляешь CTA — ставь ссылку на новой строке (один перенос строки), без пустой строки. Формат: [Записаться на диагностику](https://t.me/ilyaborm)
- Не используй фразы "Как я могу вам помочь?"
- Будь живым экспертом, не роботом${ctaInstruction}`
}

// Endpoint для чата (эмулирует api/chat.js)
app.post('/api/chat', async (req, res) => {
  console.log('\n' + '='.repeat(60))
  console.log('📨 ПОЛУЧЕН ЗАПРОС К /api/chat')
  console.log('='.repeat(60))
  console.log('📝 Сообщение:', req.body.message?.substring(0, 100) + (req.body.message?.length > 100 ? '...' : ''))
  console.log('📊 Message count:', req.body.messageCount || 0)
  
  const { message, messageCount = 0 } = req.body

  if (!message || !message.trim()) {
    console.error('❌ Пустое сообщение!')
    return res.status(400).json({ error: 'Сообщение не может быть пустым' })
  }

  // Определяем, нужно ли добавлять CTA (каждое 3-е сообщение)
  const shouldAddCTA = messageCount > 0 && messageCount % 3 === 0

  // Проверяем токен Groq
  const GROQ_API_KEY = process.env.GROQ_API_KEY
  const USE_MOCK_ENV = process.env.USE_MOCK_RESPONSES === 'true'

  console.log('\n🔍 ПРОВЕРКА НАСТРОЕК:')
  console.log('  - USE_MOCK_RESPONSES:', process.env.USE_MOCK_RESPONSES || 'не установлен')
  console.log('  - USE_MOCK_ENV:', USE_MOCK_ENV)
  console.log('  - GROQ_API_KEY существует:', !!GROQ_API_KEY)
  console.log('  - GROQ_API_KEY первые 15 символов:', GROQ_API_KEY ? GROQ_API_KEY.substring(0, 15) + '...' : 'не найден')
  console.log('  - GROQ_API_KEY длина:', GROQ_API_KEY ? GROQ_API_KEY.length : 0)
  
  // КРИТИЧЕСКАЯ ПРОВЕРКА: если USE_MOCK_ENV = true, сразу возвращаем заглушку
  if (USE_MOCK_ENV) {
    console.log('\n⚠️ ВНИМАНИЕ: USE_MOCK_RESPONSES=true - принудительно используется заглушка!')
    console.log('💡 Чтобы использовать Groq API, удалите или установите USE_MOCK_RESPONSES=false в .env')
    const systemContext = await buildSystemContext(shouldAddCTA)
    return handleMockResponse(message, systemContext, res, messageCount, req)
  }

  if (!GROQ_API_KEY) {
    console.error('\n❌ GROQ_API_KEY НЕ НАЙДЕН!')
    console.error('💡 Добавьте GROQ_API_KEY в файл .env')
    const systemContext = await buildSystemContext(shouldAddCTA)
    return handleMockResponse(message, systemContext, res, messageCount, req)
  }

  // Загружаем файлы знаний и формируем полный промпт
  console.log('\n📚 Загрузка файлов знаний...')
  const systemContext = await buildSystemContext(shouldAddCTA)
  console.log('✅ Файлы знаний загружены, промпт сформирован')
  console.log('   - Длина промпта:', systemContext.length, 'символов')
  console.log('   - Should add CTA:', shouldAddCTA)

  console.log('\n✅ Groq API ключ найден, отправляю запрос к Groq API...')

  try {
    // Используем Groq API (быстрый и бесплатный)
    // Endpoint: https://api.groq.com/openai/v1/chat/completions
    // Формат: OpenAI-совместимый
    console.log('📡 Отправляю запрос к api.groq.com/openai/v1/chat/completions...')
    console.log('🔑 Токен (первые 15):', GROQ_API_KEY.substring(0, 15) + '...')
    
    const requestBody = {
      model: 'llama-3.1-8b-instant', // Актуальная быстрая модель Groq
      messages: [
        {
          role: 'system',
          content: systemContext
        },
        {
          role: 'user',
          content: message
        }
      ],
      temperature: 0.7,
      max_tokens: 300 // Увеличил до 300, так как Groq быстрый
    }
    
    console.log('📦 Тело запроса (preview):', JSON.stringify(requestBody).substring(0, 300))
    console.log('📝 Полный системный промпт (длина):', systemContext.length, 'символов')
    console.log('🔍 Промпт содержит "Перми":', systemContext.includes('Перми'))
    console.log('🔍 Промпт содержит "Сочи":', systemContext.includes('Сочи'))
    console.log('🔍 Промпт содержит "Родился":', systemContext.includes('Родился'))
    console.log('📄 Промпт (первые 500 символов):', systemContext.substring(0, 500))
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY.trim()}`,
      },
      body: JSON.stringify(requestBody)
    })

    console.log('📊 Финальный статус ответа:', response.status, response.statusText)

    if (!response.ok) {
      const errorData = await response.text()
      console.error('❌ Groq API error status:', response.status)
      console.error('❌ Groq API error body:', errorData)
      
      // При ошибке API возвращаем заглушку вместо ошибки
      return handleMockResponse(message, systemContext, res, messageCount, req)
    }

    const data = await response.json()
    console.log('📦 Получен ответ от Groq:', JSON.stringify(data).substring(0, 200))
    
    // Groq API возвращает ответ в OpenAI-совместимом формате
    const assistantMessage = data.choices?.[0]?.message?.content || null
    
    if (!assistantMessage) {
      console.error('⚠️ Неожиданный формат ответа, используем заглушку:', data)
      return handleMockResponse(message, systemContext, res, messageCount, req)
    }

    // Очищаем ответ от markdown-символов, применяем лимит и CTA-политику
    const cleanedResponse = formatFinalResponse(assistantMessage, shouldAddCTA)

    console.log('✅ Получен ответ от Groq API')
    
    // Логируем переписку (не блокируем ответ)
    logConversation(message, cleanedResponse, { messageCount, shouldAddCTA, source: 'groq' }, req).catch(() => {})
    
    return res.status(200).json({
      response: cleanedResponse,
      source: 'groq'
    })

  } catch (error) {
    console.error('❌ Ошибка в try-catch:', error)
    console.error('❌ Error details:', error.stack)
    // При любой ошибке возвращаем заглушку
    return handleMockResponse(message, systemContext, res, messageCount, req)
  }
})

app.listen(PORT, () => {
  console.log(`\n🚀 Локальный сервер запущен на http://localhost:${PORT}`)
  console.log(`📡 API endpoint: http://localhost:${PORT}/api/chat`)
  
  // Проверяем загрузку .env
  console.log(`\n🔍 Проверка переменных окружения:`)
  const envPath = join(__dirname, '..', '.env')
  console.log(`  - .env файл загружен:`, existsSync(envPath))
  
  const groqApiKey = process.env.GROQ_API_KEY
  const useMock = process.env.USE_MOCK_RESPONSES === 'true'
  
  console.log(`  - USE_MOCK_RESPONSES:`, process.env.USE_MOCK_RESPONSES)
  console.log(`  - GROQ_API_KEY существует:`, !!groqApiKey)
  console.log(`  - GROQ_API_KEY длина:`, groqApiKey ? groqApiKey.length : 0)
  console.log(`  - GROQ_API_KEY первые 20 символов:`, groqApiKey ? groqApiKey.substring(0, 20) + '...' : 'не найден')
  
  if (useMock) {
    console.log(`\n📝 Режим заглушки активен (USE_MOCK_RESPONSES=true)`)
  } else if (groqApiKey) {
    console.log(`\n✅ Groq API настроен: ${groqApiKey.substring(0, 10)}...`)
  } else {
    console.log(`\n📝 Режим заглушки (нет GROQ_API_KEY)`)
    console.log(`💡 Для использования Groq API добавьте GROQ_API_KEY в .env`)
    console.log(`💡 Получите ключ на https://console.groq.com`)
  }
  
  console.log(`\n💡 Запустите фронтенд в другом терминале: npm run dev\n`)
})
