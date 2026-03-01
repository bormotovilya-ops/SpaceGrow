import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLogEvent } from '../hooks/useLogEvent'

function EqModule() {
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
    await logEvent('training', 'eq_result', {
      page: '/eq-module',
      metadata: { name, date, status, result, points }
    })
  }

  // Имя пользователя из Telegram или дефолт
  useEffect(() => {
    if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
      const u = window.Telegram.WebApp.initDataUnsafe.user
      setDisplayName(u.first_name || u.username || 'Гость')
    } else {
      setDisplayName('Гость')
    }
  }, [])

  // Слушаем завершение курса и выход из iframe (кнопка «Выйти» → переход в Кабинет)
  useEffect(() => {
    const handler = async (event) => {
      if (event?.data?.type === 'EQ_RESULT') {
        if (event.data.result != null) resultRef.current = event.data.result
        if (typeof event.data.points === 'number') pointsRef.current = event.data.points
        if (event.data.userName) courseUserNameRef.current = event.data.userName
      }
      if (event?.data?.type === 'EQ_COURSE_COMPLETED') {
        completedRef.current = true
        if (event.data.userName) courseUserNameRef.current = event.data.userName
        if (event.data.result != null) resultRef.current = event.data.result
        if (typeof event.data.points === 'number') pointsRef.current = event.data.points
        await logSiteEvent('прошел')
      }
      if (event?.data?.type === 'EQ_EXIT') {
        if (loggedOnUnmount.current) return
        loggedOnUnmount.current = true
        if (event.data.result != null) resultRef.current = event.data.result
        if (typeof event.data.points === 'number') pointsRef.current = event.data.points
        if (event.data.userName) courseUserNameRef.current = event.data.userName
        // Успех: либо нажали «Сертификат» (COURSE_COMPLETED), либо дошли до финала (есть result от курса)
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
      logSiteEvent(passed ? 'прошел' : 'не до конца').catch((e) => console.warn('[EqModule] logSiteEvent on unmount:', e))
    }
  }, [displayName, logEvent])

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col p-3 md:p-6">
      <div className="max-w-6xl mx-auto w-full flex flex-col flex-1 min-h-0">
        <header className="flex-shrink-0 py-2 md:py-0 md:mb-4 md:mb-6">
          <h1 className="text-base md:text-2xl font-semibold text-white">Эмоциональный интеллект</h1>
          <p className="hidden md:block text-sm text-slate-400 mt-1">Твой супернавык для работы и жизни — интерактивный модуль</p>
        </header>
        <div className="relative w-full flex-1 min-h-0 md:flex-none md:min-h-0 md:aspect-video rounded-xl md:rounded-2xl overflow-hidden shadow-2xl ring-1 ring-slate-600/50 bg-slate-900/50">
          <iframe
            src="/Courses/EQ/index.html"
            title="Курс: Эмоциональный интеллект"
            className="absolute inset-0 w-full h-full border-0"
            allow="fullscreen"
          />
        </div>
      </div>
    </div>
  )
}

export default EqModule
