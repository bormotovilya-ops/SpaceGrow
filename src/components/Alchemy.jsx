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
  const [showWelcome, setShowWelcome] = useState(true) // Показывать "Добро пожаловать" первые 5 секунд
  const [mirrorMessages, setMirrorMessages] = useState([]) // Сообщения чата зеркала
  const [mirrorInput, setMirrorInput] = useState('') // Текст в поле ввода зеркала
  const [isLoadingMirror, setIsLoadingMirror] = useState(false) // Загрузка ответа зеркала
  const [mirrorUserName, setMirrorUserName] = useState('Путник') // Имя для зеркала (только first name)
  const [isMuted, setIsMuted] = useState(() => {
    // Загружаем состояние из localStorage
    const saved = localStorage.getItem('alchemy-music-muted')
    return saved === 'true'
  })
  const [debugMode, setDebugMode] = useState(() => {
    // Загружаем состояние режима отладки из localStorage
    const saved = localStorage.getItem('alchemy-debug-mode')
    return saved === 'true'
  })
  const [candleImageError, setCandleImageError] = useState(false)
  const heroBackgroundRef = useRef(null)
  const audioRef = useRef(null)
  const fadeIntervalRef = useRef(null)
  const userInteractedRef = useRef(false)
  const imageContainerRef = useRef(null)
  const imageAspectRef = useRef(9 / 16) // Реальное соотношение сторон фоновой картинки (обновим после загрузки)

  // Получаем имя пользователя из Telegram
  useEffect(() => {
    // Проверяем, что скрипт Telegram WebApp подключен
    if (window.Telegram && window.Telegram.WebApp) {
      const webapp = window.Telegram.WebApp
      
      // Сообщаем Telegram, что приложение готово
      webapp.ready()
      
      // Получаем данные пользователя
      const user = webapp.initDataUnsafe?.user
      
      if (user) {
        const firstName = user.first_name || ''
        const lastName = user.last_name || ''
        const username = user.username || ''
        
        // Используем first_name, если есть, иначе username, иначе "Путник"
        const name = firstName || username || 'Путник'
        setUserName(name)
        
        // Для зеркала используем только имя (first name), без фамилии
        setMirrorUserName(firstName || username || 'Путник')
      } else {
        // Если приложение запущено в браузере (вне Telegram), используем дефолтное имя
        setUserName('Путник')
        setMirrorUserName('Путник')
      }
    } else {
      // Если Telegram WebApp не доступен (браузер), используем дефолтное имя
      setUserName('Путник')
      setMirrorUserName('Путник')
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
    
    // Очищаем сообщения зеркала при возврате к столу
    setMirrorMessages([])
    setMirrorInput('')
    
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

  // Функция для очистки markdown-символов из ответа зеркала
  const cleanMirrorResponse = (text) => {
    if (!text) return text
    
    // Убираем markdown-символы
    let cleaned = text
      .replace(/\*\*/g, '') // Убираем **
      .replace(/###/g, '') // Убираем ###
      .replace(/\|\|/g, '') // Убираем ||
      .replace(/-----+/g, '') // Убираем ----- и более
      .replace(/---+/g, '') // Убираем --- и более
      .trim()
    
    return cleaned
  }

  const handleMirrorSend = async () => {
    if (!mirrorInput.trim() || isLoadingMirror) return

    const userQuestion = mirrorInput.trim()
    setMirrorInput('')

    console.log('💬 Отправка сообщения зеркалу:', userQuestion)
    
    // Добавляем вопрос пользователя
    setMirrorMessages(prev => [...prev, { role: 'user', content: userQuestion }])
    setIsLoadingMirror(true)

    try {
      // Считаем количество сообщений пользователя (только user сообщения)
      const userMessageCount = mirrorMessages.filter(msg => msg.role === 'user').length + 1
      
      console.log('📡 Отправка запроса к /api/chat...', { messageCount: userMessageCount, promptType: 'mirror', userName })
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: userQuestion,
          messageCount: userMessageCount,
          promptType: 'mirror',
          userName: mirrorUserName || 'Путник'
        }),
      })

      console.log('📊 Ответ получен:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Не удалось прочитать ошибку')
        console.error('❌ Ошибка ответа сервера:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        })
        
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch (e) {
          errorData = { error: errorText || `Ошибка сервера (статус: ${response.status})` }
        }
        
        console.error('❌ Parsed error data:', errorData)
        let errorMessage = errorData.error || 'Извините, произошла ошибка.'
        
        // Более понятные сообщения для пользователя
        if (errorMessage.includes('API key') || errorMessage.includes('authentication') || errorMessage.includes('401')) {
          errorMessage = 'Ошибка авторизации. Проверьте, что токен Groq указан правильно в файле .env'
        } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
          errorMessage = 'Превышен лимит запросов. Попробуйте позже.'
        } else if (errorMessage.includes('model') || errorMessage.includes('404') || errorMessage.includes('not found')) {
          errorMessage = 'Временно недоступно. Используется режим заглушки.'
        } else if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('Failed to fetch') || errorMessage.includes('Network')) {
          errorMessage = 'Не удалось подключиться к серверу. Убедитесь, что локальный сервер запущен (npm run dev:server).'
        }
        
        setMirrorMessages(prev => [...prev, {
          role: 'assistant',
          content: `${errorMessage} Если проблема сохраняется, свяжитесь напрямую: @ilyaborm в Telegram.`
        }])
        setIsLoadingMirror(false)
        return
      }

      const data = await response.json()
      console.log('✅ Данные получены:', {
        hasResponse: !!data.response,
        responseLength: data.response?.length,
        responsePreview: data.response?.substring(0, 100) + '...',
        source: data.source || 'unknown'
      })
      if (data.source) {
        console.log('📊 Источник ответа:', data.source === 'groq' ? '✅ Groq API' : '⚠️ Заглушка (mock)')
      }

      if (data.response) {
        // Очищаем ответ от markdown-символов
        const cleanedResponse = cleanMirrorResponse(data.response)
        console.log('🧹 Очищенный ответ:', cleanedResponse.substring(0, 100) + '...')
        setMirrorMessages(prev => [...prev, { role: 'assistant', content: cleanedResponse }])
      } else {
        console.warn('⚠️ Нет поля response в ответе:', data)
        setMirrorMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Не удалось получить ответ. Попробуйте еще раз или свяжитесь напрямую: @ilyaborm в Telegram.'
        }])
      }
    } catch (error) {
      console.error('❌ Network Error:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
      setMirrorMessages(prev => [...prev, {
        role: 'assistant',
        content: `Не удалось подключиться к серверу. Убедитесь, что локальный сервер запущен (npm run dev:server). Ошибка: ${error.message}`
      }])
    } finally {
      setIsLoadingMirror(false)
      console.log('✅ Запрос завершен')
    }
  }

  const handleMirrorKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleMirrorSend()
    }
  }

  // Автоматическая прокрутка к последнему сообщению
  const mirrorMessagesEndRef = useRef(null)

  useEffect(() => {
    if (mirrorMessagesEndRef.current) {
      mirrorMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [mirrorMessages, isLoadingMirror])

  // Сброс сообщений зеркала при возврате к столу
  useEffect(() => {
    if (!selectedArtifact || selectedArtifact !== 'mirror') {
      setMirrorMessages([])
      setMirrorInput('')
    }
  }, [selectedArtifact])

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

  // Загрузка фонового изображения для получения реального соотношения сторон
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        imageAspectRef.current = img.naturalWidth / img.naturalHeight
        // Форсируем перерасчёт зоны после получения точного соотношения
        window.dispatchEvent(new Event('resize'))
      }
    }
    img.src = '/images/i.webp'
  }, [])

  // Вычисление размера видимой области картинки и привязка блоков к ней
  useEffect(() => {
    const updateImageBounds = () => {
      const container = imageContainerRef.current
      const background = heroBackgroundRef.current
      const interactiveZones = document.querySelector('.alchemy-interactive-zones')
      
      if (!container || !background || !interactiveZones) return

      const containerRect = container.getBoundingClientRect()
      const containerWidth = containerRect.width
      const containerHeight = containerRect.height
      
      // Проверяем, что размеры контейнера валидны
      if (containerWidth === 0 || containerHeight === 0) return
      
      const containerAspect = containerWidth / containerHeight
      
      // Пропорции картинки — берём реальные значения после загрузки
      const imageAspect = imageAspectRef.current || (9 / 16)
      
      let imageWidth, imageHeight, imageLeft, imageTop
      
      // Вычисляем размеры видимой области картинки при background-size: contain
      if (containerAspect > imageAspect) {
        // Контейнер шире - картинка заполняет по высоте
        imageHeight = containerHeight
        imageWidth = imageHeight * imageAspect
        imageLeft = (containerWidth - imageWidth) / 2
        imageTop = 0
      } else {
        // Контейнер выше - картинка заполняет по ширине
        imageWidth = containerWidth
        imageHeight = imageWidth / imageAspect
        imageLeft = 0
        imageTop = (containerHeight - imageHeight) / 2
      }
      
      // Применяем размеры и позицию к контейнеру интерактивных зон
      interactiveZones.style.width = `${imageWidth}px`
      interactiveZones.style.height = `${imageHeight}px`
      interactiveZones.style.left = `${imageLeft}px`
      interactiveZones.style.top = `${imageTop}px`
      interactiveZones.style.position = 'absolute'
    }

    // Обновляем при загрузке и изменении размера
    updateImageBounds()
    window.addEventListener('resize', updateImageBounds)
    
    // Для Telegram WebView на десктопе добавляем дополнительные триггеры
    const isTelegramWebView = window.Telegram?.WebApp || window.TelegramWebApp
    if (isTelegramWebView) {
      // Подписываемся на события изменения viewport в Telegram
      if (window.Telegram?.WebApp?.onEvent) {
        window.Telegram.WebApp.onEvent('viewportChanged', updateImageBounds)
      }
    }
    
    // Обновляем после небольших задержек для гарантии загрузки картинки
    const timeoutId = setTimeout(updateImageBounds, 100)
    const timeoutId2 = setTimeout(updateImageBounds, 500) // Дополнительная задержка для мобильных
    const timeoutId3 = setTimeout(updateImageBounds, 1000) // Дополнительная задержка для Telegram WebView на десктопе
    
    return () => {
      window.removeEventListener('resize', updateImageBounds)
      clearTimeout(timeoutId)
      clearTimeout(timeoutId2)
      clearTimeout(timeoutId3)
      
      // Отписываемся от событий Telegram
      if (isTelegramWebView && window.Telegram?.WebApp?.offEvent) {
        window.Telegram.WebApp.offEvent('viewportChanged', updateImageBounds)
      }
    }
  }, [selectedArtifact]) // Пересчитываем при изменении выбранного артефакта

  // Логика анимации и позиционирования старого пламени удалена —
  // теперь используется готовое анимированное изображение свечи поверх стола.

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

  // Управление фоновой музыкой
  useEffect(() => {
    // Создаем аудио объект
    if (!audioRef.current) {
      audioRef.current = new Audio('/musik/fon.mp3')
      audioRef.current.loop = true
      audioRef.current.volume = 0
      audioRef.current.preload = 'auto'
    }

    const audio = audioRef.current

    // Функция для запуска музыки с fade-in
    const startMusic = (targetVolume = 0.5, fadeDuration = 3000) => {
      // Запускаем музыку
      audio.play().catch(err => {
        console.log('Ошибка воспроизведения музыки:', err)
        // Если не удалось запустить (например, из-за политики браузера),
        // пробуем после первого взаимодействия
        if (!userInteractedRef.current) {
          const handleFirstInteraction = () => {
            userInteractedRef.current = true
            audio.play().catch(e => console.log('Ошибка воспроизведения после взаимодействия:', e))
            startFadeIn(targetVolume, fadeDuration)
          }
          const events = ['click', 'touchstart', 'keydown']
          events.forEach(event => {
            document.addEventListener(event, handleFirstInteraction, { once: true, passive: true })
          })
          return
        }
      })

      // Запускаем fade-in
      startFadeIn(targetVolume, fadeDuration)
    }

    // Функция для плавного fade-in/out
    const startFadeIn = (targetVolume, duration) => {
      // Останавливаем предыдущий fade, если есть
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current)
        fadeIntervalRef.current = null
      }

      // Минимальная длительность шага - 16мс (один кадр при 60fps)
      const minStepDuration = 16
      const steps = Math.max(30, Math.floor(duration / minStepDuration)) // Минимум 30 шагов
      const stepDuration = Math.max(minStepDuration, duration / steps)
      
      const startVolume = audio.volume
      const volumeDiff = targetVolume - startVolume
      const volumeStep = volumeDiff / steps
      
      let currentStep = 0
      const startTime = Date.now()
      
      fadeIntervalRef.current = setInterval(() => {
        currentStep++
        const elapsed = Date.now() - startTime
        const progress = Math.min(1, elapsed / duration)
        
        // Вычисляем новую громкость на основе прогресса
        const newVolume = startVolume + (volumeDiff * progress)
        
        // Устанавливаем громкость с ограничением
        if (targetVolume > startVolume) {
          audio.volume = Math.min(targetVolume, Math.max(0, newVolume))
        } else {
          audio.volume = Math.max(targetVolume, Math.min(1, newVolume))
        }
        
        // Завершаем, если достигли целевой громкости или прошло достаточно времени
        if (progress >= 1 || 
            Math.abs(audio.volume - targetVolume) < 0.01) {
          audio.volume = targetVolume
          if (fadeIntervalRef.current) {
            clearInterval(fadeIntervalRef.current)
            fadeIntervalRef.current = null
          }
          
          // Если громкость стала 0 (mute), останавливаем музыку
          if (targetVolume === 0 && audio.volume <= 0.01) {
            audio.pause()
            audio.currentTime = 0
          }
        }
      }, stepDuration)
    }

    // Если не muted, пытаемся запустить музыку сразу при монтировании
    // (но это может не сработать из-за политики браузера)
    if (!isMuted && !userInteractedRef.current) {
      // Не устанавливаем userInteractedRef здесь - дождемся реального взаимодействия
      // Просто пытаемся запустить, если получится
      startMusic(0.5, 3000)
    }

    // Управление громкостью при изменении isMuted
    if (userInteractedRef.current) {
      const targetVolume = isMuted ? 0 : 0.5
      
      // Если включаем музыку (unmute)
      if (!isMuted) {
        if (audio.paused || audio.ended) {
          // Если музыка на паузе или закончилась, запускаем заново
          audio.currentTime = 0
          
          // Пытаемся запустить музыку
          const playPromise = audio.play()
          
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                // Музыка успешно запущена, начинаем fade-in
                console.log('Музыка успешно запущена, начинаем fade-in')
                startFadeIn(targetVolume, 3000)
              })
              .catch(err => {
                console.log('Ошибка воспроизведения музыки при включении:', err)
                // Пробуем еще раз после небольшой задержки
                setTimeout(() => {
                  audio.play()
                    .then(() => {
                      console.log('Музыка запущена после повтора, начинаем fade-in')
                      startFadeIn(targetVolume, 3000)
                    })
                    .catch(e => console.log('Повторная ошибка воспроизведения:', e))
                }, 200)
              })
      } else {
            // Для старых браузеров, где play() не возвращает промис
            console.log('Браузер не поддерживает промис от play(), начинаем fade-in')
            startFadeIn(targetVolume, 3000)
          }
        } else {
          // Если музыка уже играет, просто увеличиваем громкость
          console.log('Музыка уже играет, увеличиваем громкость')
          startFadeIn(targetVolume, 500)
        }
      } else {
        // Если выключаем музыку (mute), уменьшаем громкость до 0
        // Музыка остановится автоматически в startFadeIn когда volume достигнет 0
        console.log('Выключаем музыку, уменьшаем громкость')
        startFadeIn(targetVolume, 500)
      }
    }

    // Очистка при размонтировании компонента (не при изменении isMuted)
    // Это нужно только когда компонент полностью размонтируется
    return () => {
      // Останавливаем fade интервал
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current)
        fadeIntervalRef.current = null
      }
      // Останавливаем музыку при размонтировании компонента (переход на другой раздел)
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
        audioRef.current.volume = 0
      }
    }
  }, [isMuted])

  // Сохранение состояния mute в localStorage
  useEffect(() => {
    localStorage.setItem('alchemy-music-muted', String(isMuted))
  }, [isMuted])

  // Обработчик переключения mute/unmute
  const handleToggleMute = () => {
    // Отмечаем, что пользователь взаимодействовал
    userInteractedRef.current = true
    // Просто меняем состояние - вся логика управления музыкой в useEffect
    setIsMuted(prev => !prev)
  }

  // Обработчик переключения режима отладки
  const handleToggleDebug = () => {
    setDebugMode(prev => !prev)
  }

  // Сохранение состояния debug mode в localStorage
  useEffect(() => {
    localStorage.setItem('alchemy-debug-mode', String(debugMode))
  }, [debugMode])

  // Скрываем "Добро пожаловать" через 5 секунд
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWelcome(false)
    }, 5000) // 5 секунд

    return () => clearTimeout(timer)
  }, [])

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
        // Приветственное сообщение от зеркала (показываем только если нет других сообщений)
        const welcomeMessage = mirrorMessages.length === 0 ? {
          role: 'assistant',
          content: `Врата Вечности открыты. Зеркало отражает не только реальность, но и бесконечные просторы космоса. Задай свой вопрос, ${mirrorUserName}, и получи ответ от вселенского разума.`
        } : null

        return (
          <div className="action-zone-content action-zone-mirror">
            <h2 className="action-zone-title">Зеркало вечности</h2>
            {/* Диалог с зеркалом */}
            <div className="mirror-dialog-messages">
              {welcomeMessage && (
                <div className="mirror-message mirror-message-assistant visible">
                  <p>{welcomeMessage.content}</p>
                </div>
              )}
              {mirrorMessages.map((msg, index) => (
                <div key={index} className={`mirror-message ${msg.role === 'user' ? 'mirror-message-user' : 'mirror-message-assistant'}`}>
                  <p>{msg.content}</p>
                </div>
              ))}
              
              {isLoadingMirror && (
                <div className="mirror-message mirror-message-assistant">
                  <p className="typing-indicator">
                    <span className="typing-dot">.</span>
                    <span className="typing-dot">.</span>
                    <span className="typing-dot">.</span>
                  </p>
                </div>
              )}
              <div ref={mirrorMessagesEndRef} />
            </div>
            
            {/* Поле ввода для вопросов */}
            <div className="mirror-input-container">
              <input
                type="text"
                className="mirror-input"
                placeholder="Ваш вопрос..."
                value={mirrorInput}
                onChange={(e) => setMirrorInput(e.target.value)}
                onKeyPress={handleMirrorKeyPress}
                onFocus={() => {
                  const actionZone = document.getElementById('action-zone')
                  if (actionZone) {
                    actionZone.classList.add('input-focused')
                  }
                }}
                onBlur={() => {
                  const actionZone = document.getElementById('action-zone')
                  if (actionZone) {
                    actionZone.classList.remove('input-focused')
                  }
                }}
                disabled={isLoadingMirror}
              />
              <button
                className="mirror-send-btn"
                onClick={handleMirrorSend}
                disabled={!mirrorInput.trim() || isLoadingMirror}
                aria-label="Отправить"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
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
            <h2 className="action-zone-title">Код Мироздания</h2>
            <p className="action-zone-text">
              Астролябия синхронизирует влияние звезд, чисел и вашей психоматрицы. Введите дату рождения, чтобы расшифровать свое предназначение через систему древних и цифровых знаний.
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
                onFocus={() => {
                  const actionZone = document.getElementById('action-zone')
                  if (actionZone) {
                    actionZone.classList.add('input-focused')
                  }
                }}
                onBlur={() => {
                  const actionZone = document.getElementById('action-zone')
                  if (actionZone) {
                    actionZone.classList.remove('input-focused')
                  }
                }}
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
    <div className={`alchemy-container ${isDarkMode ? 'dark-mode' : ''} ${debugMode ? 'debug-mode' : ''}`}>
      <Header 
        onAvatarClick={handleHeaderAvatarClick}
        onConsultation={handleConsultation}
        onBack={onBack}
        onAlchemyClick={() => {}}
        onHomeClick={handleHeaderHomeClick}
        activeMenuId="alchemy"
      />
      
      {/* Кнопка управления музыкой */}
      <button 
        className="alchemy-music-toggle"
        onClick={handleToggleMute}
        title={isMuted ? 'Включить музыку' : 'Выключить музыку'}
        aria-label={isMuted ? 'Включить музыку' : 'Выключить музыку'}
      >
        {isMuted ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16.5 12C16.5 10.23 15.48 8.71 14 7.97V10.18L16.45 12.63C16.48 12.43 16.5 12.22 16.5 12Z" fill="currentColor"/>
            <path d="M19 12C19 12.94 18.8 13.82 18.46 14.64L19.97 16.15C20.63 14.91 21 13.5 21 12C21 7.72 18.01 4.14 14 3.23V5.29C16.89 6.15 19 8.83 19 12ZM4.27 3L3 4.27L7.73 9H3V15H7L12 20V13.27L16.25 17.53C15.58 18.04 14.83 18.46 14 18.7V20.77C15.38 20.45 16.63 19.82 17.68 18.96L19.73 21L21 19.73L12 10.73L4.27 3ZM12 4L9.91 6.09L12 8.18V4Z" fill="currentColor"/>
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 9V15H7L12 20V4L7 9H3ZM16.5 12C16.5 10.23 15.48 8.71 14 7.97V16.02C15.48 15.29 16.5 13.77 16.5 12ZM14 3.23V5.29C16.89 6.15 19 8.83 19 12C19 15.17 16.89 17.85 14 18.71V20.77C18.01 19.86 21 16.28 21 12C21 7.72 18.01 4.14 14 3.23Z" fill="currentColor"/>
          </svg>
        )}
      </button>

      
      {/* Hero Section с фоном */}
      <div className="alchemy-hero">
        {/* Контейнер для фонового изображения, анимированной свечи и интерактивных зон */}
        <div className="alchemy-image-container" ref={imageContainerRef}>
          {/* Черный фон для заполнения пустых областей */}
          <div className="alchemy-background-fill"></div>
          {/* Картинка */}
          <div className="alchemy-hero-background" ref={heroBackgroundRef}></div>

          {/* Интерактивные кликабельные зоны - привязаны к контейнеру, который совпадает с видимой областью картинки */}
          {!selectedArtifact && (
          <div className="alchemy-interactive-zones">
            {/* Анимированная свеча поверх стола (масштабируется вместе с видимой областью фона) */}
            {!candleImageError ? (
              <img
                src="/images/Свеча.gif"
                alt="Свеча"
                className="alchemy-candle-image"
                onError={() => {
                  console.error('Failed to load Свеча.gif')
                  setCandleImageError(true)
                }}
                loading="lazy"
              />
            ) : (
              <div className="alchemy-candle-image" style={{
                background: 'radial-gradient(circle, rgba(255, 170, 0, 0.8) 0%, rgba(255, 100, 0, 0.4) 50%, transparent 100%)',
                borderRadius: '50%',
                filter: 'blur(8px)',
                pointerEvents: 'none'
              }} />
            )}
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
              title="Кристалл Мудрости"
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

            {/* Карты - левая нижняя часть */}
            <div 
              className="artifact-zone artifact-tarot" 
              onClick={() => handleArtifactClick('tarot')}
              title="Карты"
            ></div>

            {/* Песочные часы - центральная нижняя часть */}
            <div 
              className="artifact-zone artifact-hourglass" 
              onClick={() => handleArtifactClick('hourglass')}
              title="Песочные Часы"
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
        </div>
        
        {/* Приветствие - внизу, чтобы не загораживать артефакты */}
        <div className={`alchemy-hero-greeting ${!showWelcome ? 'greeting-compact' : ''}`}>
          {showWelcome && (
            <h1 className="alchemy-hero-title">
              {userName ? `Добро пожаловать, ${userName}!` : 'Добро пожаловать!'}
            </h1>
          )}
          {!selectedArtifact && (
            <p className="alchemy-hero-subtitle">
              Выберите артефакт на столе, чтобы начать.
            </p>
          )}
        </div>
      </div>

      {/* Секция действий */}
      {selectedArtifact && (
        <section 
          id="action-zone" 
          className={`action-zone ${selectedArtifact === 'astrolabe' ? 'action-zone-astrolabe' : ''}`}
        >
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
