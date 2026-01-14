export function openTelegramLink(url) {
  if (typeof window === 'undefined') return false

  const tg = window.Telegram?.WebApp

  try {
    // Inside Telegram WebApp (mobile/desktop) this opens Telegram reliably.
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(url)
      return true
    }
    // Fallback supported in some versions.
    if (tg?.openLink) {
      tg.openLink(url)
      return true
    }
  } catch {
    // ignore
  }

  // Browser fallback
  window.open(url, '_blank', 'noopener,noreferrer')
  return true
}

export function buildTelegramShareUrl(text, url = '') {
  const t = typeof text === 'string' ? text : String(text ?? '')
  const u = typeof url === 'string' ? url : String(url ?? '')
  return `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}`
}

export function buildTelegramChatUrl(username, text) {
  const u = typeof username === 'string' ? username.trim().replace(/^@/, '') : ''
  if (!u) return ''
  const t = typeof text === 'string' ? text : String(text ?? '')
  return `https://t.me/${u}?text=${encodeURIComponent(t)}`
}

export function openTelegramChat(username, text) {
  if (typeof window === 'undefined') return false

  const u = typeof username === 'string' ? username.trim().replace(/^@/, '') : ''
  if (!u) return false

  const t = typeof text === 'string' ? text : String(text ?? '')
  const httpsUrl = `https://t.me/${u}?text=${encodeURIComponent(t)}`
  const tgUrl = `tg://resolve?domain=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}`

  const tg = window.Telegram?.WebApp

  // In Telegram WebApp: prefer openLink for full URLs with query params
  // (openTelegramLink may drop/ignore ?text in some environments).
  try {
    if (tg?.openLink) {
      tg.openLink(httpsUrl)
      return true
    }
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(`https://t.me/${u}`)
      // Fall back to opening full url in a new tab; best effort.
      setTimeout(() => {
        try {
          window.open(httpsUrl, '_blank', 'noopener,noreferrer')
        } catch {
          // ignore
        }
      }, 0)
      return true
    }
  } catch {
    // ignore
  }

  // Browser: try deep-link first (better chance to preserve prefilled text on mobile),
  // then fall back to https link.
  try {
    window.location.href = tgUrl
  } catch {
    // ignore
  }
  setTimeout(() => {
    try {
      window.open(httpsUrl, '_blank', 'noopener,noreferrer')
    } catch {
      // ignore
    }
  }, 700)

  return true
}

