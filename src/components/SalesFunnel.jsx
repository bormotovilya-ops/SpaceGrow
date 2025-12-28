import React, { useState } from 'react'
import Portfolio from './Portfolio'
import Profile from './Profile'
import './SalesFunnel.css'

const funnelData = [
  {
    id: 'audience',
    name: 'Аудитория',
    image: '/images/1_трафик.png',
    color: '#4a90e2',
    description: 'Ваша целевая аудитория - люди, которые ищут решение своей проблемы',
    tech: [],
    width: 252 // Самый широкий (180 * 1.4)
  },
  {
    id: 'landing',
    name: 'Лендинг',
    image: '/images/2_лендинг.png',
    color: '#5cb85c',
    description: 'Сайт для привлечения трафика и первичного контакта с аудиторией',
    tech: ['Сайт'],
    width: 224 // 160 * 1.4
  },
  {
    id: 'leadmagnet',
    name: 'Лидмагнит',
    image: '/images/3_Лидмагнит.png',
    color: '#f0ad4e',
    description: 'Бесплатное предложение для сбора контактов и начала взаимодействия',
    tech: ['PDF', 'MiniApp', 'Бот', 'Тест', 'Презентация'],
    width: 196 // 140 * 1.4
  },
  {
    id: 'autofunnel',
    name: 'Автоворонки прогрева',
    image: '/images/4_Прогрев.png',
    color: '#d9534f',
    description: 'Автоматизированная система прогрева лидов перед продажей',
    tech: ['Бот', 'Канал'],
    width: 168 // 120 * 1.4
  },
  {
    id: 'product',
    name: 'Продукт',
    image: '/images/5_Курс.png',
    color: '#5bc0de',
    description: 'Основной продукт - обучающий курс или услуга',
    tech: ['Бот', 'MiniApp', 'GetCourse'],
    width: 140 // 100 * 1.4
  },
  {
    id: 'money',
    name: 'Деньги',
    image: '/images/6_оплата.png',
    color: '#9b59b6',
    description: 'Доход, который получает автор продукта',
    tech: [],
    width: 126 // 90 * 1.4
  },
  {
    id: 'value',
    name: 'Ценность',
    image: '/images/7_ценность.png',
    color: '#16a085',
    description: 'Ценность, которую получает клиент от продукта',
    tech: [],
    width: 126 // 90 * 1.4
  }
]

function SalesFunnel() {
  const [selectedBlock, setSelectedBlock] = useState(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [showPortfolio, setShowPortfolio] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  const handleBlockClick = (block) => {
    if (isAnimating) return
    
    setIsAnimating(true)
    setSelectedBlock(block)
    
    setTimeout(() => {
      setIsAnimating(false)
    }, 300)
  }

  const handleCloseTech = () => {
    setIsAnimating(true)
    setTimeout(() => {
      setSelectedBlock(null)
      setIsAnimating(false)
    }, 200)
  }

  const handleAuthorClick = () => {
    setShowPortfolio(true)
  }

  const handleConsultation = () => {
    window.open('https://t.me/ilyaborm', '_blank')
  }

  const handleAvatarClick = () => {
    setShowProfile(true)
  }

  if (showProfile) {
    return <Profile onBack={() => setShowProfile(false)} />
  }

  return (
    <div className="sales-funnel-container">
      {/* Статичный блок вверху */}
      <div className="header-block">
        <div className="header-content">
          <img 
            src="/images/me.jpg" 
            alt="Илья Бормотов" 
            className="header-avatar" 
            onClick={handleAvatarClick}
          />
          <div className="header-text">
            <h1 className="header-title">Архитектор цепочек продаж вашего продукта</h1>
            <button className="header-consultation-btn" onClick={handleConsultation}>
              Получить бесплатную диагностику
            </button>
          </div>
        </div>
      </div>

      <div className="funnel-wrapper">
        <div className="funnel-blocks" id="funnel-blocks">
          {/* Основные блоки до Продукта */}
          {funnelData.slice(0, 5).map((block, index) => (
            <React.Fragment key={block.id}>
              {/* Блок воронки */}
              <div
                className={`funnel-block ${selectedBlock?.id === block.id ? 'selected' : ''} ${isAnimating && selectedBlock?.id === block.id ? 'animating' : ''}`}
                style={{
                  '--block-color': block.color,
                  '--block-width': `${block.width}px`
                }}
                onClick={() => handleBlockClick(block)}
              >
                <img src={block.image} alt={block.name} className="block-image" />
                <span className="block-name">{block.name}</span>
              </div>
              
              {/* Стрелка (вертикальная) */}
              {index < 4 && (
                <div className="funnel-arrow">
                  <svg width="3" height="30" viewBox="0 0 3 30">
                    <line 
                      x1="1.5" 
                      y1="0" 
                      x2="1.5" 
                      y2="30" 
                      stroke="#ffffff" 
                      strokeWidth="3"
                      strokeOpacity="0.8"
                      markerEnd="url(#arrowhead-vertical)"
                    />
                    <defs>
                      <marker 
                        id="arrowhead-vertical" 
                        markerWidth="12" 
                        markerHeight="12" 
                        refX="4" 
                        refY="10" 
                        orient="auto"
                      >
                        <polygon points="0 0, 8 0, 4 12" fill="#ffffff" fillOpacity="0.8" />
                      </marker>
                    </defs>
                  </svg>
                </div>
              )}
            </React.Fragment>
          ))}
          
          {/* Стрелка к результатам */}
          <div className="funnel-arrow">
            <svg width="3" height="30" viewBox="0 0 3 30">
              <line 
                x1="1.5" 
                y1="0" 
                x2="1.5" 
                y2="30" 
                stroke="#ffffff" 
                strokeWidth="3"
                strokeOpacity="0.8"
                markerEnd="url(#arrowhead-result)"
              />
              <defs>
                <marker 
                  id="arrowhead-result" 
                  markerWidth="12" 
                  markerHeight="12" 
                  refX="4" 
                  refY="10" 
                  orient="auto"
                >
                  <polygon points="0 0, 8 0, 4 12" fill="#ffffff" fillOpacity="0.8" />
                </marker>
              </defs>
            </svg>
          </div>
          
          {/* Блоки результата (Деньги и Ценность рядом) */}
          <div className="result-blocks-container">
            {funnelData.slice(5).map((block) => (
              <div
                key={block.id}
                className={`funnel-block result-block ${selectedBlock?.id === block.id ? 'selected' : ''} ${isAnimating && selectedBlock?.id === block.id ? 'animating' : ''}`}
                style={{
                  '--block-color': block.color,
                  '--block-width': `${block.width}px`
                }}
                onClick={() => handleBlockClick(block)}
              >
                <img src={block.image} alt={block.name} className="block-image" />
                <span className="block-name">{block.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Технический блок справа */}
      {selectedBlock && (
        <div className={`tech-block ${isAnimating ? 'animating' : 'visible'}`}>
          <div className="tech-block-header">
            <h3>{selectedBlock.name}</h3>
            <button className="close-btn" onClick={handleCloseTech}>×</button>
          </div>
          <div className="tech-block-content">
            {/* Автор с фото в формате чата */}
            <div className="chat-message">
              <img 
                src="/images/me.jpg" 
                alt="Илья Бормотов" 
                className="chat-avatar" 
                onClick={handleAvatarClick}
              />
              <div className="chat-bubble">
                <div className="chat-author">Илья Бормотов</div>
                <p className="chat-text">{selectedBlock.description}</p>
              </div>
            </div>
            
            {selectedBlock.tech && selectedBlock.tech.length > 0 && (
              <div className="tech-tools">
                <h4>Технические решения:</h4>
                <div className="tech-tools-list">
                  {selectedBlock.tech.map((tool, idx) => (
                    <span key={idx} className="tech-tool-badge">{tool}</span>
                  ))}
                </div>
              </div>
            )}
            
            <button className="consultation-btn" onClick={handleConsultation}>
              Получить бесплатную консультацию
            </button>
          </div>
        </div>
      )}

      {/* Портфолио модальное окно */}
      {showPortfolio && (
        <Portfolio 
          onClose={() => setShowPortfolio(false)}
          onConsultation={handleConsultation}
        />
      )}
    </div>
  )
}

export default SalesFunnel

