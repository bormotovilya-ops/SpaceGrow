import React, { useState, useEffect } from 'react'
import Portfolio from './Portfolio'
import Profile from './Profile'
import BlockDetail from './BlockDetail'
import Header from './Header'
import Diagnostics from './Diagnostics'
import './SalesFunnel.css'

const funnelData = [
  {
    id: 'audience',
    name: 'Аудитория',
    image: '/images/1_трафик.png',
    color: '#4a90e2',
    description: 'Ваша целевая аудитория - люди, которые ищут решение своей проблемы',
    tech: [],
    width: 302 // 252 * 1.2
  },
  {
    id: 'landing',
    name: 'Лендинг',
    image: '/images/2_лендинг.png',
    color: '#5cb85c',
    description: 'Сайт для привлечения трафика и первичного контакта с аудиторией',
    tech: ['Сайт'],
    width: 269 // 224 * 1.2
  },
  {
    id: 'leadmagnet',
    name: 'Лидмагнит',
    image: '/images/3_Лидмагнит.png',
    color: '#f0ad4e',
    description: 'Бесплатное предложение для сбора контактов и начала взаимодействия',
    tech: ['PDF', 'MiniApp', 'Бот', 'Тест', 'Презентация'],
    width: 235 // 196 * 1.2
  },
  {
    id: 'tripwire',
    name: 'Трипвайер',
    image: '/images/3-5.png',
    color: '#ffd700',
    description: 'Первая денежная транзакция. Автоматизация импульсивных покупок',
    tech: ['Эквайринг', 'Фискализация', 'Webhooks'],
    width: 185 // ~154 * 1.2
  },
  {
    id: 'autofunnel',
    name: 'Автоворонки прогрева',
    image: '/images/4_Прогрев.png',
    color: '#d9534f',
    description: 'Автоматизированная система прогрева лидов перед продажей',
    tech: ['Бот', 'Канал'],
    width: 202 // 168 * 1.2
  },
  {
    id: 'product',
    name: 'Продукт',
    image: '/images/5_Курс.png',
    color: '#5bc0de',
    description: 'Основной продукт - обучающий курс или услуга',
    tech: ['Бот', 'MiniApp', 'GetCourse'],
    width: 168 // 140 * 1.2
  },
  {
    id: 'money',
    name: 'Деньги',
    image: '/images/6_оплата.png',
    color: '#9b59b6',
    description: 'Доход, который получает автор продукта',
    tech: [],
    width: 151 // 126 * 1.2
  }
]

function SalesFunnel() {
  const [selectedBlock, setSelectedBlock] = useState(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [showPortfolio, setShowPortfolio] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showDiagnostics, setShowDiagnostics] = useState(false)

  // Обработка hash в URL для прямой ссылки на профиль
  useEffect(() => {
    const hash = window.location.hash
    if (hash === '#profile') {
      setShowProfile(true)
    } else if (hash === '#diagnostics') {
      setShowDiagnostics(true)
    }
  }, [])

  // Обновление hash при изменении состояния
  useEffect(() => {
    if (showProfile) {
      window.location.hash = 'profile'
    } else if (showDiagnostics) {
      window.location.hash = 'diagnostics'
    } else if (!selectedBlock) {
      window.location.hash = ''
    }
  }, [showProfile, showDiagnostics, selectedBlock])


  const handleBlockClick = (block) => {
    if (isAnimating) return
    
    setIsAnimating(true)
    setSelectedBlock(block)
    
    setTimeout(() => {
      setIsAnimating(false)
    }, 300)
  }

  const handleCloseBlockDetail = () => {
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
    setShowDiagnostics(true)
  }

  const handleAvatarClick = () => {
    // Закрываем Diagnostics если открыт, открываем Profile
    if (showDiagnostics) {
      setShowDiagnostics(false)
    }
    setShowProfile(true)
  }

  const handleNextBlock = (blockId) => {
    const nextBlock = funnelData.find(b => b.id === blockId)
    if (nextBlock) {
      setIsAnimating(true)
      setSelectedBlock(nextBlock)
      setTimeout(() => {
        setIsAnimating(false)
      }, 300)
    }
  }

  if (showDiagnostics) {
    return (
      <Diagnostics 
        onBack={() => {
          setShowDiagnostics(false)
          window.location.hash = ''
        }} 
        onAvatarClick={handleAvatarClick}
      />
    )
  }

  if (showProfile) {
    return (
      <Profile 
        onBack={() => {
          setShowProfile(false)
          window.location.hash = ''
        }} 
        onAvatarClick={() => {
          setShowProfile(false)
          window.location.hash = ''
        }}
        onDiagnostics={() => {
          setShowProfile(false)
          setShowDiagnostics(true)
        }}
      />
    )
  }

  if (selectedBlock) {
    return (
      <BlockDetail 
        block={selectedBlock}
        onBack={handleCloseBlockDetail}
        onConsultation={handleConsultation}
        onAvatarClick={handleAvatarClick}
        onNextBlock={
          selectedBlock.id === 'audience' 
            ? () => handleNextBlock('landing') 
            : selectedBlock.id === 'landing'
            ? () => handleNextBlock('leadmagnet')
            : selectedBlock.id === 'leadmagnet'
            ? () => handleNextBlock('tripwire')
            : selectedBlock.id === 'tripwire'
            ? () => handleNextBlock('autofunnel')
            : selectedBlock.id === 'autofunnel'
            ? () => handleNextBlock('product')
            : selectedBlock.id === 'product'
            ? () => handleNextBlock('money')
            : undefined
        }
      />
    )
  }

  return (
    <div className="sales-funnel-container">
      <Header 
        onAvatarClick={handleAvatarClick}
        onConsultation={handleConsultation}
      />

      <div className="funnel-wrapper">
        <div className="funnel-blocks" id="funnel-blocks">
          {/* Основные блоки до Продукта */}
          {funnelData.slice(0, 6).map((block, index) => (
            <React.Fragment key={block.id}>
              {/* Блок воронки */}
              <div
                className={`funnel-block ${block.id === 'product' ? 'product-block' : ''} ${selectedBlock?.id === block.id ? 'selected' : ''} ${isAnimating && selectedBlock?.id === block.id ? 'animating' : ''}`}
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
              {index < 5 && (
                <div className={`funnel-arrow ${block.id === 'autofunnel' ? 'product-arrow' : ''}`}>
                  <svg width="20" height="20" viewBox="0 0 20 20" className="arrow-svg">
                    <line 
                      x1="10" 
                      y1="0" 
                      x2="10" 
                      y2="15" 
                      stroke="#ffffff" 
                      strokeWidth="2"
                      strokeOpacity="0.8"
                      markerEnd={`url(#arrowhead-vertical-${index})`}
                    />
                    <defs>
                      <marker 
                        id={`arrowhead-vertical-${index}`}
                        markerWidth="10" 
                        markerHeight="10" 
                        refX="10" 
                        refY="5" 
                        orient="auto"
                      >
                        <polygon points="0 0, 10 5, 0 10" fill="#ffffff" fillOpacity="0.8" />
                      </marker>
                    </defs>
                  </svg>
                </div>
              )}
            </React.Fragment>
          ))}
          
          {/* Стрелка перед блоком "Деньги" */}
          <div className="funnel-arrow money-arrow">
            <svg width="20" height="20" viewBox="0 0 20 20" className="arrow-svg">
              <line 
                x1="10" 
                y1="0" 
                x2="10" 
                y2="15" 
                stroke="#ffffff" 
                strokeWidth="2"
                strokeOpacity="0.8"
                markerEnd="url(#arrowhead-vertical-money)"
              />
              <defs>
                <marker 
                  id="arrowhead-vertical-money"
                  markerWidth="10" 
                  markerHeight="10" 
                  refX="10" 
                  refY="5" 
                  orient="auto"
                >
                  <polygon points="0 0, 10 5, 0 10" fill="#ffffff" fillOpacity="0.8" />
                </marker>
              </defs>
            </svg>
          </div>
          
          {/* Блок результата (Деньги) - под продуктом */}
          <div className="result-blocks-container">
            {funnelData.slice(6).map((block) => (
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

