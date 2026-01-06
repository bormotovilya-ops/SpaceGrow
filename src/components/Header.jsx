import React from 'react'
import './Header.css'

function Header({ onAvatarClick, onConsultation, onBack }) {
  return (
    <div className="header-block">
      <div className="header-content">
        <button 
          className={`header-back-btn ${onBack ? 'visible' : 'hidden'}`} 
          onClick={onBack}
        >
          ← Назад
        </button>
        <div className="header-profile-block" onClick={onAvatarClick}>
          <img 
            src="/images/me.jpg" 
            alt="Илья Бормотов" 
            className="header-avatar" 
          />
          <div className="header-name-wrapper">
            <div className="header-name">Бормотов Илья</div>
            <h1 className="header-title">Архитектор АИЦП</h1>
          </div>
        </div>
        <button className="header-consultation-btn" onClick={onConsultation}>
          Диагностика вашей воронки
        </button>
        <div className="header-spacer-right"></div>
      </div>
    </div>
  )
}

export default Header
