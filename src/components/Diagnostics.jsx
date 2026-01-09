import React, { useState } from 'react'
import { motion } from 'framer-motion'
import Header from './Header'
import Funnel3D from './Funnel3D'
import './Diagnostics.css'

const stages = [
  {
    id: 'audience',
    name: 'Аудитория',
    image: '/images/1_трафик.png',
    question: 'Можешь ли ты чётко и однозначно описать свою целевую аудиторию так, что два разных человека, прочитав описание, представят одного и того же клиента?'
  },
  {
    id: 'landing',
    name: 'Лендинг',
    image: '/images/2_лендинг.png',
    question: 'Понимает ли новый посетитель лендинга за первые 5–7 секунд, что именно ему предлагают, для кого это и зачем это ему?'
  },
  {
    id: 'leadmagnet',
    name: 'Лидмагнит',
    image: '/images/3_Лидмагнит.png',
    question: 'Есть ли у тебя конкретный лидмагнит, который решает одну ощутимую проблему аудитории и за который люди осознанно оставляют контакт?'
  },
  {
    id: 'autofunnel',
    name: 'Автоворонки прогрева',
    image: '/images/4_Прогрев.png',
    question: 'Есть ли у тебя выстроенная цепочка касаний, которая последовательно усиливает доверие и подводит к покупке, а не просто рассылает контент?'
  },
  {
    id: 'product',
    name: 'Продукт',
    image: '/images/5_Курс.png',
    question: 'Сформулирован ли твой продукт так, что понятно: какую конкретную трансформацию получает клиент и за что он платит?'
  },
  {
    id: 'money',
    name: 'Деньги',
    image: '/images/6_оплата.png',
    question: 'Понимаешь ли ты, откуда именно в системе появляются деньги, и можешь ли ты управлять этой цифрой (конверсии, чеки, повторные продажи)?'
  }
]

const answerOptions = [
  {
    value: 0,
    label: '❌ Нет / делается хаотично / на ощущениях',
    description: '0 баллов'
  },
  {
    value: 50,
    label: '⚠️ Есть, но не проверено и нестабильно',
    description: '50 баллов'
  },
  {
    value: 100,
    label: '✅ Есть, работает, подтверждено цифрами',
    description: '100 баллов'
  }
]

function Diagnostics({ onBack, onAvatarClick }) {
  const [currentStep, setCurrentStep] = useState(0) // 0 = intro, 1-7 = questions, 8 = results
  const [answers, setAnswers] = useState({})
  const [showResults, setShowResults] = useState(false)

  const handleStart = () => {
    setCurrentStep(1)
  }

  const handleAnswer = (stageId, value) => {
    const newAnswers = { ...answers, [stageId]: value }
    setAnswers(newAnswers)
    
    // Переход к следующему вопросу
    const currentIndex = stages.findIndex(s => s.id === stageId)
    if (currentIndex < stages.length - 1) {
      setTimeout(() => {
        setCurrentStep(currentIndex + 2)
      }, 300)
    } else {
      // Последний вопрос - показываем результаты
      setTimeout(() => {
        setShowResults(true)
        setCurrentStep(8)
      }, 300)
    }
  }

  const handleConsultation = () => {
    // В Diagnostics кнопка в Header возвращает на главную
    onBack()
  }

  const handleHeaderAvatarClick = () => {
    if (onAvatarClick) {
      onAvatarClick()
    } else {
      onBack()
    }
  }

  const formatResultsForTelegram = () => {
    const { results, mainLeak, unstableZone, strongSide } = getResults()
    
    let message = 'Добрый день!\n\n'
    message += 'Я прошел диагностику цепочки продаж своего продукта, вот его результаты:\n\n'
    
    // Добавляем баллы по каждому вопросу
    results.forEach((result, index) => {
      const emoji = result.score <= 30 ? '🔴' : result.score < 80 ? '🟡' : '🟢'
      message += `${emoji} ${result.name}: ${result.score} баллов\n`
    })
    
    message += '\n'
    
    // Добавляем выводы
    if (mainLeak) {
      message += `🔴 Основная утечка системы: ${mainLeak.name}\n`
    }
    if (unstableZone) {
      message += `🟡 Зона нестабильности: ${unstableZone.name}\n`
    }
    if (strongSide) {
      message += `🟢 Сильная сторона: ${strongSide.name}\n`
    }
    
    message += '\n'
    
    // Общий вывод
    if (mainLeak) {
      message += `Вывод: Сейчас система продаж не «сломана», но работает неравномерно. Главный рост возможен при устранении узкого места: ${mainLeak.name}.\n`
    } else {
      message += 'Вывод: Ваша система продаж работает стабильно. Фокус на масштабировании сильных сторон.\n'
    }
    
    message += '\n'
    message += 'Давайте обсудим результаты и сформируем варианты улучшения!'
    
    return encodeURIComponent(message)
  }

  const handleResultsConsultation = () => {
    // Формируем URL с предзаполненным сообщением для Telegram
    const message = formatResultsForTelegram()
    window.open(`https://t.me/ilyaborm?text=${message}`, '_blank')
  }

  // Подсчёт результатов
  const getResults = () => {
    const results = stages.map(stage => ({
      ...stage,
      score: answers[stage.id] || 0
    }))
    
    // Определяем зоны
    const critical = results.filter(r => r.score <= 30)
    const unstable = results.filter(r => r.score > 30 && r.score < 80)
    const strong = results.filter(r => r.score >= 80)
    
    // Находим основные проблемы
    const mainLeak = critical.length > 0 ? critical.sort((a, b) => a.score - b.score)[0] : null
    const unstableZone = unstable.length > 0 ? unstable[0] : null
    const strongSide = strong.length > 0 ? strong[0] : null
    
    return {
      results,
      critical,
      unstable,
      strong,
      mainLeak,
      unstableZone,
      strongSide
    }
  }

  const getScoreColor = (score) => {
    if (score <= 30) return '#d9534f' // 🔴
    if (score < 80) return '#f0ad4e' // 🟡
    return '#5cb85c' // 🟢
  }

  const getScoreStatus = (score) => {
    if (score <= 30) return 'critical'
    if (score < 80) return 'unstable'
    return 'strong'
  }

  const getRecommendation = (score) => {
    if (score <= 30) {
      return 'Здесь система не работает. Любые вложения в трафик и контент будут давать слабый результат.'
    }
    if (score < 80) {
      return 'Потенциал есть, но этап требует донастройки и проверки гипотез.'
    }
    return 'Этап можно использовать как опору при масштабировании.'
  }

  // Вводный экран
  if (currentStep === 0) {
    return (
      <div className="diagnostics-container">
        <Header 
          onAvatarClick={handleHeaderAvatarClick}
          onConsultation={handleConsultation}
          onBack={onBack}
        />
        <div className="diagnostics-intro">
          <div className="diagnostics-intro-content">
            <h1 className="diagnostics-intro-title">Диагностика системы продаж</h1>
            <p className="diagnostics-intro-subtitle">
              Ответьте на 6 вопросов и получите наглядную картину своей воронки:
              где деньги теряются, а где система уже работает.
            </p>
            <button className="diagnostics-start-btn" onClick={handleStart}>
              Начать диагностику
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Экран результатов
  if (showResults && currentStep === 8) {
    const { results, mainLeak, unstableZone, strongSide } = getResults()
    
    return (
      <div className="diagnostics-container diagnostics-container-results">
        <Header 
          onAvatarClick={handleHeaderAvatarClick}
          onConsultation={handleConsultation}
          onBack={onBack}
        />
        <div className="diagnostics-results">
          <div className="diagnostics-results-content">
            <h1 className="diagnostics-results-title">Результаты диагностики</h1>
            
            {/* 3D Воронка */}
            <Funnel3D results={results} />

            {/* Текстовый блок с анализом */}
            <div className="diagnostics-analysis">
              {mainLeak && (
                <div className="analysis-item analysis-critical">
                  <div className="analysis-icon">🔴</div>
                  <div className="analysis-text">
                    <strong>Основная утечка системы:</strong> {mainLeak.name}
                  </div>
                </div>
              )}
              {unstableZone && (
                <div className="analysis-item analysis-unstable">
                  <div className="analysis-icon">🟡</div>
                  <div className="analysis-text">
                    <strong>Зона нестабильности:</strong> {unstableZone.name}
                  </div>
                </div>
              )}
              {strongSide && (
                <div className="analysis-item analysis-strong">
                  <div className="analysis-icon">🟢</div>
                  <div className="analysis-text">
                    <strong>Сильная сторона:</strong> {strongSide.name}
                  </div>
                </div>
              )}
            </div>

            {/* Общий вывод */}
            <div className="diagnostics-conclusion">
              <p className="conclusion-text">
                {mainLeak 
                  ? `Сейчас система продаж не «сломана», но работает неравномерно. Главный рост возможен при устранении узкого места: ${mainLeak.name}.`
                  : 'Ваша система продаж работает стабильно. Фокус на масштабировании сильных сторон.'
                }
              </p>
            </div>

            {/* Финальный блок перед CTA */}
            <motion.div 
              className="diagnostics-final-block"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.5, duration: 0.6 }}
            >
              <h2 className="final-block-title">Готовы улучшить свою воронку?</h2>
              <p className="final-block-text">
                Давайте обсудим результаты диагностики и сформируем конкретный план действий для устранения узких мест и увеличения прибыли.
              </p>
              <div className="final-block-benefits">
                <div className="benefit-item">
                  <span className="benefit-icon">✓</span>
                  <span>Анализ текущей ситуации</span>
                </div>
                <div className="benefit-item">
                  <span className="benefit-icon">✓</span>
                  <span>План улучшений</span>
                </div>
                <div className="benefit-item">
                  <span className="benefit-icon">✓</span>
                  <span>Внедрение инструментов</span>
                </div>
              </div>
            </motion.div>

            {/* CTA кнопка */}
            <div className="diagnostics-consultation">
              <button className="diagnostics-consultation-btn diagnostics-fix-btn" onClick={handleResultsConsultation}>
                <span className="btn-glow"></span>
                Обсудить результаты и улучшения
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Экран вопроса
  const currentStage = stages[currentStep - 1]
  const currentAnswer = answers[currentStage.id]

  return (
    <div className="diagnostics-container">
      <Header 
        onAvatarClick={handleHeaderAvatarClick}
        onConsultation={handleConsultation}
        onBack={onBack}
      />
      <div className="diagnostics-question">
        <div className="diagnostics-progress">
          <div className="progress-bar">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${(currentStep / stages.length) * 100}%` }}
            />
          </div>
          <div className="progress-text">
            Вопрос {currentStep} из {stages.length}
          </div>
        </div>

        <div className="question-content">
          <div className="question-content-wrapper">
            <div className="question-stage">
              <img src={currentStage.image} alt={currentStage.name} className="question-stage-image" />
              <h2 className="question-stage-name">{currentStage.name}</h2>
            </div>
            
            <h1 className="question-text">{currentStage.question}</h1>
          </div>

          <div className="answer-options">
            {answerOptions.map((option, index) => (
              <button
                key={index}
                className={`answer-option ${currentAnswer === option.value ? 'selected' : ''}`}
                onClick={() => handleAnswer(currentStage.id, option.value)}
              >
                <div className="answer-option-label">{option.label}</div>
                <div className="answer-option-description">{option.description}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Diagnostics
