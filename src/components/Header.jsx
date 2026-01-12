import React from 'react'
import './Header.css'

function Header({ onAvatarClick, onConsultation, onBack }) {
  return (
    <div className="header-block">
      <div className="header-content">
        <button 
          className={`header-back-btn ${onBack ? 'visible' : 'hidden'}`} 
          onClick={onBack}
          aria-label="Назад"
        >
          <img src="/images/arrow-back.svg" alt="Назад" className="back-arrow-icon desktop-back-icon" />
          <span className="mobile-back-emoji">←</span>
        </button>
        <div className="header-profile-block" onClick={onAvatarClick}>
          <img 
            src="/images/me.jpg" 
            alt="Илья Бормотов" 
            className="header-avatar" 
          />
        </div>
        <div className="header-consultation-wrapper">
          <button className="header-consultation-btn" onClick={onConsultation}>
            <span className="consultation-btn-text">
              <img src="/images/cursor.svg" alt="курсор" className="cursor-icon" />
              Диагностика вашей воронки
            </span>
          </button>
          <div className="header-name-bottom" onClick={onAvatarClick}>
            <span className="header-name">Бормотов Илья</span>
            <span className="header-separator">·</span>
            <span className="header-title">Интегратор АИЦП</span>
          </div>
        </div>
        <div className="header-spacer-right"></div>
      </div>
    </div>
  )
}

export default Header
