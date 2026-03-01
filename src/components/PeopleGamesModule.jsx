import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLogEvent } from '../hooks/useLogEvent'
import { getSupabase } from '../utils/supabaseClient'
import { userUtils } from '../utils/logging'

function PeopleGamesModule() {
  const navigate = useNavigate()
  const { logEvent, ensureSession, getSessionInfo } = useLogEvent()
  const completedRef = useRef(false)
  const courseUserNameRef = useRef('')
  const resultRef = useRef(null)
  const pointsRef = useRef(null)
  const [displayName, setDisplayName] = useState('')
  const loggedOnUnmount = useRef(false)

  const loggedResultRef = useRef(false)
  const logSiteEvent = async (status, explicitPayload = null) => {
    // explicitPayload: { result, points, userName } — при EXIT передаём данные из сообщения
    // При EXIT с result всегда пишем (даже если уже писали по RESULT), чтобы результат гарантированно попал в БД
    const forceWrite = !!(explicitPayload && explicitPayload.result != null)
    if (loggedResultRef.current && !forceWrite) return
    if (!forceWrite) loggedResultRef.current = true
    const name = (explicitPayload?.userName != null && explicitPayload.userName !== '')
      ? explicitPayload.userName
      : (courseUserNameRef.current || displayName)
    const date = new Date().toISOString()
    const result = explicitPayload?.result ?? resultRef.current
    const points = explicitPayload?.points ?? pointsRef.current
    const metadata = { name, date, status, result, points }
    const page = '/people-games-module'

    let res = await logEvent('training', 'peoplegames_result', { page, metadata })
    if (!res?.ok) {
      loggedResultRef.current = false
      // Запасной вариант: прямая вставка в site_events, если обычный трекинг не сработал (нет сессии и т.п.)
      try {
        const sessionId = await ensureSession()
        const supabase = await getSupabase()
        const info = getSessionInfo()
        const tgUserId = info.tgUserId != null && info.tgUserId !== '' ? Number(info.tgUserId) : null
        if (sessionId && supabase) {
          const { error } = await supabase.from('site_events').insert({
            session_id: Number(sessionId) || 0,
            tg_user_id: tgUserId,
            event_type: 'training',
            event_name: 'peoplegames_result',
            page,
            metadata
          })
          if (!error) {
            res = { ok: true }
            loggedResultRef.current = true
          }
        }
      } catch (e) {
        console.warn('[PeopleGames] fallback insert failed:', e)
      }
    } else if (forceWrite) {
      loggedResultRef.current = true
    }
  }

  useEffect(() => {
    if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
      const u = window.Telegram.WebApp.initDataUnsafe.user
      setDisplayName(u.first_name || u.username || 'Гость')
    } else {
      setDisplayName('Гость')
    }
  }, [])

  useEffect(() => {
    const handler = async (event) => {
      // Фиксация успеха — при появлении страницы с объявлением (повышение/премия/итог), а не при нажатии «Выйти»
      if (event?.data?.type === 'PEOPLE_GAMES_RESULT') {
        if (event.data.result != null) resultRef.current = event.data.result
        if (typeof event.data.points === 'number') pointsRef.current = event.data.points
        if (event.data.userName) courseUserNameRef.current = event.data.userName
        if (event.data.result != null) {
          await logSiteEvent('прошел', {
            result: event.data.result,
            points: typeof event.data.points === 'number' ? event.data.points : null,
            userName: event.data.userName || ''
          })
        }
      }
      if (event?.data?.type === 'PEOPLE_GAMES_COURSE_COMPLETED') {
        completedRef.current = true
        if (event.data.userName) courseUserNameRef.current = event.data.userName
        if (event.data.result != null) resultRef.current = event.data.result
        if (typeof event.data.points === 'number') pointsRef.current = event.data.points
        // Уже записано на RESULT; повторно не пишем (loggedResultRef)
        await logSiteEvent('прошел')
      }
      if (event?.data?.type === 'PEOPLE_GAMES_EXIT') {
        if (loggedOnUnmount.current) return
        loggedOnUnmount.current = true
        if (event.data.result != null) resultRef.current = event.data.result
        if (typeof event.data.points === 'number') pointsRef.current = event.data.points
        if (event.data.userName) courseUserNameRef.current = event.data.userName
        const payload = {
          result: event.data.result ?? null,
          points: typeof event.data.points === 'number' ? event.data.points : null,
          userName: event.data.userName || ''
        }
        const passed = event.data.result != null
        // Всегда пишем при выходе с результатом (forceWrite), чтобы запись гарантированно попала в site_events; иначе пишем только «не до конца»
        if (passed) await logSiteEvent('прошел', payload)
        else if (!loggedResultRef.current) await logSiteEvent('не до конца', payload)
        navigate('/cabinet', { replace: true })
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [navigate, logEvent])

  useEffect(() => {
    return () => {
      if (loggedOnUnmount.current) return
      loggedOnUnmount.current = true
      const passed = completedRef.current || resultRef.current != null
      logSiteEvent(passed ? 'прошел' : 'не до конца').catch((e) => console.warn('[PeopleGames] logSiteEvent on unmount:', e))
    }
  }, [displayName, logEvent])

  return (
    <div className="h-screen max-h-[100dvh] bg-[#020617] text-slate-100 flex flex-col p-3 md:p-6 overflow-hidden">
      <div className="max-w-6xl mx-auto w-full flex flex-col flex-1 min-h-0 overflow-hidden">
        <header className="flex-shrink-0 py-1 md:py-0 md:mb-2">
          <h1 className="text-[10px] font-light text-white/40 font-sans tracking-wide">
            <span className="hidden md:inline">SPACEGROWTH</span>
            <span className="md:hidden">SG</span>
            <span className="mx-1.5 text-white/30" aria-hidden="true">•</span>
            METAMIND
          </h1>
        </header>
        <div className="relative w-full flex-1 min-h-0 rounded-xl md:rounded-2xl overflow-hidden shadow-2xl ring-1 ring-slate-600/50 bg-slate-900/50">
          <iframe
            src="/Courses/PeopleGames/index.html"
            title="Курс: Корпоративные игры — Люди, которые играют в игры"
            className="absolute inset-0 w-full h-full border-0"
            allow="fullscreen"
          />
        </div>
      </div>
    </div>
  )
}

export default PeopleGamesModule
