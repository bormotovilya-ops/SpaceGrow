/**
 * Древовидная структура сайта для страницы Sitemap.
 * Каждый узел: id (section_id в БД), label, path, segment, matchId (уникальный ключ для базы).
 */
export const SEGMENTS = {
  hard: { emoji: '🧱', label: 'Hard' },
  soft: { emoji: '✨', label: 'Soft' },
  common: { emoji: '⚙️', label: 'Common' }
}

export const sitemapTree = [
  {
    id: 'main',
    label: 'Главная',
    icon: '🏠',
    path: '/home',
    segment: 'common',
    matchId: 'home_root',
    children: [
      { id: 'main-header', label: 'Заголовок', icon: '👋', path: '/home#main-header', segment: 'common', matchId: 'home_header' },
      { id: 'main-greeting', label: 'Приветствие', icon: '👋', path: '/home#main-greeting', segment: 'common', matchId: 'home_greeting' },
      { id: 'main-achievements', label: 'Достижения', icon: '🏆', path: '/home#main-achievements', segment: 'common', matchId: 'home_achievements' },
      { id: 'main-automation', label: 'Ваш путь к автоматизации', icon: '🛤️', path: '/home#main-automation', segment: 'Hard', matchId: 'home_automation_block' },
      { id: 'main-nav', label: 'Навигация (Ключевые разделы)', icon: '🧭', path: '/home#main-nav', segment: 'common', matchId: 'home_nav' },
      { id: 'main-faq', label: 'Частые вопросы', icon: '❓', path: '/home#main-faq', segment: 'common', matchId: 'home_faq' },
      { id: 'main-contacts', label: 'Контакты', icon: '📞', path: '/home#main-contacts', segment: 'common', matchId: 'home_contacts' },
      { id: 'main-docs', label: 'Документы/согласия', icon: '📄', path: '/home#main-docs', segment: 'common', matchId: 'home_docs' }
    ]
  },
  {
    id: 'profile',
    label: 'Профиль',
    icon: '👤',
    path: '/profile',
    segment: 'common',
    matchId: 'profile_root',
    children: [
      { id: 'profile-greeting', label: 'Приветствие', icon: '👋', path: '/profile#profile-greeting', segment: 'common', matchId: 'profile_greeting' },
      { id: 'profile-report', label: 'Персональный отчет', icon: '📊', path: '/profile#profile-report', segment: 'hard', matchId: 'profile_report' },
      { id: 'profile-ai', label: 'Диалог с ИИ-агентом', icon: '🤖', path: '/profile#profile-ai', segment: 'common', matchId: 'profile_ai' },
      { id: 'profile-cases', label: 'Кейсы', icon: '💼', path: '/profile#profile-cases', segment: 'hard', matchId: 'profile_cases' },
      { id: 'profile-tech', label: 'Технологический стек', icon: '💻', path: '/profile#profile-tech', segment: 'hard', matchId: 'profile_tech' },
      { id: 'profile-achievements', label: 'Достижения', icon: '🏆', path: '/profile#profile-achievements', segment: 'hard', matchId: 'profile_achievements' },
      { id: 'profile-approach', label: 'Мой подход', icon: '🎯', path: '/profile#profile-approach', segment: 'common', matchId: 'profile_approach' },
      { id: 'profile-contacts', label: 'Контакты', icon: '📞', path: '/profile#profile-contacts', segment: 'common', matchId: 'profile_contacts' },
      { id: 'profile-requisites', label: 'Реквизиты организации', icon: '📋', path: '/profile#profile-requisites', segment: 'common', matchId: 'profile_requisites' },
      { id: 'profile-cta', label: 'CTA «Получить бесплатную консультацию»', icon: '🎯', path: '/profile#profile-cta', segment: 'common', matchId: 'profile_cta', huntStage: 4 }
    ]
  },
  {
    id: 'diagnostics',
    label: 'Диагностика',
    icon: '🧬',
    path: '/diagnostics',
    segment: 'hard',
    matchId: 'diagnostics_root'
  },
  {
    id: 'funnel',
    label: 'Воронка',
    icon: '📉',
    path: '/funnel',
    segment: 'hard',
    matchId: 'funnel_root',
    children: [
      { id: 'funnel-diagram', label: 'Диаграмма воронки продаж', icon: '📊', path: '/funnel#funnel-diagram', segment: 'hard', matchId: 'funnel_diagram' },
      { id: 'funnel-blocks', label: 'Блоки воронки', icon: '📦', path: '/funnel#funnel-blocks', segment: 'hard', matchId: 'funnel_blocks' },
      { id: 'block-audience', label: 'Блок: Аудитория', icon: '👥', path: '/block/audience', segment: 'hard', matchId: 'block_audience' },
      { id: 'block-landing', label: 'Блок: Лендинг', icon: '🌐', path: '/block/landing', segment: 'hard', matchId: 'block_landing' },
      { id: 'block-leadmagnet', label: 'Блок: Лидмагнит', icon: '🎁', path: '/block/leadmagnet', segment: 'hard', matchId: 'block_leadmagnet' },
      { id: 'block-tripwire', label: 'Блок: Трипваер', icon: '⚡', path: '/block/tripwire', segment: 'hard', matchId: 'block_tripwire' },
      { id: 'block-autofunnel', label: 'Блок: Автоворонки прогрева', icon: '🔥', path: '/block/autofunnel', segment: 'hard', matchId: 'block_autofunnel' },
      { id: 'block-product', label: 'Блок: Продукт', icon: '📦', path: '/block/product', segment: 'hard', matchId: 'block_product' },
      { id: 'block-money', label: 'Блок: Деньги', icon: '💰', path: '/block/money', segment: 'hard', matchId: 'block_money' }
    ]
  },
  {
    id: 'alchemy',
    label: 'Цифровая Алхимия',
    icon: '⚗️',
    path: '/alchemy',
    segment: 'soft',
    matchId: 'alchemy_root',
    children: [
      { id: 'alchemy-tarot', label: 'Таро', icon: '🃏', path: '/alchemy/tarot', segment: 'soft', matchId: 'alchemy_tarot', huntStage: 2 },
      { id: 'alchemy-astrolabe', label: 'Астролябия', icon: '🧭', path: '/alchemy/astrolabe', segment: 'soft', matchId: 'alchemy_astrolabe', huntStage: 2 },
      { id: 'alchemy-tests', label: 'Тесты', icon: '📝', path: '/alchemy/tests', segment: 'soft', matchId: 'alchemy_tests' },
      { id: 'alchemy-ikigai', label: 'Тест Икигай', icon: '🌸', path: '/alchemy/ikigai', segment: 'soft', matchId: 'alchemy_ikigai' },
      { id: 'alchemy-mirror', label: 'Разговор с Зеркалом', icon: '🔮', path: '/alchemy/mirror', segment: 'soft', matchId: 'alchemy_mirror', huntStage: 2 }
    ]
  }
]

/** Плоский список всех узлов по id и по matchId для поиска */
function flattenNodes(nodes, out = []) {
  for (const node of nodes) {
    out.push(node)
    if (node.children?.length) flattenNodes(node.children, out)
  }
  return out
}

const flatNodes = flattenNodes(sitemapTree)

/**
 * Находит узел по sectionId (id или matchId).
 * @param {string} sectionId — id или matchId из sitemap
 * @returns {{ id: string, label: string, path?: string } | null}
 */
export function findSectionById(sectionId) {
  if (!sectionId) return null
  const s = String(sectionId)
  return flatNodes.find((n) => n.id === s || n.matchId === s) || null
}

/**
 * Находит узел и его родителя по sectionId.
 * @param {string} sectionId — id или matchId из sitemap
 * @returns {{ node: object, parent: object | null } | null}
 */
export function findSectionWithParent(sectionId) {
  if (!sectionId) return null
  const s = String(sectionId)
  let foundNode = null
  let foundParent = null

  function walk(nodes, parent = null) {
    for (const node of nodes) {
      if (node.id === s || node.matchId === s) {
        foundNode = node
        foundParent = parent
        return true
      }
      if (node.children?.length && walk(node.children, node)) return true
    }
    return false
  }

  if (walk(sitemapTree)) {
    return { node: foundNode, parent: foundParent }
  }
  return null
}

/** Нормализация path для сравнения: без хэша, с ведущим слэшем */
function normalizePath(p) {
  if (p == null || typeof p !== 'string') return ''
  const s = String(p).trim()
  const withoutHash = s.split('#')[0]
  return withoutHash.startsWith('/') ? withoutHash : `/${withoutHash}`
}

/**
 * Находит узел по path (например /funnel, /home, /block/audience).
 * Сначала точное совпадение, затем по path без хэша.
 * @param {string} path — путь из события (page)
 * @returns {{ id: string, label: string, icon?: string, path?: string } | null}
 */
export function findSectionByPath(path) {
  if (!path) return null
  const normalized = normalizePath(path)
  if (!normalized) return null
  for (const node of flatNodes) {
    const nodePath = node.path ? normalizePath(node.path) : ''
    if (nodePath === normalized) return node
  }
  return null
}

/**
 * Определяет huntStage для узла или по контексту события.
 * Приоритет: huntStage из узла sitemap > авто-вывод по event_name/page.
 * Stage 4 = Comparison/Selection (CTA в диалог TG), 3 = Investigation (PDF), 2 = Problem Awareness (переходы).
 * @param {object} node — узел из findSectionById/findSectionByPath (может быть null)
 * @param {string} eventName — event_name (cta_click, pdf_download, section_view, page_view, …)
 * @param {string} page — page path (например /diagnostics, /block/audience)
 * @param {object} metadata — метаданные (cta_opens_tg, opens_tg, action)
 */
/** События активного взаимодействия (usage, test_start, message_sent, mirror_usage) — huntStage из sitemap или 3 */
const INTERACTION_EVENT_NAMES = ['mirror_usage', 'message_sent', 'usage', 'test_start', 'ai_chat_message']

export function inferHuntStage(node, eventName, page = null, metadata = {}) {
  const ev = String(eventName || '')
  const p = page ? String(page) : ''
  // section_view — только автоматический скролл: принудительно Stage 2 (Просто осведомленность), даже если в Sitemap выше
  if (ev === 'section_view') return 2
  // Приоритет huntStage из узла sitemap для остальных событий
  if (node?.huntStage != null && node.huntStage >= 1 && node.huntStage <= 4) return node.huntStage
  // Stage 4: только переход в Telegram (прямое обращение, самое «горячее» действие)
  if (ev === 'cta_click' && (metadata?.cta_opens_tg === true || metadata?.opens_tg === true)) return 4
  // Stage 2: CTA «Начать диагностику», «Начать исследование», «Экспресс-диагностика» — старт теста, осведомлённость
  const startLabel = (metadata?.cta_text ?? metadata?.ctaText ?? metadata?.label ?? metadata?.custom_label ?? '')?.trim() || ''
  const isStartDiagnosticsCta = metadata?.cta_type === 'diagnostics_start' || metadata?.cta_type === 'sticky_cta' ||
    /Начать диагностику|Начать исследование|Экспресс-диагностика/i.test(startLabel)
  if (ev === 'cta_click' && isStartDiagnosticsCta) return 2
  // Stage 3: CTA без перехода в TG — ещё не покупка, «Исследование»
  if (ev === 'cta_click') return 3
  // Stage 3: скачивание PDF (астролябия)
  if (ev === 'pdf_download') return 3
  if (ev === 'astrolabe_action' && metadata?.action === 'pdf_download') return 3
  // Stage 3: достиг страницы результатов диагностики / Икигай
  if (ev === 'diagnostics_results_view' || ev === 'ikigai_results_view') return 3
  // События взаимодействия (Зеркало, ИИ-агент, тесты): huntStage из sitemap или 3
  if (INTERACTION_EVENT_NAMES.includes(ev)) {
    if (metadata?.is_interaction === true) return node?.huntStage ?? 3
    if (ev === 'mirror_usage' || ev === 'ai_chat_message') return node?.huntStage ?? 3
  }
  // Stage 2: обычные переходы (page_view, content_view)
  if (ev === 'page_view' || ev === 'content_view') return 2
  return null
}

export default sitemapTree
