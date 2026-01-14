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

