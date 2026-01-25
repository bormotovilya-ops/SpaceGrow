module.exports = async function handler(req, res) {
  // Required by request from maintainer: explicit async default export
  console.log("Function triggered with cookie_id:", req.query)

  const cookie_id = req.query.cookie_id || req.query.cookieId || (req.params && req.params.cookie_id)

  if (!cookie_id) {
    return res.status(400).json({ error: 'cookie_id is required' })
  }

  // Try to use local sqlite DB if available (best-effort). If anything fails
  // we must return a sample JSON so frontend can render a report.
  try {
    // require so function still loads if sqlite isn't present in deployment
    let sqlite3 = null
    try {
      sqlite3 = require('sqlite3')
      if (sqlite3 && sqlite3.default) sqlite3 = sqlite3.default
    } catch (e) {
      sqlite3 = null
    }

    if (sqlite3) {
      const sqlite = sqlite3.verbose()
      let path = null
      try {
        path = require('path')
        if (path && path.default) path = path.default
      } catch (e) {
        path = null
      }
      const dbPath = path ? path.join(process.cwd(), 'telegram-bot', 'bot_users.db') : null

      if (dbPath) {
        const db = new sqlite.Database(dbPath)
        const get = (sql, params = []) => new Promise((resolve, reject) => db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row))))
        const all = (sql, params = []) => new Promise((resolve, reject) => db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows))))

        try {
          const userInfoRow = await get(`
            SELECT tg_user_id, source, utm_params, referrer, MIN(session_start) as first_visit
            FROM site_sessions
            WHERE cookie_id = ?
            GROUP BY tg_user_id, source, utm_params, referrer
            ORDER BY first_visit ASC
            LIMIT 1
          `, [cookie_id])

          const user = {
            tg_user_id: userInfoRow ? Number(userInfoRow.tg_user_id) : null,
            cookie_id,
            traffic_source: userInfoRow ? (userInfoRow.source || 'Не определен') : 'Не определен',
            utm_params: userInfoRow && userInfoRow.utm_params ? JSON.parse(userInfoRow.utm_params) : {},
            referrer: userInfoRow ? userInfoRow.referrer : null,
            first_visit_date: userInfoRow ? userInfoRow.first_visit : null
          }

          const opens = await all(`
            SELECT DISTINCT ss.session_start as timestamp, ss.page_id as page, ss.device_type as device
            FROM site_sessions ss
            WHERE ss.cookie_id = ?
            ORDER BY ss.session_start DESC
            LIMIT 20
          `, [cookie_id])

          const contentRows = await all(`
            SELECT se.created_at, se.event_name, se.metadata, se.page
            FROM site_events se
            WHERE se.cookie_id = ? AND se.event_type = 'content_view'
            ORDER BY se.created_at DESC
            LIMIT 50
          `, [cookie_id])

          const content_views = contentRows.map(r => {
            const metadata = r.metadata ? JSON.parse(r.metadata) : {}
            return {
              section: metadata.content_type || r.event_name,
              time_spent: metadata.time_spent || 0,
              scroll_depth: metadata.scroll_depth || 0,
              timestamp: r.created_at
            }
          })

          const aiRows = await all(`
            SELECT se.created_at, se.metadata
            FROM site_events se
            WHERE se.cookie_id = ? AND se.event_type = 'ai_interaction'
            ORDER BY se.created_at DESC
            LIMIT 30
          `, [cookie_id])

          const ai_interactions = aiRows.map(r => {
            const metadata = r.metadata ? JSON.parse(r.metadata) : {}
            return {
              messages_count: metadata.messages_count || 0,
              topics: metadata.topics || [],
              duration: metadata.duration || 0,
              timestamp: r.created_at
            }
          })

          db.close()

          const now = new Date().toISOString()
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
              user_segment: 'newcomer',
              engagement_level: 'low',
              basis: []
            },
            recommendations: {
              next_steps: [],
              automatic_actions: [],
              content_suggestions: [],
              cta_suggestions: []
            },
            generated_at: now
          }

          try { res.setHeader('Content-Type', 'application/json; charset=utf-8') } catch (e) {}
          return res.status(200).json(report)
        } catch (e) {
          // If DB read failed, continue to sample fallback below
          console.error('DB read error (by-cookie):', e && e.message ? e.message : e)
        }
      }
    }
  } catch (err) {
    // any runtime error must not prevent returning a sample
    console.error('by-cookie personal-report handler error:', err && err.message ? err.message : err)
  }

  // Final fallback: sample variant 3 (ensures frontend never receives HTML)
  const now = new Date().toISOString()
  const sample = {
    user: {
      tg_user_id: null,
      cookie_id,
      traffic_source: 'Реклама в соцсетях',
      utm_params: { utm_source: 'facebook', utm_medium: 'cpc' },
      referrer: 'https://example.com',
      first_visit_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString()
    },
    journey: {
      miniapp_opens: [
        { timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), page: 'Главная', device: 'iPhone' }
      ],
      content_views: [],
      ai_interactions: [],
      diagnostics: [],
      game_actions: [],
      cta_clicks: []
    },
    segmentation: {
      user_segment: 'newcomer',
      engagement_level: 'low',
      basis: [ 'Общее количество сессий: 0' ]
    },
    recommendations: {
      next_steps: ['Пройти диагностику']
    },
    generated_at: now,
    _sample_variant: 3
  }

  try { res.setHeader('X-Sample-Data', 'true') } catch (e) {}
  try { res.setHeader('Content-Type', 'application/json; charset=utf-8') } catch (e) {}
  return res.status(200).json(sample)
}
