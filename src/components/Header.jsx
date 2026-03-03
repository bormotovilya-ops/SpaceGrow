import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import './Header.css'
import kabinetIcon from '../../DOP/Картинки/меню/kabinet.png'

function Header({ onAvatarClick, onConsultation, onBack, onAlchemyClick, onHomeClick, activeMenuId }) {
  const location = useLocation()
  const navigate = useNavigate()
  const pathname = location?.pathname ?? ''

  // Подсветка по пути, если activeMenuId не передан
  const derivedActiveId = pathname.startsWith('/alchemy') ? 'alchemy'
    : pathname.startsWith('/diagnostics') ? 'diagnostics'
    : pathname === '/home' ? 'home'
    : pathname.startsWith('/profile') ? 'profile'
    : pathname.startsWith('/funnel') || pathname.startsWith('/block') ? 'portal'
    : pathname.startsWith('/cabinet') ? 'cabinet'
    : null
  const resolvedActiveId = activeMenuId ?? derivedActiveId

  const greetingMessages = [
    'Добрый день, я Илья!',
    'Улучшаю онлайн-обучение',
    'Превращаю хаос в систему.',
    'Умножаю вашу прибыль.',
    'Давайте добавим магии!'
  ]

  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)

  useEffect(() => {
    if (currentMessageIndex < greetingMessages.length - 1) {
      const timeout = setTimeout(() => {
        setCurrentMessageIndex((prevIndex) => prevIndex + 1)
      }, 3000)

      return () => clearTimeout(timeout)
    }
  }, [currentMessageIndex, greetingMessages.length])

  const menuItems = [
    { id: 'home', icon: '/images/ПР.png', label: 'Главная', onClick: onHomeClick },
    { id: 'profile', icon: '/images/Ava.png', label: 'Илья Бормотов', onClick: onAvatarClick, isProfile: true },
    { id: 'diagnostics', icon: '/images/CTA.png', label: 'Диагностика в подарок', onClick: onConsultation, highlight: true },
    { id: 'portal', icon: '/images/AICP.png', label: 'Что под капотом', onClick: onBack },
    // Новый пункт меню «Кабинет» с переходом на /cabinet
    { id: 'cabinet', icon: kabinetIcon, label: 'Кабинет', onClick: () => navigate('/cabinet') }
  ]

  return (
    <div className="header-block">
      <div className="header-content">
        <div className="header-menu-grid">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`header-menu-item ${item.highlight ? 'header-menu-item-highlight' : ''} ${item.isProfile ? 'header-menu-item-profile' : ''} ${resolvedActiveId === item.id ? 'active' : ''}`}
              onClick={(e) => {
                // Provide a safe fallback so menu items remain interactive even if
                // a specific handler wasn't passed from the parent component.
                // Preference order: item.onClick -> onHomeClick -> noop
                const handler = item.onClick || onHomeClick || (() => {})
                try { handler(e) } catch (err) { console.warn('Header menu handler error', err) }
              }}
              aria-label={item.label}
            >
              <div className="header-menu-icon-wrapper">
                <img 
                  src={item.icon} 
                  alt={item.label} 
                  className="header-menu-icon" 
                />
              </div>
              {item.isProfile ? (
                <div className="speech-bubble">
                  <div className="speech-bubble-text" key={currentMessageIndex}>
                    {greetingMessages[currentMessageIndex]}
                  </div>
                </div>
              ) : (
                <span className="header-menu-label">{item.label}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Header
