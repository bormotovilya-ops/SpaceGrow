import { useState, useEffect } from 'react'
import { getSupabase } from '../utils/supabaseClient'

const SUPPORT_CONTACT_KEY = 'support_contact'

function normalizeContact(s) {
  if (s == null || typeof s !== 'string') return ''
  return s
    .replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF]+/g, '')
    .replace(/^["']|["']$/g, '')
    .replace(/^@+/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Проверяет, совпадает ли текущий пользователь Telegram с support_contact из настроек бота.
 * @returns {{ isSupportContact: boolean, loading: boolean }}
 */
export function useIsSupportContact() {
  const [isSupportContact, setIsSupportContact] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const check = async () => {
      try {
        const supabase = await getSupabase()
        if (!supabase || cancelled) return
        const { data, error } = await supabase.rpc('get_all_bot_settings')
        if (error || cancelled) return
        const list = Array.isArray(data) ? data : []
        const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : null
        const tgUser = tg?.initDataUnsafe?.user
        const currentId = tgUser?.id != null ? String(tgUser.id).trim() : null
        const rawUsername = tgUser?.username != null ? String(tgUser.username) : ''
        const currentUsername = normalizeContact(rawUsername)
        if (!currentId && !currentUsername) {
          if (!cancelled) setIsSupportContact(false)
          return
        }
        const supportRow = list.find((s) => s && s.key === SUPPORT_CONTACT_KEY)
        let raw = supportRow?.value
        if (raw != null && typeof raw === 'object' && !Array.isArray(raw)) {
          raw = raw.value ?? raw.v ?? raw.data ?? JSON.stringify(raw)
        }
        const supportValue = raw != null ? String(raw).trim() : ''
        if (!supportValue) {
          if (!cancelled) setIsSupportContact(false)
          return
        }
        const supportNorm = normalizeContact(supportValue)
        const match =
          (currentId && (currentId === supportValue.trim() || currentId === supportNorm)) ||
          (currentUsername && (currentUsername === supportNorm || supportNorm === currentUsername))
        if (!cancelled) setIsSupportContact(!!match)
      } catch (_) {
        if (!cancelled) setIsSupportContact(false)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    check()
    return () => { cancelled = true }
  }, [])

  return { isSupportContact, loading }
}
