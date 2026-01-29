/**
 * Singleton Supabase client to avoid "Multiple GoTrueClient instances" warnings.
 * Use getSupabase() everywhere instead of createClient().
 */

let _client = null

/**
 * Returns the shared Supabase client. Creates it once, then reuses.
 * @returns {Promise<import('@supabase/supabase-js').SupabaseClient | null>}
 */
export async function getSupabase() {
  if (_client) return _client

  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return null

  try {
    const { createClient } = await import(/* @vite-ignore */ '@supabase/supabase-js')
    _client = createClient(url, key)
    return _client
  } catch (e) {
    return null
  }
}
