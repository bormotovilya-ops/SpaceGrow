import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLogEvent } from '../hooks/useLogEvent'

function PeopleGamesModule() {
  const navigate = useNavigate()
  const { logEvent } = useLogEvent()
  const completedRef = useRef(false)
  const courseUserNameRef = useRef('')
  const resultRef = useRef(null)
  const pointsRef = useRef(null)
  const [displayName, setDisplayName] = useState('')
  const loggedOnUnmount = useRef(false)

  const loggedResultRef = useRef(false)
  const logSiteEvent = async (status) => {
    if (loggedResultRef.current) return
    loggedResultRef.current = true
    const name = courseUserNameRef.current || displayName
    const date = new Date().toISOString()
    const result = resultRef.current
    const points = pointsRef.current
    await logEvent('training', 'peoplegames_result', {
      page: '/people-games-module',
      metadata: { name, date, status, result, points }
    })
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
      if (event?.data?.type === 'PEOPLE_GAMES_RESULT') {
        if (event.data.result != null) resultRef.current = event.data.result
        if (typeof event.data.points === 'number') pointsRef.current = event.data.points
        if (event.data.userName) courseUserNameRef.current = event.data.userName
      }
      if (event?.data?.type === 'PEOPLE_GAMES_COURSE_COMPLETED') {
        completedRef.current = true
        if (event.data.userName) courseUserNameRef.current = event.data.userName
        if (event.data.result != null) resultRef.current = event.data.result
        if (typeof event.data.points === 'number') pointsRef.current = event.data.points
        await logSiteEvent('прошел')
      }
      if (event?.data?.type === 'PEOPLE_GAMES_EXIT') {
        if (loggedOnUnmount.current) return
        loggedOnUnmount.current = true
        if (event.data.result != null) resultRef.current = event.data.result
        if (typeof event.data.points === 'number') pointsRef.current = event.data.points
        if (event.data.userName) courseUserNameRef.current = event.data.userName
        // Успех: либо нажали «Сертификат» (COURSE_COMPLETED), либо дошли до финала (есть result: promoted/rewarded/fired)
        const passed = completedRef.current || resultRef.current != null
        await logSiteEvent(passed ? 'прошел' : 'не до конца')
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
