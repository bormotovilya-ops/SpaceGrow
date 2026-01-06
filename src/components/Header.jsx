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
          ←
        </button>
        <div className="header-profile-block" onClick={onAvatarClick}>
          <img 
            src="/images/me.jpg" 
            alt="Илья Бормотов" 
            className="header-avatar" 
          />
        </div>
        <button className="header-consultation-btn" onClick={onConsultation}>
          <span className="consultation-btn-text">
            <span className="consultation-btn-line">✨ Диагностика</span>
            <span className="consultation-btn-line">вашей воронки</span>
          </span>
        </button>
        <div className="header-spacer-right"></div>
      </div>
      <div className="header-name-bottom">
        <span className="header-name">Бормотов Илья</span>
        <span className="header-separator">·</span>
        <span className="header-title">Архитектор АИЦП</span>
      </div>
    </div>
  )
}

export default Header
