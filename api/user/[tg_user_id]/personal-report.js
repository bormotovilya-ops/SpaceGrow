const path = require('path')

// Vercel serverless function to serve /api/user/:tg_user_id/personal-report
module.exports = async (req, res) => {
  const tg_user_id = req.query.tg_user_id || req.query.tgUserId || req.params?.tg_user_id

  if (!tg_user_id) {
    return res.status(400).json({ error: 'tg_user_id is required' })
  }

  const BACKEND_URL = process.env.BACKEND_URL

  // If a backend URL is configured, proxy the request there (preferred)
  if (BACKEND_URL) {
    try {
      const upstream = await fetch(`${BACKEND_URL.replace(/\/$/, '')}/api/user/${tg_user_id}/personal-report`)
      const text = await upstream.text()
      // Try to parse JSON else return raw text with correct content-type
      try {
        const json = JSON.parse(text)
        return res.status(upstream.status).json(json)
      } catch (e) {
        res.setHeader('content-type', 'text/plain; charset=utf-8')
        return res.status(upstream.status).send(text)
      }
    } catch (err) {
      console.error('Proxy to BACKEND_URL failed:', err)
      // fallthrough to local handling
    }
  }

  // Try to read local sqlite DB if sqlite3 available (best-effort)
  try {
    const sqlite3 = require('sqlite3').verbose()
    const dbPath = path.join(process.cwd(), 'telegram-bot', 'bot_users.db')
    const db = new sqlite3.Database(dbPath)

    const get = (sql, params = []) => new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)))
    })
    const all = (sql, params = []) => new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))
    })

    // Build a minimal report similar to backend/app.py (subset)
    const userInfoRow = await get(`
      SELECT cookie_id, source, utm_params, referrer, MIN(session_start) as first_visit
      FROM site_sessions
      WHERE tg_user_id = ?
      GROUP BY cookie_id, source, utm_params, referrer
      ORDER BY first_visit ASC
      LIMIT 1
    `, [tg_user_id])

    const user = {
      tg_user_id: Number(tg_user_id),
      cookie_id: userInfoRow ? userInfoRow.cookie_id : null,
      traffic_source: userInfoRow ? (userInfoRow.source || 'Не определен') : 'Не определен',
      utm_params: userInfoRow && userInfoRow.utm_params ? JSON.parse(userInfoRow.utm_params) : {},
      referrer: userInfoRow ? userInfoRow.referrer : null,
      first_visit_date: userInfoRow ? userInfoRow.first_visit : null
    }

    // MiniApp opens
    const opens = await all(`
      SELECT DISTINCT ss.session_start as timestamp, ss.page_id as page, ss.device_type as device
      FROM site_sessions ss
      WHERE ss.tg_user_id = ?
      ORDER BY ss.session_start DESC
      LIMIT 20
    `, [tg_user_id])

    // Content views
    const contentRows = await all(`
      SELECT se.created_at, se.event_name, se.metadata, se.page
      FROM site_events se
      WHERE se.tg_user_id = ? AND se.event_type = 'content_view'
      ORDER BY se.created_at DESC
      LIMIT 50
    `, [tg_user_id])

    const content_views = contentRows.map(r => {
      const metadata = r.metadata ? JSON.parse(r.metadata) : {}
      return {
        section: metadata.content_type || r.event_name,
        time_spent: metadata.time_spent || 0,
        scroll_depth: metadata.scroll_depth || 0,
        timestamp: r.created_at
      }
    })

    // AI interactions (minimal)
    const aiRows = await all(`
      SELECT se.created_at, se.metadata
      FROM site_events se
      WHERE se.tg_user_id = ? AND se.event_type = 'ai_interaction'
      ORDER BY se.created_at DESC
      LIMIT 30
    `, [tg_user_id])

    const ai_interactions = aiRows.map(r => {
      const metadata = r.metadata ? JSON.parse(r.metadata) : {}
      return {
        messages_count: metadata.messages_count || 0,
        topics: metadata.topics || [],
        duration: metadata.duration || 0,
        timestamp: r.created_at
      }
    })

    // Very small segmentation stub (attempt to query helper table if exists)
    let segmentation = { segment: 'newcomer', engagement_level: 'low', total_sessions: 0, diagnostics_completed: false, last_activity: null }
    try {
      const seg = await get(`SELECT total_sessions, diagnostics_completed, last_activity FROM user_segments WHERE tg_user_id = ? LIMIT 1`, [tg_user_id])
      if (seg) segmentation = { ...segmentation, total_sessions: seg.total_sessions || 0, diagnostics_completed: !!seg.diagnostics_completed, last_activity: seg.last_activity }
    } catch (e) {
      // ignore if table missing
    }

    db.close()

    const report = {
      user,
      journey: {
        miniapp_opens: opens.map(o => ({ timestamp: o.timestamp, page: o.page || 'Главная', device: o.device || 'Не определено' })),
        content_views,
        ai_interactions,
        diagnostics: [],
        game_actions: [],
        cta_clicks: []
      },
      segmentation: {
        user_segment: segmentation.segment || 'newcomer',
        engagement_level: segmentation.engagement_level || 'low',
        basis: [
          `Общее количество сессий: ${segmentation.total_sessions || 0}`,
          `Завершена диагностика: ${segmentation.diagnostics_completed ? 'Да' : 'Нет'}`,
          `Уровень вовлеченности: ${segmentation.engagement_level || 'low'}`,
          `Последняя активность: ${segmentation.last_activity || 'Неизвестно'}`
        ]
      },
      recommendations: {
        next_steps: ['Пройти диагностику', 'Изучить разделы сайта', 'Связаться для консультации'],
        automatic_actions: [],
        content_suggestions: [],
        cta_suggestions: []
      },
      generated_at: new Date().toISOString()
    }

    return res.json(report)
  } catch (err) {
    console.error('Local sqlite handling failed or sqlite3 not installed:', err.message || err)
  }

  // Final fallback: return a sample report (prevents frontend parsing HTML)
  const sample = generateSampleReport(tg_user_id)
  return res.json(sample)
}

function generateSampleReport(tg_user_id) {
  const now = new Date().toISOString()
  return {
    user: { tg_user_id: Number(tg_user_id), cookie_id: null, traffic_source: 'Не определен', utm_params: {}, referrer: null, first_visit_date: null },
    journey: { miniapp_opens: [], content_views: [], ai_interactions: [], diagnostics: [], game_actions: [], cta_clicks: [] },
    segmentation: { user_segment: 'newcomer', engagement_level: 'low', basis: ['Данных нет'] },
    recommendations: { next_steps: ['Пройти диагностику'], automatic_actions: [], content_suggestions: [], cta_suggestions: [] },
    generated_at: now
  }
}
