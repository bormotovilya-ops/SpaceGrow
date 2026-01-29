import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ status: 'error', error: 'Method not allowed' })
  }
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return res.status(200).json({
        status: 'error',
        error: 'SUPABASE_URL or SUPABASE_ANON_KEY not set in environment',
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
}
