const YM_SCRIPT_SRC = 'https://mc.yandex.ru/metrika/tag.js'

const DEFAULT_COUNTER_ID_KEY = '__ym_default_counter_id'

let defaultCounterId = null

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function normalizeCounterId(counterId) {
  // Vite env vars are strings, but allow passing a number too.
  const raw = typeof counterId === 'number' ? String(counterId) : counterId
  const id = isNonEmptyString(raw) ? raw.trim() : ''
  return id && /^\d+$/.test(id) ? id : null
}

function getDefaultCounterId() {
  // eslint-disable-next-line no-undef
  if (defaultCounterId) return defaultCounterId
  // eslint-disable-next-line no-undef
  if (typeof window !== 'undefined' && window[DEFAULT_COUNTER_ID_KEY]) return window[DEFAULT_COUNTER_ID_KEY]
  return null
}

function ensureYmStub() {
  // Create the `ym` stub exactly once (Yandex tag.js will replace it).
  // eslint-disable-next-line no-undef
  if (typeof window === 'undefined') return
  if (typeof window.ym === 'function' && window.ym.l) return

  // eslint-disable-next-line no-undef, func-names
  window.ym = window.ym || function () {
    // eslint-disable-next-line prefer-rest-params
    ;(window.ym.a = window.ym.a || []).push(arguments)
  }
  // eslint-disable-next-line no-undef
  window.ym.l = Date.now()
}

function ensureYmScript() {
  // eslint-disable-next-line no-undef
  if (typeof document === 'undefined') return
  if (document.querySelector(`script[data-ym-tag="true"]`)) return

  const s = document.createElement('script')
  s.async = true
  s.src = YM_SCRIPT_SRC
  s.dataset.ymTag = 'true'
  document.head.appendChild(s)
}

export function initYandexMetrica(rawCounterId, initOptions = {}) {
  // eslint-disable-next-line no-undef
  if (typeof window === 'undefined') return { enabled: false, reason: 'no-window' }

  const counterId = normalizeCounterId(rawCounterId)
  if (!counterId) {
    if (import.meta?.env?.DEV) {
      // eslint-disable-next-line no-console
      console.warn(
        '[YandexMetrica] Disabled: missing/invalid VITE_YM_COUNTER_ID (must be digits).'
      )
    }
    return { enabled: false, reason: 'no-counter-id' }
  }

  // Avoid double-init for the same counter (useful in HMR / strict mode / re-mounts)
  const key = `__ym_inited_${counterId}`
  // eslint-disable-next-line no-undef
  if (window[key]) return { enabled: true, counterId, alreadyInitialized: true }
  // eslint-disable-next-line no-undef
  window[key] = true

  // Remember the last inited counter id (so other modules can call reachGoal without duplicating env reads)
  defaultCounterId = counterId
  // eslint-disable-next-line no-undef
  window[DEFAULT_COUNTER_ID_KEY] = counterId

  ensureYmStub()
  ensureYmScript()

  // Default options from Yandex docs; can be overridden via initOptions.
  const options = {
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
    webvisor: true,
    ...initOptions,
  }

  // eslint-disable-next-line no-undef
  window.ym(counterId, 'init', options)

  return { enabled: true, counterId, options }
}

export function yandexMetricaHit(rawCounterId, url) {
  const counterId = normalizeCounterId(rawCounterId) || getDefaultCounterId()
  if (!counterId) return false
  // eslint-disable-next-line no-undef
  if (typeof window === 'undefined' || typeof window.ym !== 'function') return false

  // `hit` is recommended for SPA navigation tracking.
  // eslint-disable-next-line no-undef
  window.ym(counterId, 'hit', url)
  return true
}

export function yandexMetricaReachGoal(rawCounterId, goalId, params) {
  const counterId = normalizeCounterId(rawCounterId) || getDefaultCounterId()
  if (!counterId) return false

  const goal = isNonEmptyString(goalId) ? goalId.trim() : ''
  if (!goal) return false

  // eslint-disable-next-line no-undef
  if (typeof window === 'undefined' || typeof window.ym !== 'function') return false

  try {
    const callback = arguments.length >= 4 ? arguments[3] : undefined
    const timeoutMs = arguments.length >= 5 ? arguments[4] : 900

    // If we need to navigate away right after sending a goal (e.g. opening Telegram),
    // use YM callback + small fallback timeout so the request has a chance to be sent.
    if (typeof callback === 'function') {
      let called = false
      const safeCb = () => {
        if (called) return
        called = true
        try {
          callback()
        } catch {
          // ignore
        }
      }

      // eslint-disable-next-line no-undef
      window.ym(counterId, 'reachGoal', goal, params || {}, safeCb)
      // Fallback: never block the action if callback doesn't fire.
      setTimeout(safeCb, Number.isFinite(timeoutMs) ? timeoutMs : 900)
      return true
    }

    // eslint-disable-next-line no-undef
    window.ym(counterId, 'reachGoal', goal, params || {})
    return true
  } catch {
    return false
  }
}

export function enableYandexMetricaSpaTracking(rawCounterId) {
  // eslint-disable-next-line no-undef
  if (typeof window === 'undefined') return { enabled: false, reason: 'no-window' }

  const counterId = normalizeCounterId(rawCounterId) || getDefaultCounterId()
  if (!counterId) return { enabled: false, reason: 'no-counter-id' }

  const key = `__ym_spa_listener_${counterId}`
  // eslint-disable-next-line no-undef
  if (window[key]) return { enabled: true, counterId, alreadyEnabled: true }
  // eslint-disable-next-line no-undef
  window[key] = true

  let lastUrl = null
  const send = () => {
    const url = `${location.pathname}${location.search}${location.hash}`
    if (url === lastUrl) return
    lastUrl = url
    yandexMetricaHit(counterId, url)
  }

  const wrapHistoryFn = (name) => {
    const original = history[name]
    // Some environments may block redefining; guard with try/catch.
    try {
      history[name] = function () {
        // eslint-disable-next-line prefer-rest-params
        const ret = original.apply(this, arguments)
        send()
        return ret
      }
    } catch {
      // ignore
    }
  }

  window.addEventListener('popstate', send)
  // App navigation relies heavily on hash routes; track them too (especially on mobile).
  window.addEventListener('hashchange', send)
  wrapHistoryFn('pushState')
  wrapHistoryFn('replaceState')

  // Initial hit (helps when you enable metrica after initial render).
  send()

  return { enabled: true, counterId }
}

export function enableYandexMetricaContactGoals(rawCounterId, goalIds = {}) {
  // eslint-disable-next-line no-undef
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { enabled: false, reason: 'no-window' }
  }

  const counterId = normalizeCounterId(rawCounterId) || getDefaultCounterId()
  if (!counterId) return { enabled: false, reason: 'no-counter-id' }

  const key = `__ym_contact_goals_${counterId}`
  // eslint-disable-next-line no-undef
  if (window[key]) return { enabled: true, counterId, alreadyEnabled: true }
  // eslint-disable-next-line no-undef
  window[key] = true

  const goals = {
    telegram: 'contact_telegram_click',
    phone: 'contact_phone_click',
    email: 'contact_email_click',
    outbound: 'outbound_link_click',
    ...goalIds,
  }

  const isSameOrigin = (url) => {
    try {
      const u = new URL(url, window.location.href)
      return u.origin === window.location.origin
    } catch {
      return true
    }
  }

  const isTelegramHost = (host) => host === 't.me' || host === 'telegram.me'

  const handler = (e) => {
    const target = e.target
    if (!target) return

    // Find closest anchor
    const a = target.closest ? target.closest('a') : null
    if (!a) return

    const href = a.getAttribute('href') || ''
    if (!href || href.startsWith('#')) return

    // tel/mail goals
    if (href.startsWith('tel:')) {
      yandexMetricaReachGoal(counterId, goals.phone, { href })
      return
    }
    if (href.startsWith('mailto:')) {
      yandexMetricaReachGoal(counterId, goals.email, { href })
      return
    }

    // external url goals (including Telegram)
    try {
      const u = new URL(href, window.location.href)
      if (isTelegramHost(u.hostname)) {
        yandexMetricaReachGoal(counterId, goals.telegram, { href: u.href })
        return
      }
      if (!isSameOrigin(u.href)) {
        yandexMetricaReachGoal(counterId, goals.outbound, { href: u.href, host: u.hostname })
      }
    } catch {
      // ignore invalid URLs
    }
  }

  document.addEventListener('click', handler, { capture: true })

  return { enabled: true, counterId, goals }
}
