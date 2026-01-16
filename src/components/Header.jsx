import React, { useState, useEffect } from 'react'
import './Header.css'

function Header({ onAvatarClick, onConsultation, onBack, onAlchemyClick, onHomeClick }) {
  const greetingMessages = [
    'Добрый день, я Илья!',
    'Автоматизирую онлайн-обучение',
    'Превращаю хаос в систему.',
    'Увеличиваю вашу прибыль.',
    'Давайте добавим магии?'
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
              className={`header-menu-item ${item.highlight ? 'header-menu-item-highlight' : ''} ${item.isProfile ? 'header-menu-item-profile' : ''}`}
              onClick={item.onClick}
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
