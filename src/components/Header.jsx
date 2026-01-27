import React, { useState, useEffect } from 'react'
import './Header.css'

function Header({ onAvatarClick, onConsultation, onBack, onAlchemyClick, onHomeClick, activeMenuId }) {
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
    { id: 'home', icon: '/images/Home.png', label: 'Главная', onClick: onHomeClick },
    { id: 'profile', icon: '/images/Ava.png', label: 'Илья Бормотов', onClick: onAvatarClick, isProfile: true },
    { id: 'diagnostics', icon: '/images/CTA.png', label: 'Диагностика в подарок', onClick: onConsultation, highlight: true },
    { id: 'portal', icon: '/images/AICP.png', label: 'Что под капотом', onClick: onBack },
    { id: 'alchemy', icon: '/images/Portal.png', label: 'Цифровая Алхимия', onClick: onAlchemyClick }
  ]

  return (
    <div className="header-block">
      <div className="header-content">
        <div className="header-menu-grid">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`header-menu-item ${item.highlight ? 'header-menu-item-highlight' : ''} ${item.isProfile ? 'header-menu-item-profile' : ''} ${activeMenuId === item.id ? 'active' : ''}`}
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
