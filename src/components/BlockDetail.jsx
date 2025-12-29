import React from 'react'
import Header from './Header'
import './BlockDetail.css'

function BlockDetail({ block, onBack, onConsultation, onAvatarClick }) {
  return (
    <div className="block-detail-container">
      <Header 
        onAvatarClick={onAvatarClick}
        onConsultation={onConsultation}
        onBack={onBack}
      />
      
      <div className="block-detail-content">
        <div className="block-detail-header">
          <img src={block.image} alt={block.name} className="block-detail-image" />
          <h1 className="block-detail-title">{block.name}</h1>
        </div>

        <div className="block-detail-body">
          {/* Автор с фото в формате чата */}
          <div className="chat-message">
            <img 
              src="/images/me.jpg" 
              alt="Илья Бормотов" 
              className="chat-avatar" 
              onClick={onAvatarClick}
            />
            <div className="chat-bubble">
              <div className="chat-author">Илья Бормотов</div>
              <p className="chat-text">{block.description}</p>
            </div>
          </div>
          
          {block.tech && block.tech.length > 0 && (
            <div className="tech-tools">
              <h4>Технические решения:</h4>
              <div className="tech-tools-list">
                {block.tech.map((tool, idx) => (
                  <span key={idx} className="tech-tool-badge">{tool}</span>
                ))}
              </div>
            </div>
          )}
          
          <button className="consultation-btn" onClick={onConsultation}>
            Получить бесплатную консультацию
          </button>
        </div>
      </div>
    </div>
  )
}

export default BlockDetail

