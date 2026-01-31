import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronDown, Folder, FileText } from 'lucide-react'
import { getSupabase } from '../utils/supabaseClient'
import { sitemapTree, SEGMENTS } from '../config/sitemapData'

/** Нормализация id для сравнения: убираем / и #, приводим к нижнему регистру */
function normalizeId(s) {
  if (s == null || s === '') return ''
  return String(s).replace(/[/#]/g, '').trim().toLowerCase()
}

/** Из page (например /#profile или /diagnostics) извлекаем первый сегмент как section_id */
function sectionIdFromPage(page, pathToIdMap) {
  if (!page) return null
  const normalized = normalizeId(page)
  if (!normalized) return null
  if (pathToIdMap && pathToIdMap[normalized]) return pathToIdMap[normalized]
  return normalized
}

/** Собирает карту: нормализованный path -> id (для fallback по page) */
function buildPathToIdMap(nodes) {
  const map = {}
  function walk(ns) {
    for (const n of ns) {
      let key = normalizeId(n.path)
      if (key === '' && n.id) {
        map[''] = n.id
        map[n.id] = n.id
      } else if (key) {
        map[key] = n.id
      }
      if (n.children?.length) walk(n.children)
    }
  }
  walk(nodes)
  return map
}

/** Собирает из событий карту (нормализованный section_id) -> количество. custom_data.section_id приводится к строке. */
function buildCountMap(events, pathToIdMap) {
  const map = {}
  for (const e of events) {
    let sectionId = null
    if (e.custom_data) {
      try {
        const data = typeof e.custom_data === 'string' ? JSON.parse(e.custom_data) : e.custom_data
        const raw = data?.section_id ?? null
        sectionId = raw != null ? String(raw) : null
      } catch (_) {}
    }
    if (!sectionId && e.page != null) {
      const fromPage = sectionIdFromPage(e.page, pathToIdMap) ?? pathToIdMap?.[normalizeId(String(e.page))]
      if (fromPage) sectionId = fromPage
    }
    const key = normalizeId(sectionId)
    if (!key) continue
    map[key] = (map[key] || 0) + 1
  }
  return map
}

/** Рекурсивно считает популярность: для листа — из countMap по node.id или node.matchId (нормализованным), для родителя — сумма детей */
function computePopularity(node, countMap) {
  if (node.children && node.children.length > 0) {
    let sum = 0
    for (const child of node.children) {
      sum += computePopularity(child, countMap)
    }
    return sum
  }
  const idKey = normalizeId(String(node.id))
  const matchKey = node.matchId ? normalizeId(String(node.matchId)) : null
  return countMap[idKey] ?? (matchKey ? countMap[matchKey] ?? 0 : 0)
}

/** Добавляет поле popularity каждому узлу (мутирует дерево) */
function attachPopularity(nodes, countMap) {
  for (const node of nodes) {
    node.popularity = computePopularity(node, countMap)
    if (node.children?.length) {
      attachPopularity(node.children, countMap)
    }
  }
}

/** Собирает все популярности (листья и родители) для порога ТОП-20% */
function allPopularities(nodes) {
  const list = []
  function walk(ns) {
    for (const n of ns) {
      list.push(n.popularity)
      if (n.children?.length) walk(n.children)
    }
  }
  walk(nodes)
  return list
}

function Row({ node, depth, isOpen, onToggle, countMap, top20Threshold, openIds }) {
  const hasChildren = node.children && node.children.length > 0
  const segmentInfo = SEGMENTS[node.segment] || SEGMENTS.common
  const isTop20 = top20Threshold !== null && node.popularity >= top20Threshold && node.popularity > 0

  return (
    <div className="flex flex-col">
      <div
        role="button"
        tabIndex={0}
        onClick={() => hasChildren && onToggle(node.id)}
        onKeyDown={(e) => hasChildren && (e.key === 'Enter' || e.key === ' ') && onToggle(node.id)}
        className={`
          grid grid-cols-[auto_1fr_auto_5rem] md:grid-cols-[auto_1fr_auto_5rem] gap-2 items-center py-2.5 px-3 rounded-xl transition-colors cursor-pointer
          hover:bg-white/10 dark:bg-zinc-900/50 dark:hover:bg-zinc-800/80
          border border-transparent hover:border-white/10
        `}
        style={{ paddingLeft: `${12 + depth * 20}px` }}
      >
        <span className="flex items-center justify-center w-6 shrink-0 col-span-1">
          {hasChildren ? (
            isOpen ? (
              <ChevronDown className="w-5 h-5 text-zinc-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-zinc-400" />
            )
          ) : <span className="w-6" />}
        </span>
        <span className="flex items-center gap-2 min-w-0 col-span-1">
          {hasChildren ? (
            <Folder className="w-5 h-5 text-amber-500/90 shrink-0" />
          ) : (
            <FileText className="w-5 h-5 text-zinc-500 shrink-0" />
          )}
          {node.path ? (
            <Link
              to={node.path}
              onClick={(e) => e.stopPropagation()}
              className="truncate text-zinc-100 hover:text-amber-400 hover:underline focus:outline-none focus:ring-2 focus:ring-amber-500/50 rounded"
            >
              {node.label}
            </Link>
          ) : (
            <span className="truncate text-zinc-100">{node.label}</span>
          )}
        </span>
        <span
          className="shrink-0 text-lg text-center"
          title={segmentInfo.label}
        >
          {segmentInfo.emoji}
        </span>
        <span className="shrink-0 text-right flex items-center justify-end gap-1">
          {node.popularity != null && <span className="text-zinc-300 tabular-nums">{node.popularity}</span>}
          {isTop20 && <span title="ТОП-20% по сайту">🔥</span>}
        </span>
      </div>
      <AnimatePresence initial={false}>
        {hasChildren && isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            {node.children.map((child) => (
              <Row
                key={child.id}
                node={child}
                depth={depth + 1}
                isOpen={openIds.has(child.id)}
                onToggle={onToggle}
                countMap={countMap}
                top20Threshold={top20Threshold}
                openIds={openIds}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Sitemap() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [openIds, setOpenIds] = useState(new Set())

  useEffect(() => {
    let cancelled = false
    async function fetchEvents() {
      const supabase = await getSupabase()
      if (!supabase) {
        setLoading(false)
        return
      }
      try {
        const { data, error } = await supabase
          .from('site_events')
          .select('id, custom_data, page')
        if (cancelled) return
        if (error) {
          console.warn('[Sitemap] site_events error:', error.message)
          setEvents([])
        } else {
          setEvents(data || [])
        }
      } catch (e) {
        if (!cancelled) setEvents([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchEvents()
    return () => { cancelled = true }
  }, [])

  const pathToIdMap = useMemo(() => buildPathToIdMap(sitemapTree), [])
  const countMap = useMemo(() => buildCountMap(events, pathToIdMap), [events, pathToIdMap])

  // Временный лог для отладки: какие section_id приходят из БД
  useEffect(() => {
    if (events.length) {
      const ids = events.map((e) => {
        try {
          const d = typeof e.custom_data === 'string' ? JSON.parse(e.custom_data) : e.custom_data
          return d?.section_id != null ? String(d.section_id) : undefined
        } catch (_) {
          return undefined
        }
      })
      console.log('IDs from DB:', ids)
    }
  }, [events])

  const treeWithPopularity = useMemo(() => {
    const tree = JSON.parse(JSON.stringify(sitemapTree))
    attachPopularity(tree, countMap)
    return tree
  }, [countMap])

  const top20Threshold = useMemo(() => {
    const all = allPopularities(treeWithPopularity).filter((n) => n > 0)
    if (all.length === 0) return null
    const sorted = [...all].sort((a, b) => b - a)
    const idx = Math.max(0, Math.ceil(sorted.length * 0.2) - 1)
    return sorted[idx]
  }, [treeWithPopularity])

  const toggle = (id) => {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-semibold text-zinc-100 mb-2">Карта сайта</h1>
        <p className="text-zinc-400 text-sm mb-6">Древовидная структура и живая аналитика из БД (клики по разделам).</p>

        {loading ? (
          <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-8 text-center text-zinc-400">
            Загрузка аналитики…
          </div>
        ) : (
          <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 overflow-hidden">
            <div className="grid grid-cols-[auto_1fr_auto_5rem] md:grid-cols-[auto_1fr_auto_5rem] gap-2 px-3 py-2 border-b border-zinc-800 text-zinc-400 text-sm items-center">
              <div className="w-6" />
              <div className="font-medium">Раздел</div>
              <div className="text-center" title="Сегмент">Сегмент</div>
              <div className="text-right">Популярность</div>
            </div>
            <div className="divide-y divide-zinc-800/80">
              {treeWithPopularity.map((node) => (
                <Row
                  key={node.id}
                  node={node}
                  depth={0}
                  isOpen={openIds.has(node.id)}
                  onToggle={toggle}
                  countMap={countMap}
                  top20Threshold={top20Threshold}
                  openIds={openIds}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Sitemap
