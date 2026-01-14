import React from 'react'
import Header from './Header'
import './Alchemy.css'

function Alchemy({ onBack, onAvatarClick, onChatClick, onDiagnostics }) {
  const handleHeaderAvatarClick = () => {
    if (onAvatarClick) {
      onAvatarClick()
    } else {
      onBack()
    }
  }

  const handleConsultation = () => {
    // Top CTA in Header must always open Diagnostics.
    if (onDiagnostics) onDiagnostics()
  }

  return (
    <div className="alchemy-container">
      <Header 
        onAvatarClick={handleHeaderAvatarClick}
        onConsultation={handleConsultation}
        onBack={onBack}
        onAlchemyClick={() => {}} // Пустой обработчик, так как мы уже в этом разделе
        onChatClick={onChatClick}
      />
      
      <div className="alchemy-content">
        <div className="alchemy-sections">
          <section className="alchemy-section">
            <h1 className="alchemy-title">Цифровая Алхимия</h1>
            <p className="alchemy-description">
              Описание раздела будет добавлено позже
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

export default Alchemy
