/**
 * Singleton Supabase client to avoid "Multiple GoTrueClient instances" warnings.
 * Use getSupabase() everywhere instead of createClient().
 *
 * Patches fetch once to strip profile_id from request bodies sent to Supabase
 * (e.g. when another script like traffic.js injects it), so site_events inserts
 * never send that column.
 */

let _client = null
let _fetchPatched = false

function stripProfileIdFromBody(body) {
  if (body == null) return body
  if (Array.isArray(body)) {
    return body.map(function (row) {
      const out = {}
      Object.keys(row).forEach(function (k) {
        if (k !== 'profile_id') out[k] = row[k]
      })
      if (out.metadata && typeof out.metadata === 'object') {
        const m = out.metadata
        const clean = {}
        Object.keys(m).forEach(function (k) {
          if (k !== 'profile_id') clean[k] = m[k]
        })
        out.metadata = clean
      }
      return out
    })
  }
  if (typeof body === 'object') {
    const out = {}
    Object.keys(body).forEach(function (k) {
      if (k !== 'profile_id') out[k] = body[k]
    })
    if (out.metadata && typeof out.metadata === 'object') {
      const m = out.metadata
      const clean = {}
      Object.keys(m).forEach(function (k) {
        if (k !== 'profile_id') clean[k] = m[k]
      })
      out.metadata = clean
    }
    return out
  }
  return body
}

function patchFetchForSupabase(supabaseUrl) {
  if (_fetchPatched || typeof window === 'undefined' || !window.fetch) return
  _fetchPatched = true
  const baseUrl = supabaseUrl ? supabaseUrl.replace(/\/$/, '') : ''
  const originalFetch = window.fetch
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url)
    if (baseUrl && url && url.indexOf(baseUrl) !== -1 && init && init.body) {
      try {
        const body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body
        const cleaned = stripProfileIdFromBody(body)
        if (cleaned !== body) {
          init = Object.assign({}, init, { body: JSON.stringify(cleaned) })
        }
        const finalBody = typeof init.body === 'string' ? init.body : JSON.stringify(init.body)
        console.log('Final Request Body:', JSON.parse(finalBody))
      } catch (_) {}
    }
    return originalFetch.call(this, input, init)
  }
}

/**
 * Returns the shared Supabase client. Creates it once, then reuses.
 * @returns {Promise<import('@supabase/supabase-js').SupabaseClient | null>}
 */
export async function getSupabase() {
  if (_client) return _client

  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return null

  patchFetchForSupabase(url)

  try {
    const { createClient } = await import(/* @vite-ignore */ '@supabase/supabase-js')
    _client = createClient(url, key)
    return _client
  } catch (e) {
    return null
  }
}
