// Simple, robust handler exported as ESM default. This avoids build-time/runtime
// issues where Vercel may report "No exports found in module" if the file
// can't be evaluated. We return a sample JSON immediately so the frontend
// can render a report even when sqlite3 or the DB file isn't available.

export default function handler(req, res) {
  const cookie_id = req.query.cookie_id || req.query.cookieId || req.params?.cookie_id

  if (!cookie_id) {
    return res.status(400).json({ error: 'cookie_id is required' })
  }

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
        { timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), page: 'Главная', device: 'iPhone' },
        { timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), page: 'Курс', device: 'Android' }
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
