import { createClient } from '@supabase/supabase-js'

// Vercel serverless function: /api/user/by-cookie/:cookieId/personal-report
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const cookieId = req.query.cookie_id ?? req.params?.cookie_id
  console.log('Cookie ID received:', cookieId)

  if (!cookieId) {
    return res.status(400).json({ error: 'cookie_id is required' })
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase is not configured' })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
    const { data, error } = await supabase
      .from('personal_reports')
      .select('*')
      .eq('cookie_id', cookieId)
      .single()

    if (!data || error) {
      console.error('Report not found for this cookie:', error)
      return res.status(404).json({ error: 'Report not found' })
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    return res.status(200).json(data)
  } catch (err) {
    console.error('Personal report by cookie failed:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
