import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Парсит hash и возвращает { path, section }.
 * - Нативный формат /path#section_id: hash = "profile-achievements" → section = "profile-achievements".
 * - Legacy: "profile?section=profile-achievements" → section из query.
 */
export function parseHashSection() {
  const hash = typeof window !== 'undefined' ? window.location.hash.slice(1) : ''
  if (!hash) return { path: '', section: null }
  if (hash.includes('?')) {
    const [pathPart, queryPart] = hash.split('?')
    const params = new URLSearchParams(queryPart || '')
    const section = params.get('section')
    return { path: pathPart, section }
  }
  return { path: '', section: hash }
}

/**
 * Хук: при наличии в URL параметра section ищет элемент по data-section-id или id и скроллит к нему.
 * После скролла (опционально) очищает ?section=... из hash.
 */
export function useHashSectionScroll(options = {}) {
  const { clearAfterScroll = true, scrollDelay = 800 } = options
  const clearedRef = useRef(false)
  const location = useLocation()

  useEffect(() => {
    const run = () => {
      const { section } = parseHashSection()
      if (!section) return

      const byData = document.querySelector(`[data-section-id="${section}"]`)
      const byId = document.getElementById(section)
      const el = byData || byId
      if (!el) return

      el.scrollIntoView({ behavior: 'smooth', block: 'start' })

      if (clearAfterScroll) {
        const hash = window.location.hash.slice(1)
        const pathOnly = hash.includes('?') ? hash.split('?')[0] || '' : hash
        const newHash = pathOnly ? `#${pathOnly}` : ''
        const newUrl = window.location.pathname + window.location.search + newHash
        setTimeout(() => {
          window.history.replaceState(null, '', newUrl)
        }, scrollDelay)
      }
    }

    run()
    const onHashChange = () => run()
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [clearAfterScroll, scrollDelay, location.pathname, location.hash])
}
