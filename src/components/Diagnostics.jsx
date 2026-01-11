import React, { useState } from 'react'
import { motion } from 'framer-motion'
import Header from './Header'
import Funnel3D from './Funnel3D'
import './Diagnostics.css'

const stages = [
  {
    id: 'audience',
    name: 'Аудитория',
    subtitle: 'основа всего, тут чаще всего и течёт',
    image: '/images/1_трафик.png',
    questions: [
      {
        id: 'audience_1',
        text: 'Насколько у вас сейчас зафиксирован конкретный целевой сегмент?'
      },
      {
        id: 'audience_2',
        text: 'Понимаете ли вы, почему люди реально к вам приходят?'
      },
      {
        id: 'audience_3',
        text: 'Насколько язык клиента совпадает с тем, как вы описываете продукт?'
      }
    ]
  },
  {
    id: 'landing',
    name: 'Лендинг',
    subtitle: 'проверка смысла, а не дизайна',
    image: '/images/2_лендинг.png',
    questions: [
      {
        id: 'landing_1',
        text: 'Понимает ли человек, что вы предлагаете, за первые 5–7 секунд?'
      },
      {
        id: 'landing_2',
        text: 'Насколько лендинг соответствует реальному запросу аудитории?'
      },
      {
        id: 'landing_3',
        text: 'Есть ли на лендинге чёткое следующее действие?'
      }
    ]
  },
  {
    id: 'leadmagnet',
    name: 'Лидмагнит',
    subtitle: 'фильтр, а не «плюшка»',
    image: '/images/3_Лидмагнит.png',
    questions: [
      {
        id: 'leadmagnet_1',
        text: 'Привлекает ли лидмагнит именно целевую аудиторию?'
      },
      {
        id: 'leadmagnet_2',
        text: 'Решает ли лидмагнит реальную микропроблему клиента?'
      },
      {
        id: 'leadmagnet_3',
        text: 'Понимает ли человек после лидмагнита, что будет дальше?'
      }
    ]
  },
  {
    id: 'autofunnel',
    name: 'Автоворонки прогрева',
    subtitle: 'доверие и созревание',
    image: '/images/4_Прогрев.png',
    questions: [
      {
        id: 'autofunnel_1',
        text: 'Есть ли у вас выстроенная логика прогрева, а не разрозненные касания?'
      },
      {
        id: 'autofunnel_2',
        text: 'Растёт ли доверие к вам по ходу прогрева?'
      },
      {
        id: 'autofunnel_3',
        text: 'Готовит ли прогрев человека к покупке психологически?'
      }
    ]
  },
  {
    id: 'product',
    name: 'Продукт',
    subtitle: 'соответствие ожиданиям',
    image: '/images/5_Курс.png',
    questions: [
      {
        id: 'product_1',
        text: 'Насколько продукт решает заявленную проблему клиента?'
      },
      {
        id: 'product_2',
        text: 'Понимает ли клиент ценность продукта до покупки?'
      },
      {
        id: 'product_3',
        text: 'Есть ли повторные покупки / рекомендации?'
      }
    ]
  },
  {
    id: 'money',
    name: 'Деньги',
    subtitle: 'экономика без иллюзий',
    image: '/images/6_оплата.png',
    questions: [
      {
        id: 'money_1',
        text: 'Понимаете ли вы экономику воронки в цифрах?'
      },
      {
        id: 'money_2',
        text: 'Окупается ли привлечение клиента?'
      },
      {
        id: 'money_3',
        text: 'Насколько стабилен доход?'
      }
    ]
  }
]

// Варианты ответов для всех вопросов (4 варианта от худшего к лучшему)
// Значения: 0% = критично, 25% = слабо, 50% = среднее, 100% = отлично
const getAnswerOptions = (questionId) => {
  // Для каждого вопроса варианты ответов могут различаться, но структура общая
  // Используем общие варианты для всех вопросов, но можно настроить индивидуально
  // Значение value соответствует проценту эффективности (0-100)
  const baseOptions = {
    audience_1: [
      { value: 0, label: '❌ Мы работаем «для всех, кому может быть полезно»' },
      { value: 25, label: '⚠️ Есть примерный портрет, но он плавает' },
      { value: 50, label: '✓ Есть чёткий сегмент с понятной проблемой' },
      { value: 100, label: '✅ Есть 1–2 приоритетных сегмента, подтверждённых цифрами' }
    ],
    audience_2: [
      { value: 0, label: '❌ Скорее предполагаем' },
      { value: 25, label: '⚠️ Понимаем на уровне ощущений' },
      { value: 50, label: '✓ Видим повторяющиеся причины и формулировки' },
      { value: 100, label: '✅ Можем предсказать запрос до входа клиента' }
    ],
    audience_3: [
      { value: 0, label: '❌ Говорим на «разных языках»' },
      { value: 25, label: '⚠️ Частично совпадает' },
      { value: 50, label: '✓ В целом резонирует' },
      { value: 100, label: '✅ Используем формулировки самих клиентов' }
    ],
    landing_1: [
      { value: 0, label: '❌ Нет, нужно вчитываться' },
      { value: 25, label: '⚠️ Понимает примерно' },
      { value: 50, label: '✓ Понимает с первого экрана' },
      { value: 100, label: '✅ Понимает и сразу видит пользу' }
    ],
    landing_2: [
      { value: 0, label: '❌ Часто не попадает' },
      { value: 25, label: '⚠️ Попадает частично' },
      { value: 50, label: '✓ В целом совпадает' },
      { value: 100, label: '✅ Прямо отражает боль и цель клиента' }
    ],
    landing_3: [
      { value: 0, label: '❌ Нет, человек теряется' },
      { value: 25, label: '⚠️ Есть, но неочевидно' },
      { value: 50, label: '✓ Есть понятный шаг' },
      { value: 100, label: '✅ Шаг логично вытекает из смысла страницы' }
    ],
    leadmagnet_1: [
      { value: 0, label: '❌ Скорее всех подряд' },
      { value: 25, label: '⚠️ Много нецелевых' },
      { value: 50, label: '✓ В основном целевых' },
      { value: 100, label: '✅ Почти только нужный сегмент' }
    ],
    leadmagnet_2: [
      { value: 0, label: '❌ Нет, больше про «интересно»' },
      { value: 25, label: '⚠️ Польза есть, но размыта' },
      { value: 50, label: '✓ Да, решает конкретную задачу' },
      { value: 100, label: '✅ Чётко подводит к основному продукту' }
    ],
    leadmagnet_3: [
      { value: 0, label: '❌ Нет, он «просто скачал»' },
      { value: 25, label: '⚠️ Примерно понимает' },
      { value: 50, label: '✓ Видит логичное продолжение' },
      { value: 100, label: '✅ Сам ждёт следующий шаг' }
    ],
    autofunnel_1: [
      { value: 0, label: '❌ Нет, всё хаотично' },
      { value: 25, label: '⚠️ Есть отдельные элементы' },
      { value: 50, label: '✓ Есть понятная цепочка' },
      { value: 100, label: '✅ Есть сценарии под разные сегменты' }
    ],
    autofunnel_2: [
      { value: 0, label: '❌ Скорее нет' },
      { value: 25, label: '⚠️ Нейтрально' },
      { value: 50, label: '✓ Да, заметно' },
      { value: 100, label: '✅ Клиенты сами пишут и задают вопросы' }
    ],
    autofunnel_3: [
      { value: 0, label: '❌ Нет, продажа резкая' },
      { value: 25, label: '⚠️ Частично' },
      { value: 50, label: '✓ В целом да' },
      { value: 100, label: '✅ Покупка выглядит естественным шагом' }
    ],
    product_1: [
      { value: 0, label: '❌ Слабо' },
      { value: 25, label: '⚠️ Частично' },
      { value: 50, label: '✓ Хорошо' },
      { value: 100, label: '✅ Лучше, чем ожидали' }
    ],
    product_2: [
      { value: 0, label: '❌ Нет' },
      { value: 25, label: '⚠️ Примерно' },
      { value: 50, label: '✓ В целом да' },
      { value: 100, label: '✅ Чётко понимает, за что платит' }
    ],
    product_3: [
      { value: 0, label: '❌ Нет' },
      { value: 25, label: '⚠️ Редко' },
      { value: 50, label: '✓ Периодически' },
      { value: 100, label: '✅ Это основной источник роста' }
    ],
    money_1: [
      { value: 0, label: '❌ Нет' },
      { value: 25, label: '⚠️ Примерно' },
      { value: 50, label: '✓ По ключевым показателям' },
      { value: 100, label: '✅ Полностью управляемо' }
    ],
    money_2: [
      { value: 0, label: '❌ Нет' },
      { value: 25, label: '⚠️ На грани' },
      { value: 50, label: '✓ Да' },
      { value: 100, label: '✅ Есть запас на масштабирование' }
    ],
    money_3: [
      { value: 0, label: '❌ Скачет хаотично' },
      { value: 25, label: '⚠️ Зависит от запусков' },
      { value: 50, label: '✓ Относительно стабилен' },
      { value: 100, label: '✅ Прогнозируем и масштабируем' }
    ]
  }
  
  return baseOptions[questionId] || [
    { value: 0, label: '❌ Вариант 1' },
    { value: 25, label: '⚠️ Вариант 2' },
    { value: 50, label: '✓ Вариант 3' },
    { value: 100, label: '✅ Вариант 4' }
  ]
}

function Diagnostics({ onBack, onAvatarClick }) {
  // Вычисляем общее количество вопросов
  const totalQuestions = stages.reduce((sum, stage) => sum + stage.questions.length, 0)
  
  // Создаём плоский список всех вопросов для удобной навигации
  const allQuestions = []
  stages.forEach(stage => {
    stage.questions.forEach(question => {
      allQuestions.push({
        ...question,
        stageId: stage.id,
        stageName: stage.name,
        stageImage: stage.image,
        stageSubtitle: stage.subtitle
      })
    })
  })

  const [currentStep, setCurrentStep] = useState(0) // 0 = intro, 1-N = questions, totalQuestions+1 = results
  const [answers, setAnswers] = useState({}) // { questionId: value }
  const [showResults, setShowResults] = useState(false)

  const handleStart = () => {
    setCurrentStep(1)
  }

  const handleAnswer = (questionId, value) => {
    const newAnswers = { ...answers, [questionId]: value }
    setAnswers(newAnswers)
    
    // Переход к следующему вопросу
    const currentIndex = allQuestions.findIndex(q => q.id === questionId)
    if (currentIndex < allQuestions.length - 1) {
      setTimeout(() => {
        setCurrentStep(currentIndex + 2)
      }, 300)
    } else {
      // Последний вопрос - показываем результаты
      setTimeout(() => {
        setShowResults(true)
        setCurrentStep(totalQuestions + 1)
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
    const { results, critical, unstable, strong } = getResults()
    
    let message = 'Добрый день!\n\n'
    message += 'Я прошел диагностику цепочки продаж своего продукта, вот его результаты:\n\n'
    
    // Добавляем проценты по каждому этапу
    results.forEach((result, index) => {
      const emoji = result.score <= 30 ? '🔴' : result.score < 70 ? '🟡' : '🟢'
      message += `${emoji} ${result.name}: ${result.score}%\n`
    })
    
    message += '\n'
    
    // Добавляем все критические зоны
    if (critical.length > 0) {
      const criticalNames = critical.map(c => c.name).join(', ')
      message += `🔴 Основные утечки системы: ${criticalNames}\n`
    }
    
    // Добавляем все зоны нестабильности
    if (unstable.length > 0) {
      const unstableNames = unstable.map(u => u.name).join(', ')
      message += `🟡 Зоны нестабильности: ${unstableNames}\n`
    }
    
    // Добавляем все сильные стороны
    if (strong.length > 0) {
      const strongNames = strong.map(s => s.name).join(', ')
      message += `🟢 Сильные стороны: ${strongNames}\n`
    }
    
    message += '\n'
    
    // Детальный вывод
    message += getDetailedConclusion(critical, unstable, strong).replace(/\*\*/g, '')
    
    message += '\n\n'
    message += 'Давайте обсудим результаты и сформируем конкретный план действий для улучшения!'
    
    return encodeURIComponent(message)
  }

  const handleResultsConsultation = () => {
    // Формируем URL с предзаполненным сообщением для Telegram
    const message = formatResultsForTelegram()
    window.open(`https://t.me/ilyaborm?text=${message}`, '_blank')
  }

  // Подсчёт результатов
  const getResults = () => {
    // Для каждого этапа вычисляем средний процент по всем его вопросам
    // (0-100, где 100 = максимальная эффективность)
    const results = stages.map(stage => {
      const stageAnswers = stage.questions.map(q => answers[q.id] || 0)
      const avgScore = stageAnswers.length > 0 
        ? Math.round(stageAnswers.reduce((sum, val) => sum + val, 0) / stageAnswers.length)
        : 0
      
      return {
        ...stage,
        score: avgScore,
        questionScores: stageAnswers
      }
    })
    
    // Определяем зоны по проценту эффективности (0-100%: критический ≤30%, нестабильный 30-70%, сильный ≥70%)
    const critical = results.filter(r => r.score <= 30).sort((a, b) => a.score - b.score)
    const unstable = results.filter(r => r.score > 30 && r.score < 70).sort((a, b) => a.score - b.score)
    const strong = results.filter(r => r.score >= 70).sort((a, b) => b.score - a.score)
    
    return {
      results,
      critical,
      unstable,
      strong
    }
  }

  // Генерация детального анализа результатов
  const getDetailedConclusion = (critical, unstable, strong) => {
    const totalStages = stages.length
    const criticalCount = critical.length
    const unstableCount = unstable.length
    const strongCount = strong.length
    
    let conclusion = ''
    
    // Если есть критические зоны
    if (criticalCount > 0) {
      conclusion = `Вижу ${criticalCount === 1 ? 'критическую зону' : 'критические зоны'}:`
      conclusion += '\n' + critical.map(c => `• ${c.name}`).join('\n')
      conclusion += '\nЭти этапы блокируют рост — любые вложения в трафик здесь не окупаются.'
      
      // Если есть ещё и нестабильные зоны
      if (unstableCount > 0) {
        conclusion += `\n\nТакже есть нестабильные этапы, их стоит подтянуть:`
        conclusion += '\n' + unstable.map(u => `• ${u.name}`).join('\n')
      }
      
      // Если есть сильные стороны
      if (strongCount > 0) {
        conclusion += `\n\nХорошая новость: ${strong.map(s => s.name).join(', ')} работают хорошо. Используем их как опору.`
      }
      
      conclusion += '\n\nЧто делаем:'
      conclusion += '\n1. Сначала закрываем критические зоны — это даст максимальный рост'
      conclusion += '\n2. Затем донастраиваем нестабильные этапы'
    }
    // Если только нестабильные зоны
    else if (unstableCount > 0 && strongCount === 0) {
      conclusion = `Все этапы требуют донастройки:`
      conclusion += '\n' + unstable.map(u => `• ${u.name}`).join('\n')
      conclusion += '\n\nПотенциал есть, но система работает нестабильно. Нужно проработать каждый этап, чтобы получить предсказуемый результат.'
      conclusion += '\n\nДавай обсудим план улучшений для каждого этапа?'
    }
    // Если только нестабильные + сильные
    else if (unstableCount > 0 && strongCount > 0) {
      conclusion = `Система работает неравномерно.`
      conclusion += `\n\nНестабильные этапы (${unstableCount}):`
      conclusion += '\n' + unstable.map(u => `• ${u.name}`).join('\n')
      conclusion += `\n\nСильные стороны (${strongCount}):`
      conclusion += '\n' + strong.map(s => `• ${s.name}`).join('\n')
      conclusion += '\n\nСтратегия: используем опыт сильных зон для донастройки нестабильных этапов.'
      conclusion += '\n\nОбсудим план выравнивания воронки?'
    }
    // Если все сильные (все >= 70)
    else if (strongCount === totalStages) {
      conclusion = `Отличные результаты! Все этапы работают на высоком уровне:`
      conclusion += '\n' + strong.map(s => `• ${s.name}`).join('\n')
      conclusion += '\n\nСледующий шаг: масштабирование. Увеличиваем трафик и инвестируем в развитие.'
      conclusion += '\n\nГотов обсудить стратегию масштабирования?'
    }
    // Если только сильные (но не все)
    else if (strongCount > 0 && unstableCount === 0 && criticalCount === 0) {
      conclusion = `У тебя сильная система! Эти этапы работают отлично:`
      conclusion += '\n' + strong.map(s => `• ${s.name}`).join('\n')
      conclusion += '\n\nСистема готова к масштабированию.'
      conclusion += '\n\nОбсудим стратегию роста?'
    }
    // Fallback
    else {
      conclusion = 'Проанализировал результаты по каждому этапу. Давай определим приоритеты и составим план действий вместе?'
    }
    
    return conclusion
  }

  const getScoreColor = (score) => {
    if (score <= 30) return '#d9534f' // 🔴
    if (score < 70) return '#f0ad4e' // 🟡
    return '#5cb85c' // 🟢
  }

  const getScoreStatus = (score) => {
    if (score <= 30) return 'critical'
    if (score < 70) return 'unstable'
    return 'strong'
  }

  const getRecommendation = (score) => {
    if (score <= 30) {
      return 'Здесь система не работает. Любые вложения в трафик и контент будут давать слабый результат.'
    }
    if (score < 70) {
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
              Ответьте на {totalQuestions} вопросов и получите наглядную картину своей воронки:
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
  if (showResults && currentStep === totalQuestions + 1) {
    const { results, critical, unstable, strong } = getResults()
    const detailedConclusion = getDetailedConclusion(critical, unstable, strong)
    
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
              {critical.length > 0 && (
                <div className="analysis-section">
                  <div className="analysis-section-header analysis-critical">
                    <div className="analysis-icon">🔴</div>
                    <div className="analysis-section-title">
                      <strong>Основные утечки системы</strong>
                      {critical.length > 1 && <span className="analysis-count"> ({critical.length})</span>}
                    </div>
                  </div>
                  <div className="analysis-section-items">
                    {critical.map((item, index) => (
                      <div key={item.id} className="analysis-item analysis-critical">
                        <div className="analysis-item-content">
                          <span className="analysis-item-name">{item.name}</span>
                          <span className="analysis-item-score">{item.score}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {unstable.length > 0 && (
                <div className="analysis-section">
                  <div className="analysis-section-header analysis-unstable">
                    <div className="analysis-icon">🟡</div>
                    <div className="analysis-section-title">
                      <strong>Зоны нестабильности</strong>
                      {unstable.length > 1 && <span className="analysis-count"> ({unstable.length})</span>}
                    </div>
                  </div>
                  <div className="analysis-section-items">
                    {unstable.map((item, index) => (
                      <div key={item.id} className="analysis-item analysis-unstable">
                        <div className="analysis-item-content">
                          <span className="analysis-item-name">{item.name}</span>
                          <span className="analysis-item-score">{item.score}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {strong.length > 0 && (
                <div className="analysis-section">
                  <div className="analysis-section-header analysis-strong">
                    <div className="analysis-icon">🟢</div>
                    <div className="analysis-section-title">
                      <strong>Сильные стороны</strong>
                      {strong.length > 1 && <span className="analysis-count"> ({strong.length})</span>}
                    </div>
                  </div>
                  <div className="analysis-section-items">
                    {strong.map((item, index) => (
                      <div key={item.id} className="analysis-item analysis-strong">
                        <div className="analysis-item-content">
                          <span className="analysis-item-name">{item.name}</span>
                          <span className="analysis-item-score">{item.score}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Детальный вывод */}
            <div className="diagnostics-conclusion">
              <div className="conclusion-wrapper">
                <img src="/images/me.jpg" alt="Эксперт" className="conclusion-avatar" />
                <div className="conclusion-text" dangerouslySetInnerHTML={{ 
                  __html: detailedConclusion
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/• /g, '<span class="list-marker">•</span> ')
                    .replace(/(\d+)\. /g, '<span class="list-number">$1.</span> ')
                    .replace(/\n\n+/g, '<br /><br />')
                    .replace(/\n/g, '<br />')
                    .replace(/🔴|🟡|✅/g, '')
                }} />
              </div>
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
                {critical.length > 0 
                  ? 'На консультации мы разберём конкретные шаги по устранению критических зон и выстроим работающую систему продаж. Вы получите чёткий план действий с приоритетами.'
                  : unstable.length > 0 && strong.length > 0
                  ? 'На консультации мы выровняем нестабильные этапы, используя опыт из ваших сильных зон. Разберём, как масштабировать успешные части системы.'
                  : strong.length === stages.length
                  ? 'На консультации мы обсудим стратегию масштабирования: как увеличить трафик, масштабировать воронку и максимизировать прибыль от работающей системы.'
                  : 'На консультации мы разберём каждый этап вашей воронки и сформируем конкретный план улучшений для роста продаж.'
                }
              </p>
              <div className="final-block-benefits">
                <div className="benefit-item">
                  <span className="benefit-icon">✓</span>
                  <span>Глубокий анализ текущей ситуации</span>
                </div>
                <div className="benefit-item">
                  <span className="benefit-icon">✓</span>
                  <span>Конкретный план улучшений с приоритетами</span>
                </div>
                <div className="benefit-item">
                  <span className="benefit-icon">✓</span>
                  <span>Внедрение инструментов для оптимизации воронки</span>
                </div>
              </div>
            </motion.div>

            {/* CTA кнопка */}
            <div className="diagnostics-consultation">
              <button className="diagnostics-consultation-btn diagnostics-fix-btn" onClick={handleResultsConsultation}>
                <span className="btn-glow"></span>
                Обсудить план действий
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Экран вопроса
  const currentQuestion = allQuestions[currentStep - 1]
  const currentAnswer = answers[currentQuestion.id]
  const answerOptions = getAnswerOptions(currentQuestion.id)

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
              style={{ width: `${(currentStep / totalQuestions) * 100}%` }}
            />
          </div>
          <div className="progress-text">
            Вопрос {currentStep} из {totalQuestions}
          </div>
        </div>

        <div className="question-content">
          <div className="question-content-wrapper">
            <div className="question-stage">
              <img src={currentQuestion.stageImage} alt={currentQuestion.stageName} className="question-stage-image" />
              <div>
                <h2 className="question-stage-name">{currentQuestion.stageName}</h2>
                {currentQuestion.stageSubtitle && (
                  <p className="question-stage-subtitle">{currentQuestion.stageSubtitle}</p>
                )}
              </div>
            </div>
            
            <div className="message-wrapper message-wrapper-left">
              <img src="/images/me.jpg" alt="Аватар" className="message-avatar" />
              <div className="dialog-message question-message visible">
                <span className="message-arrow message-arrow-left">◂</span>
                <p>{currentQuestion.text}</p>
              </div>
            </div>
          </div>

          <div className="answer-options">
            {answerOptions.map((option, index) => {
              const isLast = index === answerOptions.length - 1;
              return (
                <button
                  key={index}
                  className={`dialog-message answer-message poll-option visible ${currentAnswer === option.value ? 'selected' : ''}`}
                  onClick={() => handleAnswer(currentQuestion.id, option.value)}
                >
                  <div className="answer-option-label">{option.label}</div>
                  {currentAnswer === option.value && (
                    <div className="poll-checkmark">✓</div>
                  )}
                  {isLast && <span className="message-arrow message-arrow-right">▸</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Diagnostics
