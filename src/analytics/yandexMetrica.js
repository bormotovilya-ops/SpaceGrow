const YM_SCRIPT_SRC = 'https://mc.yandex.ru/metrika/tag.js'

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function normalizeCounterId(counterId) {
  // Vite env vars are strings. We keep it string but validate it looks like a number.
  const id = isNonEmptyString(counterId) ? counterId.trim() : ''
  return id && /^\d+$/.test(id) ? id : null
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
  const counterId = normalizeCounterId(rawCounterId)
  if (!counterId) return false
  // eslint-disable-next-line no-undef
  if (typeof window === 'undefined' || typeof window.ym !== 'function') return false

  // `hit` is recommended for SPA navigation tracking.
  // eslint-disable-next-line no-undef
  window.ym(counterId, 'hit', url)
  return true
}

export function enableYandexMetricaSpaTracking(rawCounterId) {
  // eslint-disable-next-line no-undef
  if (typeof window === 'undefined') return { enabled: false, reason: 'no-window' }

  const counterId = normalizeCounterId(rawCounterId)
  if (!counterId) return { enabled: false, reason: 'no-counter-id' }

  const key = `__ym_spa_listener_${counterId}`
  // eslint-disable-next-line no-undef
  if (window[key]) return { enabled: true, counterId, alreadyEnabled: true }
  // eslint-disable-next-line no-undef
  window[key] = true

  const send = () => {
    const url = `${location.pathname}${location.search}${location.hash}`
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
  wrapHistoryFn('pushState')
  wrapHistoryFn('replaceState')

  // Initial hit (helps when you enable metrica after initial render).
  send()

  return { enabled: true, counterId }
}

