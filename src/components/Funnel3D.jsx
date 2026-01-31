import React, { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useLogEvent } from '../hooks/useLogEvent'
import './Funnel3D.css'

const Funnel3D = ({ results }) => {
  const { trackSectionView } = useLogEvent()

  useEffect(() => {
    trackSectionView('funnel')
  }, [trackSectionView])

  // Состояние для отслеживания ошибок загрузки изображений
  const [imageErrors, setImageErrors] = useState({})

  // Обработчик ошибок загрузки изображений
  const handleImageError = (segmentId) => {
    setImageErrors(prev => ({ ...prev, [segmentId]: true }))
  }

  // Все 7 сегментов воронки
  const segments = useMemo(() => {
    const segmentMap = {
      'audience': { name: 'Аудитория', image: '/images/1_трафик.png' },
      'landing': { name: 'Лендинг', image: '/images/2_лендинг.png' },
      'leadmagnet': { name: 'Лидмагнит', image: '/images/3_Лидмагнит.png' },
      'tripwire': { name: 'Трипваер', image: '/images/3-5.png' },
      'autofunnel': { name: 'Автоворонка', image: '/images/4_Прогрев.png' },
      'product': { name: 'Продукт', image: '/images/5_Курс.png' },
      'money': { name: 'Деньги', image: '/images/6_оплата.png' }
    }
    const segmentIds = ['audience', 'landing', 'leadmagnet', 'tripwire', 'autofunnel', 'product', 'money']
    return segmentIds.map(id => {
      const result = results.find(r => r.id === id)
      const segmentInfo = segmentMap[id] || { name: '', image: '' }
      return result 
        ? { ...result, name: result.name || segmentInfo.name, image: result.image || segmentInfo.image }
        : { id, name: segmentInfo.name, score: 0, image: segmentInfo.image }
    })
  }, [results])

  // Вычисляем ширины сегментов с учетом логики сужения
  const segmentWidths = useMemo(() => {
    const svgWidth = 1000 // Ширина SVG
    const padding = 10 // Минимальные отступы слева и справа
    const maxWidth = svgWidth - (padding * 2) // Ширина верхнего сегмента на весь экран с минимальными отступами
    const segmentHeight = 180 // Высота каждого сегмента (увеличена в 2 раза)
    const standardNarrowing = 0.95 // Стандартное сужение при 100% (5% на этап)
    const widths = []
    let currentTopWidth = maxWidth

    segments.forEach((segment, index) => {
      const percentage = segment.score / 100
      const topWidth = currentTopWidth
      
      // Если этап на 100%, применяем стандартное сужение
      // Если меньше 100%, сужение пропорционально проценту
      let bottomWidth
      if (percentage >= 1) {
        bottomWidth = topWidth * standardNarrowing
      } else {
        // При низком проценте сужение более резкое
        bottomWidth = topWidth * percentage
      }
      
      widths.push({
        topWidth,
        bottomWidth,
        height: segmentHeight,
        percentage,
        score: segment.score,
        // Критическое сужение: если bottomWidth меньше 30% от topWidth
        isCritical: bottomWidth < topWidth * 0.3
      })
      
      // Следующий сегмент начинается с ширины нижнего основания текущего
      currentTopWidth = bottomWidth
    })

    return widths
  }, [segments])

  // Вычисляем площадь трапеции
  const calculateTrapezoidArea = (topWidth, bottomWidth, height) => {
    return ((topWidth + bottomWidth) / 2) * height
  }

  // Вычисляем упущенную прибыль: во сколько раз больше могли бы заработать
  const lostProfitMultiplier = useMemo(() => {
    const svgWidth = 1000 // Ширина SVG
    const padding = 10 // Минимальные отступы слева и справа
    const maxWidth = svgWidth - (padding * 2) // Ширина верхнего сегмента на весь экран с минимальными отступами
    const standardNarrowing = 0.95 // Стандартное сужение при 100% (5% на этап)
    
    // Ширина нижнего края блока "Деньги" в реальной воронке
    const actualBottomWidth = segmentWidths.length > 0 
      ? segmentWidths[segmentWidths.length - 1].bottomWidth 
      : 0
    
    // Ширина нижнего края блока "Деньги" в идеальной воронке (все этапы на 100%)
    // Проходим через все 7 этапов с стандартным сужением
    let idealBottomWidth = maxWidth
    for (let i = 0; i < segments.length; i++) {
      idealBottomWidth = idealBottomWidth * standardNarrowing
    }
    
    // Упущенная прибыль: во сколько раз больше могли бы заработать относительно полученного
    // Формула: идеальная / реальная
    // Пример: заработали 5000, могли бы 125000, значит в 25 раз больше
    let lostProfitMultiplier = 0
    if (idealBottomWidth > 0) {
      if (actualBottomWidth <= 0) {
        // Если реальная прибыль = 0, показываем очень большое число (практически бесконечность)
        lostProfitMultiplier = 9999
      } else {
        // Формула: идеальная / реальная (во сколько раз больше)
        lostProfitMultiplier = idealBottomWidth / actualBottomWidth
      }
    }
    
    return Math.round(lostProfitMultiplier * 10) / 10 // Округляем до 1 знака после запятой
  }, [segments, segmentWidths])

  // Анимированный счетчик
  const [displayedProfit, setDisplayedProfit] = useState(0)

  useEffect(() => {
    setDisplayedProfit(0)
    const duration = 2000
    const steps = 60
    const stepValue = lostProfitMultiplier / steps
    const stepDuration = duration / steps

    let currentStep = 0
    const timer = setInterval(() => {
      currentStep++
      if (currentStep <= steps) {
        setDisplayedProfit(Math.round(stepValue * currentStep * 10) / 10)
      } else {
        setDisplayedProfit(lostProfitMultiplier)
        clearInterval(timer)
      }
    }, stepDuration)

    return () => clearInterval(timer)
  }, [lostProfitMultiplier])

  // Вычисляем координаты для SVG path (трапеция)
  const getSegmentPath = (index, topWidth, bottomWidth, height, yOffset) => {
    const centerX = 500 // Центр SVG
    const topLeft = centerX - topWidth / 2
    const topRight = centerX + topWidth / 2
    const bottomLeft = centerX - bottomWidth / 2
    const bottomRight = centerX + bottomWidth / 2
    const topY = yOffset
    const bottomY = yOffset + height

    return `M ${topLeft} ${topY} L ${topRight} ${topY} L ${bottomRight} ${bottomY} L ${bottomLeft} ${bottomY} Z`
  }

  // Идеальный path (для анимации) - ровный блок или стандартное сужение
  const getIdealPath = (index, topWidth, height, yOffset) => {
    const centerX = 500
    const standardNarrowing = 0.95
    const bottomWidth = topWidth * standardNarrowing
    const topLeft = centerX - topWidth / 2
    const topRight = centerX + topWidth / 2
    const bottomLeft = centerX - bottomWidth / 2
    const bottomRight = centerX + bottomWidth / 2
    const topY = yOffset
    const bottomY = yOffset + height

    return `M ${topLeft} ${topY} L ${topRight} ${topY} L ${bottomRight} ${bottomY} L ${bottomLeft} ${bottomY} Z`
  }

  // Позиции и размеры
  const segmentHeight = 180 // Увеличена в 2 раза
  const topPadding = 10 // Верхний отступ (минимальный)
  const bottomPadding = 0 // Нижний отступ = 0 (заканчивается внизу)
  const totalHeight = topPadding + segments.length * segmentHeight + bottomPadding

  // Проверка на пустые данные
  if (!results || results.length === 0 || !segmentWidths || segmentWidths.length === 0) {
    return (
      <div className="funnel-3d-container">
        <div className="funnel-3d-wrapper">
          <div style={{ color: '#fff', padding: '40px', textAlign: 'center' }}>
            Загрузка результатов...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="funnel-3d-container">
      <div className="funnel-3d-wrapper">
        <svg 
          width="1000" 
          height={totalHeight} 
          viewBox={`0 0 1000 ${totalHeight}`}
          className="funnel-3d-svg"
          preserveAspectRatio="xMidYMin meet"
        >
          <defs>
            {/* Градиенты для glassmorphism */}
            {segments.map((segment, index) => (
              <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.15)" />
                <stop offset="100%" stopColor="rgba(255, 255, 255, 0.05)" />
              </linearGradient>
            ))}
            
            {/* Фильтры для неонового свечения */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            
            <filter id="glow-red">
              <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Рендерим сегменты воронки */}
          {segments.map((segment, index) => {
            const { topWidth, bottomWidth, height, score } = segmentWidths[index]
            const yOffset = topPadding + index * height
            const centerX = 500
            
            // Определяем цвет границы (пороги должны совпадать с Diagnostics.jsx)
            // Критический ≤30%, нестабильный 30-70%, сильный ≥70%
            let borderColor = '#00ff88' // Зеленый по умолчанию (сильный ≥70%)
            if (score <= 30) {
              borderColor = '#ff4444' // Красный для критических (≤30%)
            } else if (score < 70) {
              borderColor = '#ffaa00' // Оранжевый для нестабильных (30-70%)
            }
            
            // Идеальный path для анимации
            const idealPath = getIdealPath(index, topWidth, height, yOffset)
            // Реальный path
            const realPath = getSegmentPath(index, topWidth, bottomWidth, height, yOffset)

            return (
              <g key={segment.id}>
                {/* Сегмент воронки */}
                <motion.path
                  d={realPath}
                  fill={`url(#gradient-${index})`}
                  stroke={borderColor}
                  strokeWidth="3"
                  filter={score <= 30 ? "url(#glow-red)" : "url(#glow)"}
                  initial={{ d: idealPath }}
                  animate={{ 
                    d: realPath,
                    stroke: score <= 30 ? ['#ff4444', '#ff0000', '#ff4444'] : borderColor
                  }}
                  transition={{ 
                    d: { duration: 1.5, ease: "easeInOut", delay: index * 0.15 },
                    stroke: score <= 30 ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}
                  }}
                  style={{
                    backdropFilter: 'blur(20px)',
                    opacity: 0.9
                  }}
                />
                
                {/* Инфографика ВНУТРИ воронки - картинка, название и процент */}
                <g className="funnel-info-group">
                  {/* Картинка этапа */}
                  {segment.image && !imageErrors[segment.id] && (
                    <foreignObject
                      x={centerX - 60}
                      y={yOffset + 16}
                      width="120"
                      height="80"
                    >
                      <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <img
                          src={segment.image}
                          alt={segment.name}
                          onError={() => handleImageError(segment.id)}
                          loading="lazy"
                          style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain',
                            filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.4))',
                            opacity: 0.9
                          }}
                        />
                      </div>
                    </foreignObject>
                  )}
                  
                  {/* Название этапа */}
                  <text
                    x={centerX}
                    y={yOffset + height / 2 + 16}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="26"
                    fontWeight="600"
                    className="funnel-segment-label"
                    style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.9)' }}
                  >
                    {segment.name}
                  </text>
                  
                  {/* Процент эффективности */}
                  <text
                    x={centerX}
                    y={yOffset + height / 2 + 52}
                    textAnchor="middle"
                    fill={borderColor}
                    fontSize="44"
                    fontWeight="700"
                    className="funnel-segment-score"
                    style={{ textShadow: '0 0 12px currentColor, 0 2px 4px rgba(0, 0, 0, 0.8)' }}
                  >
                    {score}%
                  </text>
                </g>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Блок потенциала роста прибыли */}
      <motion.div 
        className="lost-profit-counter"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2, duration: 0.5 }}
      >
        <div className="lost-profit-label">Потенциал роста прибыли</div>
        <motion.div 
          className="lost-profit-value"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 2.5, duration: 0.5 }}
        >
          в {displayedProfit.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} раз
        </motion.div>
        <div className="lost-profit-description">
          При оптимизации всех этапов воронки
        </div>
      </motion.div>
    </div>
  )
}

export default Funnel3D
