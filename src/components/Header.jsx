import React from 'react'
import './Header.css'

function Header({ onAvatarClick, onConsultation, onBack }) {
  const handlePhoneClick = () => {
    window.location.href = 'tel:+79991237788'
  }

  return (
    <div className="header-block">
      <div className="header-content">
        {onBack && (
          <button className="header-back-btn" onClick={onBack}>
            ← Назад
          </button>
        )}
        <img 
          src="/images/me.jpg" 
          alt="Илья Бормотов" 
          className="header-avatar" 
          onClick={onAvatarClick}
        />
        <div className="header-name-block">
          <div className="header-name" onClick={onAvatarClick}>Бормотов Илья</div>
          <h1 className="header-title">Архитектор АИЦП</h1>
        </div>
        <div className="header-contact-block">
          <a href="tel:+79991237788" className="header-phone" onClick={handlePhoneClick}>
            +7 (999) 123-77-88
          </a>
          <button className="header-consultation-btn" onClick={onConsultation}>
            <svg className="telegram-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.16l-1.87 8.81c-.14.625-.52.78-1.05.485l-2.9-2.14-1.4 1.345c-.13.13-.24.24-.49.24l.21-2.98 5.36-4.84c.23-.21-.05-.33-.36-.12l-6.62 4.17-2.85-.89c-.62-.19-.64-.62.13-.95l11.1-4.28c.51-.19.96.11.79.68z" fill="currentColor"/>
            </svg>
            Бесплатная диагностика
          </button>
        </div>
      </div>
    </div>
  )
}

export default Header

