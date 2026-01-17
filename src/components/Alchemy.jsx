import React, { useState, useEffect, useRef } from 'react'
import Header from './Header'
import MatrixCalculator from './MatrixCalculator'
import './Alchemy.css'

function Alchemy({ onBack, onAvatarClick, onChatClick, onDiagnostics, onHomeClick }) {
  const [selectedArtifact, setSelectedArtifact] = useState(null)
  const [isDarkMode, setIsDarkMode] = useState(false) // Для свечи - черный фон
  const [userQuestion, setUserQuestion] = useState('')
  const [numberInput, setNumberInput] = useState('')
  const [tarotCard, setTarotCard] = useState(null)
  const [showNovella, setShowNovella] = useState(false)
  const [userName, setUserName] = useState('') // Имя пользователя
  const heroBackgroundRef = useRef(null)

  // Получаем имя пользователя из Telegram
  useEffect(() => {
    const getUserName = () => {
      try {
        const tg = window.Telegram?.WebApp
        
        // Ждем готовности Telegram WebApp
        if (tg) {
          // Если WebApp готов, получаем данные сразу
          if (tg.readyState === 'ready' || tg.isReady) {
            tg.ready()
          }
          
          // Пробуем получить данные из initDataUnsafe
          if (tg.initDataUnsafe?.user) {
            const user = tg.initDataUnsafe.user
            const name = user.first_name || user.username || ''
            if (name) {
              setUserName(name)
              return
            }
          }
          
          // Пробуем получить данные из initData (если initDataUnsafe не работает)
          if (tg.initData) {
            try {
              const params = new URLSearchParams(tg.initData)
              const userStr = params.get('user')
              if (userStr) {
                const user = JSON.parse(decodeURIComponent(userStr))
                const name = user.first_name || user.username || ''
                if (name) {
                  setUserName(name)
                  return
                }
              }
            } catch (e) {
              // Игнорируем ошибки парсинга
            }
          }
        }
      } catch (error) {
        console.error('Ошибка при получении данных пользователя:', error)
      }
    }
    
    // Пробуем получить имя сразу
    getUserName()
    
    // Если не получилось, пробуем через небольшую задержку (Telegram WebApp может инициализироваться асинхронно)
    const timeout1 = setTimeout(() => {
      getUserName()
    }, 500)
    
    // Еще одна попытка через секунду
    const timeout2 = setTimeout(() => {
      getUserName()
    }, 1000)
    
    // Также слушаем событие готовности WebApp
    const tg = window.Telegram?.WebApp
    if (tg) {
      tg.ready()
      tg.expand()
      
      // Слушаем событие viewportChanged (когда WebApp полностью загружен)
      if (tg.onEvent) {
        tg.onEvent('viewportChanged', getUserName)
      }
    }
    
    return () => {
      clearTimeout(timeout1)
      clearTimeout(timeout2)
    }
  }, [])

  const handleHeaderAvatarClick = () => {
    if (onAvatarClick) {
      onAvatarClick()
    } else {
      onBack()
    }
  }

  const handleConsultation = () => {
    if (onDiagnostics) onDiagnostics()
  }

  const handleHeaderHomeClick = () => {
    if (onHomeClick) onHomeClick()
  }

  const handleArtifactClick = (artifact) => {
    setSelectedArtifact(artifact)
    
    // Для свечи - переключаем темный режим
    if (artifact === 'candle') {
      setIsDarkMode(true)
    } else {
      setIsDarkMode(false)
    }

    // Плавная прокрутка к action-zone
    setTimeout(() => {
      const actionZone = document.getElementById('action-zone')
      if (actionZone) {
        actionZone.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  }

  const handleBackToTable = () => {
    // Сначала сбрасываем состояние
    setSelectedArtifact(null)
    setIsDarkMode(false)
    
    // Восстанавливаем фон немедленно
    const container = document.querySelector('.alchemy-container')
    const heroBackground = heroBackgroundRef.current || document.querySelector('.alchemy-hero-background')
    
    if (container) {
      container.classList.remove('dark-mode')
      // Удаляем inline стили, чтобы CSS правила применились
      container.style.removeProperty('background')
    }
    
    if (heroBackground) {
      // Удаляем inline стили, чтобы CSS правила применились
      heroBackground.style.removeProperty('opacity')
      heroBackground.style.removeProperty('filter')
      heroBackground.style.removeProperty('brightness')
    }
    
    // Прокручиваем наверх
    window.scrollTo({ top: 0, behavior: 'smooth' })
    
    // Дополнительная проверка после небольшой задержки для гарантии
    setTimeout(() => {
      if (container) {
        container.classList.remove('dark-mode')
        container.style.removeProperty('background')
      }
      if (heroBackground) {
        heroBackground.style.removeProperty('opacity')
        heroBackground.style.removeProperty('filter')
        heroBackground.style.removeProperty('brightness')
      }
    }, 50)
  }

  const handleAskEternity = () => {
    // Здесь можно добавить логику обработки вопроса
    alert('Ваш вопрос отправлен во Вселенную: ' + userQuestion)
    setUserQuestion('')
  }

  const handleGetAdvice = () => {
    const advice = [
      'Сегодня день для новых начинаний. Доверьтесь своей интуиции.',
      'Прислушайтесь к внутреннему голосу - он знает правильный путь.',
      'Ваши мысли материализуются. Думайте позитивно.',
      'Сегодня идеальное время для творчества и самовыражения.',
      'Окружите себя людьми, которые вдохновляют вас на великие дела.'
    ]
    const randomAdvice = advice[Math.floor(Math.random() * advice.length)]
    alert(randomAdvice)
  }


  const handlePlayNovella = () => {
    setShowNovella(true)
    // Здесь можно добавить логику для открытия новеллы
  }

  const handleDrawTarotCard = (cardNumber) => {
    const cards = [
      'Карта 1: Путешествие в неизвестность ждет вас. Будьте готовы к переменам.',
      'Карта 2: Внутренняя сила поможет преодолеть препятствия. Доверьтесь себе.',
      'Карта 3: Новая возможность откроется перед вами. Будьте внимательны к знакам.'
    ]
    setTarotCard(cards[cardNumber - 1])
  }

  const handleAccelerateTime = () => {
    if (!numberInput) {
      alert('Пожалуйста, введите число минут')
      return
    }
    alert(`Время ускорено на ${numberInput} минут! Вы чувствуете, как энергия течет быстрее.`)
    setNumberInput('')
  }

  const handleDrinkElixir = () => {
    const knowledge = [
      'Знание: Истинная мудрость приходит через опыт, а не через знание фактов.',
      'Знание: Каждый человек - учитель в вашей жизни, даже если урок болезненный.',
      'Знание: Прошлое нельзя изменить, но будущее зависит от ваших действий сегодня.',
      'Знание: Внутренний покой - это не отсутствие шторма, а умение танцевать под дождем.',
      'Знание: Ваши мысли создают вашу реальность - выбирайте их мудро.'
    ]
    const randomKnowledge = knowledge[Math.floor(Math.random() * knowledge.length)]
    alert(randomKnowledge)
  }

  const handleSelectAmulet = (amuletType) => {
    const amulets = {
      protection: 'Амулет Защиты активирован! Вы чувствуете невидимый щит вокруг себя.',
      power: 'Руна Силы пробуждена! Ваша внутренняя энергия возрастает.',
      health: 'Оберег Здоровья активирован! Вы чувствуете прилив жизненных сил.'
    }
    alert(amulets[amuletType])
  }

  // Эффект параллакса при прокрутке
  useEffect(() => {
    const handleScroll = () => {
      if (heroBackgroundRef.current) {
        const scrolled = window.pageYOffset
        const parallaxSpeed = 0.5
        heroBackgroundRef.current.style.transform = `translateY(${scrolled * parallaxSpeed}px)`
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Эффект для восстановления фона при сбросе темного режима
  useEffect(() => {
    if (!isDarkMode) {
      // Когда темный режим выключен, восстанавливаем фон
      const container = document.querySelector('.alchemy-container')
      const heroBackground = heroBackgroundRef.current || document.querySelector('.alchemy-hero-background')
      
      if (container) {
        container.classList.remove('dark-mode')
        // Принудительно удаляем все inline стили, чтобы CSS правила применились
        container.style.removeProperty('background')
      }
      
      if (heroBackground) {
        // Принудительно удаляем inline стили, чтобы CSS правила применились
        heroBackground.style.removeProperty('opacity')
        heroBackground.style.removeProperty('filter')
        heroBackground.style.removeProperty('brightness')
      }
    }
  }, [isDarkMode])

  // Рендер динамического контента в зависимости от выбранного артефакта
  const renderActionContent = () => {
    if (!selectedArtifact) {
      return (
        <div className="action-zone-default">
          <p className="action-zone-text">Выберите артефакт на столе, чтобы начать.</p>
        </div>
      )
    }

    switch (selectedArtifact) {
      case 'mirror':
        return (
          <div className="action-zone-content">
            <h2 className="action-zone-title">Врата Вечности</h2>
            <p className="action-zone-text">
              Зеркало отражает не только реальность, но и бесконечные просторы космоса. Задайте свой вопрос и получите ответ от вселенского разума.
            </p>
            <div className="action-zone-input-group">
              <input
                type="text"
                className="action-zone-input"
                placeholder="Ваш вопрос..."
                value={userQuestion}
                onChange={(e) => setUserQuestion(e.target.value)}
              />
              <button className="action-zone-button" onClick={handleAskEternity}>
                Спросить Вечность
              </button>
            </div>
          </div>
        )

      case 'crystal':
        return (
          <div className="action-zone-content">
            <h2 className="action-zone-title">Кристалл Мудрости</h2>
            <p className="action-zone-text">
              Этот кристалл способен фокусировать ментальную энергию. Нажмите, чтобы получить краткое послание или совет на день.
            </p>
            <button className="action-zone-button" onClick={handleGetAdvice}>
              Получить совет
            </button>
          </div>
        )

      case 'astrolabe':
        return (
          <div className="action-zone-content">
            <h2 className="action-zone-title">Космический Путеводитель</h2>
            <p className="action-zone-text">
              Астролябия позволяет вычислить влияние звезд на вашу судьбу. Введите дату, чтобы узнать свое предназначение.
            </p>
            <div className="matrix-calculator-wrapper">
              <MatrixCalculator />
            </div>
          </div>
        )

      case 'candle':
        return (
          <div className="action-zone-content">
            <h2 className="action-zone-title">Пламя Тайн</h2>
            <p className="action-zone-text">
              Свеча выключена. Во тьме открываются скрытые истины. Прислушайтесь к тишине...
            </p>
          </div>
        )

      case 'snitch':
        return (
          <div className="action-zone-content">
            <h2 className="action-zone-title">Поиграем</h2>
            <p className="action-zone-text">Выберите игру</p>
            <button className="action-zone-button" onClick={handlePlayNovella}>
              Новелла
            </button>
          </div>
        )

      case 'tarot':
        return (
          <div className="action-zone-content">
            <h2 className="action-zone-title">Расклад Судьбы</h2>
            <p className="action-zone-text">
              Выберите одну из карт, чтобы узнать о событиях ближайшего будущего.
            </p>
            <div className="tarot-cards-container">
              <button className="tarot-card-button" onClick={() => handleDrawTarotCard(1)}>
                Тянуть карту 1
              </button>
              <button className="tarot-card-button" onClick={() => handleDrawTarotCard(2)}>
                Тянуть карту 2
              </button>
              <button className="tarot-card-button" onClick={() => handleDrawTarotCard(3)}>
                Тянуть карту 3
              </button>
            </div>
            {tarotCard && (
              <div className="tarot-result">
                <p>{tarotCard}</p>
              </div>
            )}
          </div>
        )

      case 'hourglass':
        return (
          <div className="action-zone-content">
            <h2 className="action-zone-title">Ускоритель Времени</h2>
            <p className="action-zone-text">
              Песочные часы позволяют управлять потоком времени. Введите число минут, чтобы ускорить ожидание или медитацию.
            </p>
            <div className="action-zone-input-group">
              <input
                type="number"
                className="action-zone-input"
                placeholder="Число минут"
                value={numberInput}
                onChange={(e) => setNumberInput(e.target.value)}
                min="1"
              />
              <button className="action-zone-button" onClick={handleAccelerateTime}>
                Ускорить Время
              </button>
            </div>
          </div>
        )

      case 'chalice':
        return (
          <div className="action-zone-content">
            <h2 className="action-zone-title">Эликсир Озарения</h2>
            <p className="action-zone-text">
              Изумрудный эликсир открывает скрытые знания. Нажмите, чтобы "выпить" глоток и получить тайное знание.
            </p>
            <button className="action-zone-button" onClick={handleDrinkElixir}>
              Выпить Эликсир
            </button>
          </div>
        )

      case 'amulets':
        return (
          <div className="action-zone-content">
            <h2 className="action-zone-title">Обереги и Заклинания</h2>
            <p className="action-zone-text">
              Амулеты даруют защиту, а руны открывают древние заклинания. Выберите оберег или руну, чтобы узнать её силу.
            </p>
            <div className="amulets-container">
              <button className="amulet-button" onClick={() => handleSelectAmulet('protection')}>
                Амулет Защиты
              </button>
              <button className="amulet-button" onClick={() => handleSelectAmulet('power')}>
                Руна Силы
              </button>
              <button className="amulet-button" onClick={() => handleSelectAmulet('health')}>
                Оберег Здоровья
              </button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className={`alchemy-container ${isDarkMode ? 'dark-mode' : ''}`}>
      <Header 
        onAvatarClick={handleHeaderAvatarClick}
        onConsultation={handleConsultation}
        onBack={onBack}
        onAlchemyClick={() => {}}
        onHomeClick={handleHeaderHomeClick}
        activeMenuId="alchemy"
      />
      
      {/* Hero Section с фоном */}
      <div className="alchemy-hero">
        <div className="alchemy-hero-background" ref={heroBackgroundRef}></div>

        {/* Интерактивные кликабельные зоны */}
        {!selectedArtifact && (
        <div className="alchemy-interactive-zones">
          {/* Зеркало - верхняя часть */}
          <div 
            className="artifact-zone artifact-mirror" 
            onClick={() => handleArtifactClick('mirror')}
            title="Зеркало"
          ></div>

          {/* Кристалл - верхняя правая часть */}
          <div 
            className="artifact-zone artifact-crystal" 
            onClick={() => handleArtifactClick('crystal')}
            title="Кристалл"
          ></div>

          {/* Астролябия - центральный объект */}
          <div 
            className="artifact-zone artifact-astrolabe" 
            onClick={() => handleArtifactClick('astrolabe')}
            title="Астролябия"
          ></div>

          {/* Свеча - левая средняя часть */}
          <div 
            className="artifact-zone artifact-candle" 
            onClick={() => handleArtifactClick('candle')}
            title="Свеча"
          ></div>

          {/* Снитч - правая средняя часть */}
          <div 
            className="artifact-zone artifact-snitch" 
            onClick={() => handleArtifactClick('snitch')}
            title="Снитч"
          ></div>

          {/* Карты Таро - левая нижняя часть */}
          <div 
            className="artifact-zone artifact-tarot" 
            onClick={() => handleArtifactClick('tarot')}
            title="Карты Таро"
          ></div>

          {/* Песочные часы - центральная нижняя часть */}
          <div 
            className="artifact-zone artifact-hourglass" 
            onClick={() => handleArtifactClick('hourglass')}
            title="Песочные часы"
          ></div>

          {/* Чаша - правая нижняя часть */}
          <div 
            className="artifact-zone artifact-chalice" 
            onClick={() => handleArtifactClick('chalice')}
            title="Чаша"
          ></div>

          {/* Амулеты/Руны - самый низ */}
          <div 
            className="artifact-zone artifact-amulets" 
            onClick={() => handleArtifactClick('amulets')}
            title="Амулеты и Руны"
          ></div>
        </div>
        )}
        
        {/* Приветствие - внизу, чтобы не загораживать артефакты */}
        <div className="alchemy-hero-greeting">
          <h1 className="alchemy-hero-title">
            {userName ? `Добро пожаловать, ${userName}!` : 'Добро пожаловать!'}
          </h1>
          {!selectedArtifact && (
            <p className="alchemy-hero-subtitle">
              Выберите артефакт на столе, чтобы начать.
            </p>
          )}
        </div>
      </div>

      {/* Секция действий */}
      {selectedArtifact && (
        <section id="action-zone" className="action-zone">
          <div className="action-zone-inner">
            {renderActionContent()}
          </div>
          <button className="back-to-table-button" onClick={handleBackToTable}>
            Вернуться к столу
          </button>
        </section>
      )}
    </div>
  )
}

export default Alchemy
