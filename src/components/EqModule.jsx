import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLogEvent } from '../hooks/useLogEvent'

function EqModule() {
  const { logEvent } = useLogEvent()
  const completedRef = useRef(false)
  const courseUserNameRef = useRef('')
  const [displayName, setDisplayName] = useState('')

  // Имя пользователя из Telegram или дефолт
  useEffect(() => {
    if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
      const u = window.Telegram.WebApp.initDataUnsafe.user
      setDisplayName(u.first_name || u.username || 'Гость')
    } else {
      setDisplayName('Гость')
    }
  }, [])

  // Слушаем завершение курса из iframe
  useEffect(() => {
    const handler = (event) => {
      if (event?.data?.type === 'EQ_COURSE_COMPLETED') {
        completedRef.current = true
        if (event.data.userName) courseUserNameRef.current = event.data.userName
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  // При уходе со страницы логируем в Site_events: имя, дату, статус
  const logSiteEvent = (status) => {
    const name = courseUserNameRef.current || displayName
    const date = new Date().toISOString()
    logEvent('Site_events', 'eq_course_result', {
      page: '/eq-module',
      metadata: { name, date, status }
    })
  }

  const loggedOnUnmount = useRef(false)

  const handleBack = () => {
    if (loggedOnUnmount.current) return
    loggedOnUnmount.current = true
    logSiteEvent(completedRef.current ? 'прошел' : 'не до конца')
    // Навигация к Алхимии выполняется через <Link to="/alchemy">
  }

  // При размонтировании без нажатия "Назад" (закрытие/другая навигация) логируем один раз
  useEffect(() => {
    return () => {
      if (loggedOnUnmount.current) return
      loggedOnUnmount.current = true
      const name = courseUserNameRef.current || displayName
      const date = new Date().toISOString()
      const status = completedRef.current ? 'прошел' : 'не до конца'
      logEvent('Site_events', 'eq_course_result', {
        page: '/eq-module',
        metadata: { name, date, status }
      })
    }
  }, [displayName, logEvent])

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-4 md:mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-white">Эмоциональный интеллект</h1>
            <p className="text-sm text-slate-400 mt-1">Твой супернавык для работы и жизни — интерактивный модуль</p>
          </div>
          <Link
            to="/alchemy"
            onClick={handleBack}
            className="px-4 py-2 rounded-xl bg-slate-700/80 hover:bg-slate-600 text-slate-200 text-sm font-medium transition-colors inline-block"
          >
            Назад к столу
          </Link>
        </header>
        <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl ring-1 ring-slate-600/50 bg-slate-900/50" style={{ paddingTop: '56.25%' }}>
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
