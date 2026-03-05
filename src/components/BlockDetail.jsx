import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import Header from './Header'
import './BlockDetail.css'
import { openTelegramChat } from '../utils/telegram'
import { yandexMetricaReachGoal } from '../analytics/yandexMetrica'
import { useLogEvent } from '../hooks/useLogEvent'

// Данные таблиц из файла "Таблицы аудитория.txt"
const tableData = {
  // Тестовая аудитория
  'traffic': {
    id: 'traffic',
    title: 'Трафик',
    table: [
      { source: 'Яндекс.Директ', what: 'Поведение на первом экране прелендинга', results: 'Осознанный вход — читает ≥50% экрана, логично продолжает путь\nСлучайный вход — быстрый скролл / выход', meaning: 'Пользователь пришёл с релевантным запросом', decision: '➡️ В приоритет / ↺ Тестировать дальше / ↺ Сменить подачу / ↺ Понизить приоритет / ↺ Усилить креатив / ↺ Прогрев / ⛔ Стоп' },
      { source: 'VK Реклама', what: 'Реакция на основной смысл и формулировку', results: 'Зацепился — отвечает на первый вопрос\nНе зацепился — закрывает', meaning: 'Креатив и сообщение попали в ожидания', decision: '➡️ В приоритет / ↺ Тестировать дальше / ↺ Сменить подачу / ↺ Понизить приоритет / ↺ Усилить креатив / ↺ Прогрев / ⛔ Стоп' },
      { source: 'Telegram-каналы', what: 'Глубина первого шага', results: 'Тёплый — проходит ≥2 шагов\nХолодный — отваливается сразу', meaning: 'Канал даёт аудиторию, готовую к анализу', decision: '➡️ В приоритет / ↺ Тестировать дальше / ↺ Сменить подачу / ↺ Понизить приоритет / ↺ Усилить креатив / ↺ Прогрев / ⛔ Стоп' },
      { source: 'Социальные сети', what: 'Готовность вступить во взаимодействие', results: 'Интерес — читает, отвечает\nРазвлечение — пролистывает', meaning: 'Канал даёт шум или нерелевантный интерес', decision: '➡️ В приоритет / ↺ Тестировать дальше / ↺ Сменить подачу / ↺ Понизить приоритет / ↺ Усилить креатив / ↺ Прогрев / ⛔ Стоп' },
      { source: 'Email / база', what: 'Готовность вступить во взаимодействие', results: 'Лояльный — кликает и взаимодействует\nПассивный — игнор', meaning: 'Есть потенциальный интерес к теме', decision: '➡️ В приоритет / ↺ Тестировать дальше / ↺ Сменить подачу / ↺ Понизить приоритет / ↺ Усилить креатив / ↺ Прогрев / ⛔ Стоп' },
      { source: 'Партнёрские переходы', what: 'Соответствие ожиданий', results: 'Совпало ожидание — идёт дальше\nНе совпало — резкий выход', meaning: 'Запрос и гипотеза находятся в резонансе', decision: '➡️ В приоритет / ↺ Тестировать дальше / ↺ Сменить подачу / ↺ Понизить приоритет / ↺ Усилить креатив / ↺ Прогрев / ⛔ Стоп' },
      { source: 'Экспериментальные источники', what: 'Соответствие ожиданий', results: 'Совпало ожидание — идёт дальше\nНе совпало — резкий выход', meaning: 'Смысл не считывается или не резонирует', decision: '➡️ В приоритет / ↺ Тестировать дальше / ↺ Сменить подачу / ↺ Понизить приоритет / ↺ Усилить креатив / ↺ Прогрев / ⛔ Стоп' }
    ],
    conclusion: 'Анализ трафика в тестовой аудитории показывает, какие источники приводят пользователей с осознанным запросом, а какие создают шум и искажают картину гипотезы. Результаты используются не для масштабирования, а для очистки входа, корректировки подачи и принятия решения о целесообразности дальнейшего тестирования каждого канала.'
  },
  'prelanding': {
    id: 'prelanding',
    title: 'Прелендинг — точка приёма и анализа',
    table: [
      { what: 'Понимание сути предложения', results: 'Сразу понял — отвечает логично и по теме\nНе понял — случайные или формальные ответы', meaning: 'Ясность или размытость формулировок', decision: '↺ Упростить / ↺ Переформулировать / ↺ Усилить смысл / ➡️ Продолжить / ⛔ Отсечь / ↺ Прогрев / ↺ Изменить формат' },
      { what: 'Считываемость смысла', results: 'Сразу понял — отвечает логично и по теме\nНе понял — случайные или формальные ответы', meaning: 'Ясность или размытость формулировок', decision: '↺ Упростить / ↺ Переформулировать / ↺ Усилить смысл / ➡️ Продолжить / ⛔ Отсечь / ↺ Прогрев / ↺ Изменить формат' },
      { what: 'Готовность продолжать', results: 'Готов идти дальше — кликает без пауз\nНе готов — зависает / выходит', meaning: 'Совпадение ожиданий с реальным запросом', decision: '↺ Упростить / ↺ Переформулировать / ↺ Усилить смысл / ➡️ Продолжить / ⛔ Отсечь / ↺ Прогрев / ↺ Изменить формат' },
      { what: 'Комфорт формата', results: 'Формат ок — взаимодействует спокойно\nФормат раздражает — закрывает', meaning: 'Готовность аудитории к диалогу', decision: '↺ Упростить / ↺ Переформулировать / ↺ Усилить смысл / ➡️ Продолжить / ⛔ Отсечь / ↺ Прогрев / ↺ Изменить формат' },
      { what: 'Первичное доверие', results: 'Доверяет — отвечает честно\nНедоверие — скипы, поверхностные ответы', meaning: 'Уровень начального доверия', decision: '↺ Упростить / ↺ Переформулировать / ↺ Усилить смысл / ➡️ Продолжить / ⛔ Отсечь / ↺ Прогрев / ↺ Изменить формат' }
    ],
    conclusion: 'Прелендинг выполняет роль первичного смыслового фильтра: проверяет, считывается ли предложение так, как задумано, и совпадает ли оно с ожиданиями пользователя. Результаты позволяют понять, проблема ли в гипотезе, формулировке или формате подачи, и принять решение — углублять анализ аудитории или останавливать пользователя на раннем этапе, не искажая данные следующих блоков.'
  },
  'analysis': {
    id: 'analysis',
    title: 'Анализ аудитории',
    table: [
      { what: 'Осознанность запроса', results: 'Осознанный — чётко формулирует проблему и ожидание результата\nРазмытый — отвечает абстрактно, уходит от сути', meaning: 'Готовность к продукту', decision: '➡️ В приоритет / ↺ Прогрев / ⛔ Оставить / ⛔ Отсечь / ↺ Адаптировать гипотезу / ⛔ Фильтр / ↺ Изменить язык' },
      { what: 'Сформированность проблемы', results: 'Осознанный — чётко формулирует проблему и ожидание результата\nРазмытый — отвечает абстрактно, уходит от сути', meaning: 'Готовность к продукту', decision: '➡️ В приоритет / ↺ Прогрев / ⛔ Оставить / ⛔ Отсечь / ↺ Адаптировать гипотезу / ⛔ Фильтр / ↺ Изменить язык' },
      { what: 'Уровень боли / значимости', results: 'Высокая значимость — подчёркивает важность\nНизкая — «просто интересно»', meaning: 'Сила мотивации', decision: '➡️ В приоритет / ↺ Прогрев / ⛔ Оставить / ⛔ Отсечь / ↺ Адаптировать гипотезу / ⛔ Фильтр / ↺ Изменить язык' },
      { what: 'Тип мышления', results: 'Аналитический — рассуждает, сравнивает\nИмпульсивный — кликает без логики', meaning: 'Тип принятия решений', decision: '➡️ В приоритет / ↺ Прогрев / ⛔ Оставить / ⛔ Отсечь / ↺ Адаптировать гипотезу / ⛔ Фильтр / ↺ Изменить язык' },
      { what: 'Язык и логика формулировок', results: 'Язык совпадает с продуктом\nНе совпадает', meaning: 'Резонанс смысла продукта', decision: '➡️ В приоритет / ↺ Прогрев / ⛔ Оставить / ⛔ Отсечь / ↺ Адаптировать гипотезу / ⛔ Фильтр / ↺ Изменить язык' }
    ],
    conclusion: 'Анализ аудитории на тестовом этапе выявляет не «кто эти люди», а как они думают и чего на самом деле хотят. Именно здесь становится ясно, есть ли у аудитории сформированный запрос, достаточная мотивация и совпадает ли её язык с логикой продукта. Это позволяет отделить потенциально целевые сегменты от случайных и понять, что именно требует доработки — гипотеза, формулировки или фильтрация.'
  },
  'routing': {
    id: 'routing',
    title: 'Маршрутизация',
    table: [
      { what: 'Поведение по ответам', results: 'Последовательное — логичные выборы\nХаотичное — случайные клики', meaning: 'Тип пользователя', decision: 'Разные маршруты для разных типов' },
      { what: 'Скорость прохождения', results: 'Ровная — без зависаний\nРваная — паузы, возвраты', meaning: 'Уровень уверенности', decision: 'Упростить / Оставить' },
      { what: 'Реакция на уточнения', results: 'Вовлекается — отвечает подробнее\nСкипает — избегает', meaning: 'Готовность к углублению', decision: 'Углубить / Сократить' },
      { what: 'Самоотсев', results: 'Сам выходит на раннем этапе\nДоходит до конца', meaning: 'Адекватность фильтра', decision: 'Фильтр работает нормально / Усилить фильтрацию' }
    ],
    conclusion: 'Маршрутизация распределяет пользователей по различным путям в зависимости от их поведения, скорости прохождения и готовности к углублению. Это позволяет оптимизировать путь каждого сегмента и минимизировать потери на этапе анализа.'
  },
  'hypothesis': {
    id: 'hypothesis',
    title: 'Вывод по гипотезе',
    table: [
      { what: 'Качество трафика', results: 'Гипотеза подтверждена', meaning: 'Есть / нет рынок', decision: '➡️ Переход к подэтапу «Рабочий»' },
      { what: 'Реакции на прелендинг', results: 'Частично подтверждена', meaning: 'Есть / нет целевая аудитория', decision: '↺ Доработка гипотезы' },
      { what: 'Характер аудитории', results: 'Не подтверждена', meaning: 'Есть / нет целевая аудитория', decision: '⛔ Остановка проекта' },
      { what: 'Прохождение маршрутизации', results: 'Гипотеза подтверждена', meaning: 'Есть / нет экономический смысл', decision: '➡️ Переход к подэтапу «Рабочий»' }
    ],
    conclusion: 'Подэтап «Тестовый» завершается управленческим решением, а не ощущением. На основе связки всех предыдущих карточек фиксируется статус продуктовой гипотезы: подтверждена, частично подтверждена или не подтверждена. Только при подтверждении возможен переход к подэтапу «Рабочий» и дальнейшим этапам воронки и продукта.'
  },
  // Рабочая аудитория
  'traffic-confirmed': {
    id: 'traffic-confirmed',
    title: 'Подтверждённые источники трафика',
    table: [
      { what: 'Стабильность потока', results: 'Надёжный — повторяется\nНестабильный / шумный', meaning: 'Канал стабилен и прогнозируем', decision: 'Масштабировать / Ограничить' },
      { what: 'Стоимость привлечения', results: 'Адекватная / высокая', meaning: 'Экономика входа понятна', decision: 'Оставить / Оптимизировать' },
      { what: 'Совместимость с продуктом', results: 'Хорошо ложится\nКонфликтует', meaning: 'Подходит продукту', decision: 'Закрепить / Исключить' },
      { what: 'Прогнозируемость', results: 'Предсказуемый поток\nСлучайный / непредсказ.', meaning: 'Поток управляем', decision: 'В приоритет / Эксперимент' }
    ],
    conclusion: 'Работа с подтверждёнными источниками трафика фокусируется на стабильности, экономике и управляемости. Каналы, показавшие надёжность и совместимость с продуктом, масштабируются и закрепляются в системе. Нестабильные или конфликтующие источники ограничиваются или исключаются.'
  },
  'segments-confirmed': {
    id: 'segments-confirmed',
    title: 'Подтверждённые сегменты аудитории',
    table: [
      { what: 'Поведенческая однородность', results: 'Чёткие повторяющиеся паттерны\nРазброс / непостоянство', meaning: 'Сегмент чётко определён', decision: 'Зафиксировать / Укрупнить' },
      { what: 'Ценность сегмента', results: 'Высокий интерес / низкий отклик', meaning: 'Потенциал для роста', decision: 'Приоритет / Вторичный' },
      { what: 'Зрелость понимания', results: 'Понимают сразу / требуют пояснений', meaning: 'Надёжность данных', decision: 'Основной / Прогрев' },
      { what: 'Масштабируемость', results: 'Можно расширять\nУзкий', meaning: 'Готовность к масштабированию', decision: 'Масштаб / Ниша' }
    ],
    conclusion: 'Подтверждённые сегменты аудитории характеризуются устойчивыми поведенческими паттернами и чёткой структурой. Анализ позволяет определить приоритетные сегменты для масштабирования и сегменты, требующие дополнительного прогрева перед продажей.'
  },
  'routing-segments': {
    id: 'routing-segments',
    title: 'Маршрутизация сегментов',
    table: [
      { what: 'Логика маршрута', results: 'Сегмент проходит логично\nПутается / сбивается', meaning: 'Корректность логики', decision: 'Закрепить / Перепроект' },
      { what: 'Длина пути', results: 'Проходит без перегрузки\nУсталость / задержки', meaning: 'Оптимальная длина пути', decision: 'Упростить / Оставить' },
      { what: 'Нагрузка на путь', results: 'Проходит без напряжения\nУсталость', meaning: 'Приоритет сегментов', decision: 'Фокус / Вторично' },
      { what: 'Ошибки и «узкие места»', results: 'Минимальны\nСистемные', meaning: 'Снижение ошибок', decision: 'Исправить' }
    ],
    conclusion: 'Маршрутизация сегментов в рабочей аудитории оптимизирует пути для каждого подтверждённого сегмента. Корректная логика маршрутов, оптимальная длина и минимизация ошибок обеспечивают высокую конверсию и готовность к переходу на следующий этап.'
  },
  'preparation': {
    id: 'preparation',
    title: 'Подготовка к этапу «Лендинг / Воронка»',
    table: [
      { what: 'Готовность к покупке', results: 'Запрос сформирован\nСырой / непонятный', meaning: 'Аудитория готова к УТП', decision: 'В продажу / Прогрев' },
      { what: 'Ясность УТП', results: 'Чётко считывается\nТребует пояснений', meaning: 'Формулировка ясна', decision: 'Фиксировать / Доработать' },
      { what: 'Соответствие ожиданий', results: 'Совпадает / искажён', meaning: 'Риск отказа минимален', decision: 'Выравнивать' },
      { what: 'Точки усиления', results: 'Видны / неочевидны', meaning: 'Возможности для роста', decision: 'Усилить / Протестировать' }
    ],
    conclusion: 'Подготовка к этапу «Лендинг / Воронка» завершает этап «Аудитория». На этом этапе проверяется готовность аудитории к продаже, ясность УТП, соответствие ожиданий и определяются точки для усиления. Только при полной готовности всех параметров возможен переход к созданию лендинга и воронки.'
  }
}

// Структура диаграмм
const testDiagramStructure = {
  nodes: [
    { id: 'traffic', name: 'Трафик', icon: '📊', level: 0 },
    { id: 'prelanding', name: 'Прелендинг — точка приёма и анализа', icon: '🎯', level: 1 },
    { id: 'analysis', name: 'Анализ аудитории', icon: '🔍', level: 2 },
    { id: 'routing', name: 'Маршрутизация', icon: '🔄', level: 3 },
    { id: 'hypothesis', name: 'Вывод по гипотезе', icon: '✅', level: 4 }
  ]
}

const workDiagramStructure = {
  nodes: [
    { id: 'traffic-confirmed', name: 'Подтверждённые источники трафика', icon: '📈', level: 0 },
    { id: 'segments-confirmed', name: 'Подтверждённые сегменты аудитории', icon: '👥', level: 1 },
    { id: 'routing-segments', name: 'Маршрутизация сегментов', icon: '🔄', level: 2 },
    { id: 'preparation', name: 'Подготовка к этапу «Лендинг / Воронка»', icon: '🚀', level: 3 }
  ]
}

function BlockDetail({ block, onBack, onConsultation, onDiagnostics, onAvatarClick, onNextBlock, onAlchemyClick, onChatClick, onHomeClick }) {
  const { logContentView } = useLogEvent()
  const isAudienceBlock = block.id === 'audience'
  const isLandingBlock = block.id === 'landing'
  const isLeadmagnetBlock = block.id === 'leadmagnet'
  const isTripwireBlock = block.id === 'tripwire'
  const isAutofunnelBlock = block.id === 'autofunnel'
  const isProductBlock = block.id === 'product'
  const isMoneyBlock = block.id === 'money'
  const [activeTab, setActiveTab] = useState('test') // 'test' или 'work'
  const [selectedBlockId, setSelectedBlockId] = useState(null)
  const tableRef = useRef(null)
  const diagramBlockRefs = useRef({})
  const productHeroRef = useRef(null)

  useEffect(() => {
    if (block?.id && block?.name) {
      logContentView('page', block.id, { content_title: block.name })
    }
  }, [block?.id, block?.name, logContentView])

  // Скролл к верху страницы при открытии нового блока (та же логика, что и при открытии из главной)
  useEffect(() => {
    // Находим контейнер блока и скроллим его
    const scrollToTop = () => {
      // Пробуем разные способы скролла
      const container = document.querySelector('.block-detail-container')
      if (container) {
        // Для мобильных используем scrollTop напрямую
        container.scrollTop = 0
        container.scrollTo({ top: 0, behavior: 'instant' })
        // Также пробуем scrollIntoView для надежности
        const firstElement = container.firstElementChild
        if (firstElement) {
          firstElement.scrollIntoView({ behavior: 'instant', block: 'start' })
        }
      }
      // Также скроллим window на случай, если скролл там
      window.scrollTo({ top: 0, behavior: 'instant' })
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
      // Для мобильных Safari
      if (window.pageYOffset !== undefined) {
        window.pageYOffset = 0
      }
    }
    
    // Используем requestAnimationFrame для гарантии, что DOM обновлен
    requestAnimationFrame(() => {
      scrollToTop()
      
      // И через небольшую задержку еще раз для надежности
      setTimeout(() => {
        scrollToTop()
        const container = document.querySelector('.block-detail-container')
        if (container) {
          container.scrollTop = 0
          container.scrollTo({ top: 0, behavior: 'smooth' })
        }
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }, 150)
    })
  }, [block.id])

  // Параллакс-эффект для блока Продукт
  useEffect(() => {
    if (!isProductBlock) return

    const handleScroll = () => {
      if (productHeroRef.current) {
        const scrolled = window.pageYOffset
        const hero = productHeroRef.current
        const particles = hero.querySelector('.product-particles')
        const grid = hero.querySelector('.product-grid')
        
        if (particles) {
          particles.style.transform = `translateY(${scrolled * 0.3}px)`
        }
        if (grid) {
          grid.style.transform = `translateY(${scrolled * 0.2}px)`
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isProductBlock])

  const handleBlockClick = (blockId) => {
    setSelectedBlockId(selectedBlockId === blockId ? null : blockId)
  }

  // Скролл к таблице при её появлении
  useEffect(() => {
    if (selectedBlockId && tableRef.current) {
      setTimeout(() => {
        tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [selectedBlockId])

  // Функция для скролла к блоку диаграммы
  const scrollToDiagramBlock = (blockId) => {
    const blockRef = diagramBlockRefs.current[blockId]
    if (blockRef) {
      blockRef.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Подсветка блока
      setTimeout(() => {
        blockRef.classList.add('highlight')
        setTimeout(() => {
          blockRef.classList.remove('highlight')
        }, 2000)
      }, 300)
    }
  }

  const selectedTableData = selectedBlockId ? tableData[selectedBlockId] : null
  const currentDiagram = activeTab === 'test' ? testDiagramStructure : workDiagramStructure

  const audienceContent = (
    <div className="audience-new-container">
      {/* Hero-секция */}
      <motion.section 
        className="audience-hero"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="audience-hero-header">
          <img src={block.image} alt={block.name} className="audience-hero-image" />
          <div className="audience-hero-text">
            <h1 className="audience-hero-title">
              Аудитория<br />
              <span className="audience-hero-subtitle">Технологическая разведка рынка</span>
            </h1>
            <p className="audience-hero-offer">
              Запускаем систему сбора данных раньше, чем вы запишете первый урок.
            </p>
          </div>
        </div>
      </motion.section>

      {/* Блок "Что на входе" */}
      <motion.section 
        className="audience-input-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <h2 className="audience-section-title">Что на входе</h2>
        <div className="audience-input-cards">
          <motion.div 
            className="audience-input-card"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="input-card-icon">💡</div>
            <h3 className="input-card-title">Гипотеза</h3>
            <div className="input-card-content">
              <p className="input-card-description">
                На этом этапе у вас есть идея продукта, но ещё нет готового решения. Мы фиксируем:
              </p>
              <ul className="input-card-list">
                <li><strong>Описание оффера:</strong> что именно вы предлагаете решить, какой результат получит клиент</li>
                <li><strong>Боли аудитории:</strong> какие конкретные проблемы испытывает ваш потенциальный клиент, что его беспокоит</li>
                <li><strong>Ценовой сегмент:</strong> в каком диапазоне вы планируете продавать, какой бюджет готовы выделить клиенты</li>
              </ul>
              <p className="input-card-note">
                Это не финальная упаковка, а гипотеза, которую мы будем проверять данными, а не ощущениями.
              </p>
            </div>
          </motion.div>
          
          <motion.div 
            className="audience-input-card"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="input-card-icon">📊</div>
            <h3 className="input-card-title">Трафик</h3>
            <div className="input-card-content">
              <p className="input-card-description">
                Получаем трафик с предыдущего этапа, где специалисты по рекламе уже запустили тестовые кампании:
              </p>
              <ul className="input-card-list">
                <li><strong>Входящий поток:</strong> к нам приходят люди из разных каналов (TG Ads, Яндекс.Директ, посевы в каналах), которые уже были настроены специалистами по трафику</li>
                <li><strong>Сквозная UTM-разметка:</strong> каждый клик помечен метками от предыдущего этапа, чтобы мы точно знали, откуда пришёл клиент и как он себя ведёт</li>
                <li><strong>Сегментация источников:</strong> анализируем, какие каналы дают заинтересованных людей, а какие — просто трафик, чтобы дать обратную связь по качеству источников</li>
              </ul>
              <p className="input-card-note">
                Мы не настраиваем рекламу — мы получаем готовый трафик и анализируем его качество, чтобы понять реальную стоимость клика и интерес аудитории к вашему предложению.
              </p>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Блок "Процесс (The Logic)" */}
      <motion.section 
        className="audience-process-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <h2 className="audience-section-title">Процесс (The Logic)</h2>
        <div className="audience-process-content">
          <motion.div 
            className="audience-process-card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <h3 className="process-card-title">Data-Driven Validation</h3>
            <p className="process-card-text">
              Создаём прелендинги (быстрые точки захвата) и соединяем их через API/Webhooks (Бот/Make/n8n) с аналитическими таблицами.
            </p>
          </motion.div>

          {/* Визуализация потока данных */}
          <motion.div 
            className="audience-data-flow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            <div className="data-flow-item">
              <div className="flow-icon">📱</div>
              <span className="flow-label">Трафик</span>
          </div>
            <div className="flow-arrow">→</div>
            <div className="data-flow-item flow-item-highlight">
              <div className="flow-icon">⚙️</div>
              <span className="flow-label">Бот/Make/n8n</span>
          </div>
            <div className="flow-arrow">→</div>
            <div className="data-flow-item">
              <div className="flow-icon">📊</div>
              <span className="flow-label">Таблица</span>
                  </div>
          </motion.div>

          {/* Expert Note */}
          <motion.div 
            className="audience-expert-note"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
          >
            <img src="/images/me.jpg" alt="Илья Бормотов" className="expert-note-avatar" />
            <div className="expert-note-content">
              Бот/Make/n8n — это «центральный процессор», который мгновенно ловит сигнал о клике и сегментирует клиента в CRM ещё до того, как он оставил заявку.
                    </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Блок "Технологический стек" */}
      <motion.section 
        className="audience-tech-stack-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
      >
        <h2 className="audience-section-title">Технологический стек</h2>
        <div className="audience-tech-badges">
          <motion.div 
            className="tech-badge"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.8 }}
            whileHover={{ scale: 1.1, y: -5 }}
          >
            <div className="tech-badge-icon">🚀</div>
            <div className="tech-badge-label">Fast-Deployment</div>
            <div className="tech-badge-tools">Tilda / Taplink</div>
          </motion.div>
          
          <motion.div 
            className="tech-badge"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.9 }}
            whileHover={{ scale: 1.1, y: -5 }}
          >
            <div className="tech-badge-icon">🔗</div>
            <div className="tech-badge-label">No-code Automation</div>
            <div className="tech-badge-tools">Бот / Make / n8n</div>
          </motion.div>
          
          <motion.div 
            className="tech-badge"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 1.0 }}
            whileHover={{ scale: 1.1, y: -5 }}
          >
            <div className="tech-badge-icon">📈</div>
            <div className="tech-badge-label">Analytics</div>
            <div className="tech-badge-tools">Pixel / Metrics</div>
          </motion.div>
          
          <motion.div 
            className="tech-badge"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 1.1 }}
            whileHover={{ scale: 1.1, y: -5 }}
          >
            <div className="tech-badge-icon">🗄️</div>
            <div className="tech-badge-label">Data Management</div>
            <div className="tech-badge-tools">Google Sheets</div>
          </motion.div>
        </div>
      </motion.section>

      {/* Выход и Результат */}
      <motion.section 
        className="audience-output-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.2 }}
      >
        <h2 className="audience-section-title">Выход и Результат</h2>
        <motion.div 
          className="audience-output-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 1.3 }}
          whileHover={{ scale: 1.02 }}
        >
          <div className="output-card-header">
            <div className="output-card-icon">📊</div>
            <h3 className="output-card-title">Dashboard с реальными данными</h3>
          </div>
          <div className="output-card-content">
            <p className="output-card-text">
              На выходе вы получаете <strong>Dashboard</strong> с конкретными метриками:
            </p>
            <div className="output-card-features">
              <div className="output-feature">
                <span className="feature-check">✓</span>
                <span><strong>Стоимость клика</strong> по каждому источнику</span>
              </div>
              <div className="output-feature">
                <span className="feature-check">✓</span>
                <span><strong>Интерес аудитории</strong> — процент реального взаимодействия</span>
              </div>
              <div className="output-feature">
                <span className="feature-check">✓</span>
                <span><strong>Валидация гипотезы</strong> — есть ли рынок и готовность платить</span>
              </div>
              <div className="output-feature">
                <span className="feature-check">✓</span>
                <span><strong>Сегментация</strong> — какие группы наиболее заинтересованы</span>
              </div>
              <div className="output-feature">
                <span className="feature-check">✓</span>
                <span><strong>Экономика входа</strong> — реальная стоимость привлечения</span>
              </div>
            </div>
            <p className="output-card-next">
              С этими данными переходим к <strong>созданию лендинга и воронки</strong> с пониманием стоимости клика и характеристик аудитории.
            </p>
          </div>
          <div className="output-card-buttons">
            <button 
              className="output-next-stage-btn"
              onClick={() => {
                if (onNextBlock) {
                  onNextBlock()
                } else {
                  onBack()
                }
              }}
            >
              Перейти к этапу «Лендинг»
            </button>
            <button 
              className="consultation-btn"
              onClick={onConsultation}
            >
              Получить бесплатную консультацию
            </button>
          </div>
        </motion.div>
      </motion.section>
    </div>
  )

  const leadmagnetContent = (
    <div className="leadmagnet-new-container">
      {/* Hero-секция */}
      <motion.section 
        className="leadmagnet-hero"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="leadmagnet-hero-header">
          <img src={block.image} alt={block.name} className="leadmagnet-hero-image" />
          <div className="leadmagnet-hero-text">
            <h1 className="leadmagnet-hero-title">
              Лид-магнит<br />
              <span className="leadmagnet-hero-subtitle">Автоматизированная выдача ценности и первый шаг к доверию</span>
            </h1>
          </div>
        </div>
      </motion.section>

      {/* Блок "На входе" */}
      <motion.section 
        className="leadmagnet-input-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <h2 className="leadmagnet-section-title">1. На входе:</h2>
        <motion.div 
          className="leadmagnet-input-text"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <p className="leadmagnet-input-description">
            К нам приходит <strong>живой, заинтересованный трафик</strong> — люди, которые уже проявили интерес к вашей теме. 
            Это не случайные посетители, а те, кто прошёл через лендинг, понял ваше предложение и <strong>сознательно нажал кнопку</strong>, 
            чтобы получить обещанную ценность.
          </p>
          <p className="leadmagnet-input-description">
            У каждого из них уже есть <strong>идентификатор</strong> — мы знаем, откуда они пришли, что их зацепило, 
            и какой именно лид-магнит им пообещали. Они пришли не просто посмотреть, а <strong>получить конкретную пользу</strong>: 
            гайд, который решит их задачу, тест, который покажет их уровень, или доступ к материалу, который они ждут.
          </p>
          <p className="leadmagnet-input-description">
            Это <strong>тёплый, подготовленный поток</strong> — люди, которым действительно интересна ваша тема и которые 
            готовы сделать первый шаг к взаимодействию с вами.
          </p>
        </motion.div>
      </motion.section>

      {/* Блок "Что делаем" */}
      <motion.section 
        className="leadmagnet-process-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <h2 className="leadmagnet-section-title">2. Что делаем:</h2>
        <motion.div 
          className="leadmagnet-process-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <p className="process-card-text">
            Мы настраиваем систему так, чтобы она сработала как идеальный швейцар. Задача — не просто «скинуть файл», а мгновенно доставить его в удобный клиенту канал (чаще всего Telegram), проверить подписку и зафиксировать интерес. Мы создаем систему, которая «видит», открыл ли человек ваш материал или отложил на потом.
          </p>
        </motion.div>
      </motion.section>

      {/* Блок "Инструменты (Технологический стек)" */}
      <motion.section 
        className="leadmagnet-tech-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
      >
        <h2 className="leadmagnet-section-title">3. Инструменты (Технологический стек):</h2>
        <p style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.8)', fontSize: '16px', marginBottom: '40px', maxWidth: '800px', margin: '0 auto 40px' }}>
          Виды лид-магнитов, которые работают в онлайн-школах, и IT-инструменты для их создания:
        </p>
        <div className="leadmagnet-tech-cards">
          <motion.div 
            className="leadmagnet-tech-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            whileHover={{ scale: 1.02, y: -5 }}
          >
            <div className="tech-card-icon">📄</div>
            <h3 className="tech-card-title">PDF-гайды и чек-листы</h3>
            <p className="tech-card-description">
              Классика жанра: пошаговые инструкции, шаблоны, методички. <strong>Инструменты:</strong> Telegram-бот, MiniApp, сайт с автовыдачей.
            </p>
          </motion.div>

          <motion.div 
            className="leadmagnet-tech-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.85 }}
            whileHover={{ scale: 1.02, y: -5 }}
          >
            <div className="tech-card-icon">🎯</div>
            <h3 className="tech-card-title">Квизы и тесты</h3>
            <p className="tech-card-description">
              Интерактивная диагностика: "Узнай свой уровень", "Определи тип мышления". <strong>Инструменты:</strong> Квиз-бот, MiniApp, кастомный квиз на сайте.
            </p>
          </motion.div>

          <motion.div 
            className="leadmagnet-tech-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
            whileHover={{ scale: 1.02, y: -5 }}
          >
            <div className="tech-card-icon">🧮</div>
            <h3 className="tech-card-title">Калькуляторы</h3>
            <p className="tech-card-description">
              Персонализированный расчет: ROI, стоимость проекта, персональный план. <strong>Инструменты:</strong> MiniApp, сайт-калькулятор, интерактивный бот.
            </p>
          </motion.div>

          <motion.div 
            className="leadmagnet-tech-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.95 }}
            whileHover={{ scale: 1.02, y: -5 }}
          >
            <div className="tech-card-icon">🎬</div>
            <h3 className="tech-card-title">Видео-уроки и вебинары</h3>
            <p className="tech-card-description">
              Первый урок курса, разбор кейса, мини-мастер-класс. <strong>Инструменты:</strong> Бот с автовыдачей, приватный канал, доступ через MiniApp.
            </p>
          </motion.div>

          <motion.div 
            className="leadmagnet-tech-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.0 }}
            whileHover={{ scale: 1.02, y: -5 }}
          >
            <div className="tech-card-icon">🎨</div>
            <h3 className="tech-card-title">Интерактивные инструменты</h3>
            <p className="tech-card-description">
              Конструкторы, генераторы, визуализаторы — то, с чем клиент взаимодействует. <strong>Инструменты:</strong> MiniApp, кастомный сайт, интерактивный бот.
            </p>
          </motion.div>

          <motion.div 
            className="leadmagnet-tech-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.05 }}
            whileHover={{ scale: 1.02, y: -5 }}
          >
            <div className="tech-card-icon">🚀</div>
            <h3 className="tech-card-title">Демо-доступы и челленджи</h3>
            <p className="tech-card-description">
              Первые 3 дня курса, 7-дневный марафон, пробный доступ к платформе. <strong>Инструменты:</strong> MiniApp, личный кабинет, бот с автоворонкой.
            </p>
          </motion.div>
        </div>
      </motion.section>

      {/* Блок "На выходе" */}
      <motion.section 
        className="leadmagnet-output-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.2 }}
      >
        <h2 className="leadmagnet-section-title">4. На выходе:</h2>
        <motion.div 
          className="leadmagnet-output-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 1.3 }}
          whileHover={{ scale: 1.02 }}
        >
          <div className="output-card-header">
            <div className="output-card-icon">🔥</div>
            <h3 className="output-card-title">«Утепленный» контакт</h3>
          </div>
          <div className="output-card-content">
            <p className="output-card-text">
              Это уже не просто аноним из интернета, а человек, который прикоснулся к вашему продукту. У вас есть данные о его вовлеченности.
            </p>
          </div>
        </motion.div>
      </motion.section>

      {/* Блок "Вывод" */}
      <motion.section 
        className="leadmagnet-conclusion-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.4 }}
      >
        <h2 className="leadmagnet-section-title">5. Вывод:</h2>
        <motion.div 
          className="leadmagnet-conclusion-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 1.5 }}
        >
          <p className="conclusion-card-text">
            Лид-магнит открыл дверь. Теперь, когда клиент получил первую пользу бесплатно, система автоматически предлагает сделать следующий шаг — Трипваер (продукт с импульсивной покупкой).
          </p>
          <div className="output-card-buttons">
            <button 
              className="output-next-stage-btn"
              onClick={() => {
                if (onNextBlock) {
                  onNextBlock()
                } else {
                  onBack()
                }
              }}
            >
              Перейти к этапу: Трипваер
            </button>
            <button 
              className="consultation-btn"
              onClick={onConsultation}
            >
              Получить бесплатную консультацию
            </button>
          </div>
        </motion.div>
      </motion.section>
    </div>
  )

  const tripwireContent = (
    <div className="tripwire-new-container">
      {/* Hero-секция */}
      <motion.section 
        className="tripwire-hero"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="tripwire-hero-header">
          <img src={block.image} alt={block.name} className="tripwire-hero-image" />
          <div className="tripwire-hero-text">
            <h1 className="tripwire-hero-title">
              Трипваер<br />
              <span className="tripwire-hero-subtitle">Первая денежная транзакция</span>
            </h1>
            <p className="tripwire-hero-offer">
              Автоматизация импульсивных покупок. Превращаем читателя в покупателя в 2 клика.
            </p>
          </div>
        </div>
      </motion.section>

      {/* Блок "Что на входе" */}
      <motion.section 
        className="tripwire-input-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <h2 className="tripwire-section-title">Что на входе</h2>
        <div className="tripwire-input-cards">
          <motion.div 
            className="tripwire-input-card"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="input-card-icon">🔥</div>
            <h3 className="input-card-title">Прогретый лид</h3>
            <div className="input-card-content">
              <p className="input-card-description">
                Клиент уже получил бесплатную ценность (лид-магнит) и прошёл автоворонку прогрева. Он знаком с вашим подходом и готов к следующему шагу.
              </p>
            </div>
          </motion.div>
          
          <motion.div 
            className="tripwire-input-card"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="input-card-icon">💰</div>
            <h3 className="input-card-title">Недорогой оффер (импульсивная покупка)</h3>
            <div className="input-card-content">
              <p className="input-card-description">
                Небольшой продукт с низким порогом входа (обычно 500-2000₽). Это не основной продукт, а "пробник" — что-то ценное, но доступное для импульсивной покупки без долгих раздумий.
              </p>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Блок "The Engineering" */}
      <motion.section 
        className="tripwire-engineering-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <h2 className="tripwire-section-title">The Engineering</h2>
        <motion.div 
          className="tripwire-engineering-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <h3 className="engineering-card-title">Настройка платежной инфраструктуры</h3>
          <p className="engineering-card-text">
            Мы настраиваем бесшовный процесс: <strong>"Оплата — Фискализация — Выдача доступа"</strong> происходит автоматически, без участия человека.
          </p>
          <div className="engineering-flow">
            <div className="engineering-step">
              <div className="engineering-step-icon">💳</div>
              <div className="engineering-step-label">Оплата</div>
            </div>
            <div className="engineering-arrow">→</div>
            <div className="engineering-step">
              <div className="engineering-step-icon">🧾</div>
              <div className="engineering-step-label">Фискализация</div>
            </div>
            <div className="engineering-arrow">→</div>
            <div className="engineering-step">
              <div className="engineering-step-icon">🔓</div>
              <div className="engineering-step-label">Выдача доступа</div>
            </div>
          </div>
          <p className="engineering-card-note">
            Клиент платит → система автоматически формирует чек по 54-ФЗ → доступ к продукту выдаётся мгновенно. Всё происходит в один клик.
          </p>
        </motion.div>
      </motion.section>

      {/* Блок "Технологический стек" */}
      <motion.section 
        className="tripwire-tech-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
      >
        <h2 className="tripwire-section-title">Технологический стек</h2>
        <div className="tripwire-tech-grid">
          <motion.div 
            className="tripwire-tech-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            whileHover={{ scale: 1.02, y: -5 }}
          >
            <div className="tech-card-icon">💳</div>
            <h3 className="tech-card-title">Платежные системы</h3>
            <p className="tech-card-description">
              Интеграция с эквайрингом (<strong>ЮKassa / Prodamus / Robokassa / Юмани / TBank</strong> и др.) для приема платежей из любой точки мира.
            </p>
          </motion.div>

          <motion.div 
            className="tripwire-tech-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.85 }}
            whileHover={{ scale: 1.02, y: -5 }}
          >
            <div className="tech-card-icon">🚀</div>
            <h3 className="tech-card-title">Платформа выдачи</h3>
            <p className="tech-card-description">
              Автоматический доступ к контенту (в <strong>Telegram-боте, Mini App, на GetCourse</strong> и пр.) сразу после подтверждения транзакции.
            </p>
          </motion.div>
        </div>
      </motion.section>

      {/* Блок "Результат (Dashboard)" */}
      <motion.section 
        className="tripwire-result-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.2 }}
      >
        <h2 className="tripwire-section-title">Результат (Dashboard)</h2>
        <motion.div 
          className="tripwire-result-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 1.3 }}
          whileHover={{ scale: 1.02 }}
        >
          <div className="result-card-header">
            <div className="result-card-icon">📊</div>
            <h3 className="result-card-title">Метрики первой транзакции</h3>
          </div>
          <div className="result-card-content">
            <div className="result-metrics">
              <div className="result-metric">
                <span className="metric-icon">📈</span>
                <div className="metric-content">
                  <div className="metric-label">Финансовая валидация модели</div>
                  <div className="metric-description">Трипваер подтверждает экономическую жизнеспособность вашей воронки: вы видите реальную стоимость привлечения, конверсию в первую покупку и ROI на каждом этапе. Это не гипотеза — это работающая модель монетизации с конкретными цифрами и прогнозируемым результатом.</div>
                </div>
              </div>
              <div className="result-metric">
                <span className="metric-icon">🎯</span>
                <div className="metric-content">
                  <div className="metric-label">Профиль платёжеспособного клиента</div>
                  <div className="metric-description">Вы получаете детальную картину о клиенте, который готов платить: его поведенческие паттерны, скорость принятия решений, уровень вовлечённости и готовность к покупке основного продукта. Эти данные позволяют точно сегментировать аудиторию и персонализировать дальнейшие предложения.</div>
                </div>
              </div>
              <div className="result-metric">
                <span className="metric-icon">⚙️</span>
                <div className="metric-content">
                  <div className="metric-label">Автоматизированный процесс продажи</div>
                  <div className="metric-description">Вся цепочка от клика до выдачи доступа работает без участия человека: платеж обрабатывается автоматически, чек формируется по 54-ФЗ, доступ выдаётся мгновенно, статус в CRM обновляется. Система готова к масштабированию и может обрабатывать сотни транзакций одновременно.</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* Блок "Вывод" */}
      <motion.section 
        className="tripwire-conclusion-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.4 }}
      >
        <h2 className="tripwire-section-title">Вывод</h2>
        <motion.div 
          className="tripwire-conclusion-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 1.5 }}
        >
          <p className="conclusion-card-text">
            Трипваер завершает критический переход: из читателя клиент превращается в <strong>реального покупателя</strong>. 
            Вы получаете автоматизированную систему продажи с валидированной экономикой и детальными данными о платёжеспособных клиентах. 
            Теперь нам нужно укрепить нашу связь с клиентом при помощи <strong>Автоворонок прогрева</strong>.
          </p>
          <div className="output-card-buttons">
            <button 
              className="output-next-stage-btn"
              onClick={() => {
                if (onNextBlock) {
                  onNextBlock()
                } else {
                  onBack()
                }
              }}
            >
              Перейти к этапу: Автоворонки прогрева
            </button>
            <button 
              className="consultation-btn"
              onClick={onConsultation}
            >
              Получить бесплатную консультацию
            </button>
          </div>
        </motion.div>
      </motion.section>
    </div>
  )

  const autofunnelContent = (
    <div className="autofunnel-new-container">
      {/* Hero-секция */}
      <motion.section 
        className="autofunnel-hero"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="autofunnel-hero-header">
          <img src={block.image} alt={block.name} className="autofunnel-hero-image" />
          <div className="autofunnel-hero-text">
            <h1 className="autofunnel-hero-title">
              Автоворонки прогрева<br />
              <span className="autofunnel-hero-subtitle">Влюбление через касания</span>
            </h1>
            <p className="autofunnel-hero-offer">
              Цепочка касаний, которая подстраивается под поведение клиента и ведет его к покупке без вашего участия.
            </p>
          </div>
        </div>
      </motion.section>

      {/* Блок "Что на входе" */}
      <motion.section 
        className="autofunnel-input-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <h2 className="autofunnel-section-title">Что на входе</h2>
        <div className="autofunnel-input-cards">
          <motion.div 
            className="autofunnel-input-card"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="input-card-icon">📊</div>
            <h3 className="input-card-title">История действий клиента</h3>
            <div className="input-card-content">
              <p className="input-card-description">
                Система фиксирует каждое взаимодействие: что клиент кликал, какие материалы смотрел, сколько времени провел на каждом этапе.
              </p>
              <ul className="input-card-list">
                <li><strong>Открытия:</strong> какие сообщения клиент открыл и прочитал</li>
                <li><strong>Досматривания:</strong> какие материалы были просмотрены полностью</li>
                <li><strong>Паузы:</strong> где клиент остановился и не продолжил взаимодействие</li>
                <li><strong>Клики:</strong> на какие ссылки переходил, какие кнопки нажимал</li>
              </ul>
            </div>
          </motion.div>
          
          <motion.div 
            className="autofunnel-input-card"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="input-card-icon">🎯</div>
            <h3 className="input-card-title">Сегментация</h3>
            <div className="input-card-content">
              <p className="input-card-description">
                Понимание интересов клиента на основе его поведения. Система анализирует паттерны и определяет, к какому сегменту относится клиент.
              </p>
              <ul className="input-card-list">
                <li><strong>Уровень вовлеченности:</strong> насколько активно клиент взаимодействует с контентом</li>
                <li><strong>Интересы:</strong> какие темы и материалы вызывают наибольший отклик</li>
                <li><strong>Готовность к покупке:</strong> насколько близок клиент к принятию решения</li>
                <li><strong>Тип поведения:</strong> аналитик, импульсивный покупатель, исследователь</li>
              </ul>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Блок "The Engineering" */}
      <motion.section 
        className="autofunnel-engineering-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <h2 className="autofunnel-section-title">The Engineering</h2>
        <motion.div 
          className="autofunnel-engineering-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <h3 className="engineering-card-title">Адаптивный сценарий</h3>
          <p className="engineering-card-text">
            Автоворонка — это <strong>живой алгоритм</strong>, который реагирует на каждое действие клиента в реальном времени. 
            Она не просто отправляет сообщения по расписанию, а анализирует поведение и подстраивается под него.
          </p>
          <div className="engineering-highlights">
            <div className="engineering-highlight">
              <span className="highlight-icon">⚡</span>
              <span className="highlight-text">Реагирует на открытия</span>
            </div>
            <div className="engineering-highlight">
              <span className="highlight-icon">👁️</span>
              <span className="highlight-text">Учитывает досматривания</span>
            </div>
            <div className="engineering-highlight">
              <span className="highlight-icon">⏸️</span>
              <span className="highlight-text">Отслеживает паузы</span>
            </div>
          </div>
          <p className="engineering-card-note">
            Если клиент открыл сообщение — система понимает интерес и усиливает коммуникацию. 
            Если досмотрел материал до конца — предлагает следующий шаг. 
            Если сделал паузу — дает время и возвращается с релевантным предложением.
          </p>
        </motion.div>
      </motion.section>

      {/* Блок "Технологический стек" */}
      <motion.section 
        className="autofunnel-tech-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
      >
        <h2 className="autofunnel-section-title">Технологический стек</h2>
        <p style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.8)', fontSize: '16px', marginBottom: '40px', maxWidth: '800px', margin: '0 auto 40px' }}>
          Telegram-боты с логикой ветвлений, которая принимает решения за миллисекунды на основе поведения клиента. 
          Система анализирует открытия, досматривания и паузы, мгновенно выбирая следующий шаг в воронке.
        </p>
        <div className="autofunnel-tech-grid">
          <motion.div 
            className="autofunnel-tech-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            whileHover={{ scale: 1.02, y: -5 }}
          >
            <div className="tech-card-icon">🤖</div>
            <h3 className="tech-card-title">Конструкторы ботов</h3>
            <p className="tech-card-description">
              <strong>LeadTeh, Bothelp</strong> — платформы для быстрого создания Telegram-ботов с визуальным редактором сценариев. 
              Идеально подходят для стандартных воронок прогрева с логикой ветвлений.
            </p>
          </motion.div>

          <motion.div 
            className="autofunnel-tech-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.85 }}
            whileHover={{ scale: 1.02, y: -5 }}
          >
            <div className="tech-card-icon">💻</div>
            <h3 className="tech-card-title">Кастомная разработка</h3>
            <p className="tech-card-description">
              <strong>Сайты, MiniApp на React, Python</strong> — индивидуальные решения для сложных задач. 
              Полный контроль над логикой, интеграциями и функционалом бота.
            </p>
          </motion.div>

          <motion.div 
            className="autofunnel-tech-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
            whileHover={{ scale: 1.02, y: -5 }}
          >
            <div className="tech-card-icon">📧</div>
            <h3 className="tech-card-title">Email-сервисы</h3>
            <p className="tech-card-description">
              <strong>Email для GetCourse</strong> — доставка сообщений через платформу обучения. 
              Интеграция с воронкой прогрева для комплексного воздействия на клиента.
            </p>
          </motion.div>
        </div>
      </motion.section>

      {/* Блок "Результат" */}
      <motion.section 
        className="autofunnel-result-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.2 }}
      >
        <h2 className="autofunnel-section-title">Результат</h2>
        <motion.div 
          className="autofunnel-result-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 1.3 }}
          whileHover={{ scale: 1.02 }}
        >
          <div className="result-card-header">
            <div className="result-card-icon">🔥</div>
            <h3 className="result-card-title">Прогретый и лояльный клиент</h3>
          </div>
          <div className="result-card-content">
            <p className="result-card-text">
              На выходе вы получаете клиента, который:
            </p>
            <div className="result-features">
              <div className="result-feature">
                <span className="feature-check">✓</span>
                <span>Прошел через персонализированную цепочку касаний</span>
              </div>
              <div className="result-feature">
                <span className="feature-check">✓</span>
                <span>Получил релевантный контент, соответствующий его интересам</span>
              </div>
              <div className="result-feature">
                <span className="feature-check">✓</span>
                <span>Доверяет вам и готов к покупке основного продукта</span>
              </div>
              <div className="result-feature">
                <span className="feature-check">✓</span>
                <span>Показывает рост конверсии из лида в клиента</span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* Блок "Вывод" */}
      <motion.section 
        className="autofunnel-conclusion-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.4 }}
      >
        <h2 className="autofunnel-section-title">Вывод</h2>
        <motion.div 
          className="autofunnel-conclusion-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 1.5 }}
        >
          <p className="conclusion-card-text">
            Автоворонка прогрева завершила свою работу: клиент максимально подготовлен и готов к кульминации всей воронки — 
            <strong> Основному продукту</strong>. Система автоматически передает прогретого клиента на следующий этап.
          </p>
          <div className="output-card-buttons">
            <button 
              className="output-next-stage-btn"
              onClick={() => {
                if (onNextBlock) {
                  onNextBlock()
                } else {
                  onBack()
                }
              }}
            >
              Перейти к этапу: Продукт
            </button>
            <button 
              className="consultation-btn"
              onClick={onConsultation}
            >
              Получить бесплатную консультацию
            </button>
          </div>
        </motion.div>
      </motion.section>
    </div>
  )

  const productContent = (
    <div className="product-new-container">
      {/* Hero-секция */}
      <motion.section 
        ref={productHeroRef}
        className="product-hero"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="product-hero-background">
          <div className="product-particles"></div>
          <div className="product-grid"></div>
        </div>
        <div className="product-hero-header">
          <img src={block.image} alt={block.name} className="product-hero-image" />
          <div className="product-hero-text">
            <h1 className="product-hero-title">
              Продукт<br />
              <span className="product-hero-subtitle">Экосистема вашего успеха</span>
            </h1>
            <p className="product-hero-offer">
              Превращаем знания в технологичный актив. Среда, в которой доходимость до результата заложена в архитектуру.
            </p>
          </div>
        </div>
      </motion.section>

      {/* Блок "Что на входе" */}
      <motion.section 
        className="product-input-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <h2 className="product-section-title">Что на входе</h2>
        <div className="product-input-cards">
          <motion.div 
            className="product-input-card"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            whileHover={{ scale: 1.02, y: -5 }}
          >
            <div className="product-card-glow"></div>
            <div className="input-card-icon">🤝</div>
            <h3 className="input-card-title">Лояльный клиент</h3>
            <div className="input-card-content">
              <p className="input-card-description">
                Клиент, который уже прошёл всю воронку: получил лид-магнит, купил трипваер, прошёл автоворонку прогрева. 
                Он знает ваш подход, доверяет вам и готов инвестировать в основной продукт.
              </p>
              <ul className="input-card-list">
                <li><strong>Высокая мотивация:</strong> клиент осознанно идёт к результату</li>
                <li><strong>Доверие:</strong> уже получил ценность и готов к большему</li>
                <li><strong>Готовность к трансформации:</strong> понимает, что продукт изменит его ситуацию</li>
              </ul>
            </div>
          </motion.div>
          
          <motion.div 
            className="product-input-card"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            whileHover={{ scale: 1.02, y: -5 }}
          >
            <div className="product-card-glow"></div>
            <div className="input-card-icon">🚀</div>
            <h3 className="input-card-title">Ожидание трансформации</h3>
            <div className="input-card-content">
              <p className="input-card-description">
                Клиент приходит не просто за информацией, а за реальным изменением. Он ожидает систему, которая приведёт его к результату, 
                а не просто набор уроков.
              </p>
              <ul className="input-card-list">
                <li><strong>Чёткий запрос:</strong> клиент знает, какой результат хочет получить</li>
                <li><strong>Готовность к действию:</strong> мотивирован применять знания</li>
                <li><strong>Ожидание поддержки:</strong> нужна система, которая поможет дойти до финала</li>
              </ul>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Блок "The Engineering" */}
      <motion.section 
        className="product-engineering-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <h2 className="product-section-title">The Engineering</h2>
        <motion.div 
          className="product-engineering-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <div className="product-card-glow"></div>
          <h3 className="engineering-card-title">Создание Образовательного пространства</h3>
          <p className="engineering-card-text">
            Это не просто контент. Это <strong>IT-продукт</strong> с AI-поддержкой и автоматизацией прогресса. 
            Мы создаём среду, где каждый шаг клиента отслеживается, анализируется и оптимизируется.
          </p>
          <div className="engineering-features">
            <div className="engineering-feature">
              <span className="feature-icon">🤖</span>
              <div className="feature-content">
                <strong>AI-тьюторы:</strong> персональные помощники на базе ChatGPT API, которые отвечают на вопросы, 
                помогают с практикой и ведут клиента к результату 24/7.
              </div>
            </div>
            <div className="engineering-feature">
              <span className="feature-icon">⚙️</span>
              <div className="feature-content">
                <strong>Smart Automation:</strong> бот отслеживает прогресс, напоминает о заданиях, собирает кейсы 
                и автоматически выявляет тех, кому нужна дополнительная поддержка.
              </div>
            </div>
            <div className="engineering-feature">
              <span className="feature-icon">📊</span>
              <div className="feature-content">
                <strong>Архитектура доходимости:</strong> система построена так, чтобы максимальное количество клиентов 
                дошли до результата. Каждый элемент работает на это.
              </div>
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* Блок "Технологический стек" */}
      <motion.section 
        className="product-tech-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
      >
        <h2 className="product-section-title">Технологический стек</h2>
        <div className="product-tech-grid">
          <motion.div 
            className="product-tech-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            whileHover={{ scale: 1.05, y: -10 }}
          >
            <div className="product-card-glow"></div>
            <div className="tech-card-header">
              <div className="tech-card-icon">⚛️</div>
              <h3 className="tech-card-title">Интерфейс</h3>
            </div>
            <div className="tech-card-content">
              <div className="tech-stack-item">
                <strong>Custom Mini App (React)</strong>
                <p>Полностью кастомный интерфейс с максимальной гибкостью и контролем над UX</p>
              </div>
              <div className="tech-stack-item">
                <strong>Premium GetCourse</strong>
                <p>Готовая платформа с расширенными возможностями для масштабных проектов</p>
              </div>
                <div className="tech-stack-item">
                  <strong>CoreApp (coreapp.ai)</strong>
                  <p>
                    <a
                      href="https://coreapp.ai"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Платформа CoreApp
                    </a>{' '}
                    — онлайн‑сервис для создания, продвижения и продажи онлайн‑курсов, а также для запуска онлайн‑школ.
                  </p>
                </div>
            </div>
          </motion.div>

          <motion.div 
            className="product-tech-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
            whileHover={{ scale: 1.05, y: -10 }}
          >
            <div className="product-card-glow"></div>
            <div className="tech-card-header">
              <div className="tech-card-icon">🧠</div>
              <h3 className="tech-card-title">Intelligence</h3>
            </div>
            <div className="tech-card-content">
              <div className="tech-stack-item">
                <strong>AI-тьюторы (ChatGPT API)</strong>
                <p>Персональные помощники, которые отвечают на вопросы и ведут клиента к результату</p>
              </div>
              <div className="tech-stack-item">
                <strong>Smart Automation (бот)</strong>
                <p>Автоматизация прогресса, сбор кейсов, выявление тех, кому нужна поддержка</p>
                </div>
                <div className="tech-stack-item">
                  <strong>SCORM (Sharable Content Object Reference Model)</strong>
                  <p>Международный стандарт для создания, упаковки и передачи электронных обучающих курсов.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Блок "Результат" */}
      <motion.section 
        className="product-result-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.2 }}
      >
        <h2 className="product-section-title">Результат</h2>
        <motion.div 
          className="product-result-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 1.3 }}
          whileHover={{ scale: 1.02 }}
        >
          <div className="product-card-glow"></div>
          <div className="result-card-header">
            <div className="result-card-icon">🏆</div>
            <h3 className="result-card-title">Максимальная эффективность продукта</h3>
          </div>
          <div className="result-card-content">
            <div className="result-metrics">
              <div className="result-metric">
                <span className="metric-icon">📈</span>
                <div className="metric-content">
                  <div className="metric-label">Высокая досматриваемость (COR)</div>
                  <div className="metric-description">
                    Система построена так, чтобы максимальное количество клиентов досмотрели курс до конца. 
                    AI-тьюторы, автоматизация прогресса и персонализация — всё работает на это.
                  </div>
                </div>
              </div>
              <div className="result-metric">
                <span className="metric-icon">💼</span>
                <div className="metric-content">
                  <div className="metric-label">Автоматизированный сбор кейсов</div>
                  <div className="metric-description">
                    Бот автоматически собирает кейсы клиентов, фиксирует результаты и формирует социальное доказательство. 
                    Вам не нужно вручную просить отзывы — система делает это за вас.
                  </div>
                </div>
              </div>
              <div className="result-metric">
                <span className="metric-icon">🚀</span>
                <div className="metric-content">
                  <div className="metric-label">Масштабируемость бизнеса без участия эксперта</div>
                  <div className="metric-description">
                    Продукт работает автономно. AI-тьюторы отвечают на вопросы, бот ведёт клиентов, система собирает кейсы. 
                    Вы можете масштабировать бизнес, не увеличивая нагрузку на себя.
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="output-card-buttons">
            <button 
              className="output-next-stage-btn"
              onClick={() => {
                if (onNextBlock) {
                  onNextBlock()
                } else {
                  onBack()
                }
              }}
            >
              Перейти к этапу: Деньги
            </button>
            <button 
              className="consultation-btn"
              onClick={onConsultation}
            >
              Получить бесплатную консультацию
            </button>
          </div>
        </motion.div>
      </motion.section>
    </div>
  )

  const moneyContent = (
    <div className="money-new-container">
      {/* Hero-секция */}
      <motion.section 
        className="money-hero"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="money-hero-background">
          <div className="money-flow-animation"></div>
          <div className="money-grid"></div>
        </div>
        <div className="money-hero-header">
          <img src={block.image} alt={block.name} className="money-hero-image" />
          <div className="money-hero-text">
            <h1 className="money-hero-title">
              Деньги<br />
              <span className="money-hero-subtitle">Масштабирование капитала</span>
            </h1>
            <p className="money-hero-offer">
              Финальный узел системы, превращающий разовые продажи в бесконечный цикл прибыли. Здесь ваша АИЦП становится печатным станком.
            </p>
          </div>
        </div>
      </motion.section>

      {/* Блок "Что на входе" */}
      <motion.section 
        className="money-input-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <h2 className="money-section-title">Что на входе</h2>
        <div className="money-input-cards">
          <motion.div 
            className="money-input-card"
            initial={{ opacity: 0, x: 0 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            whileHover={{ scale: 1.02, y: -5 }}
          >
            <div className="money-card-glow"></div>
            <div className="input-card-icon">👥</div>
            <h3 className="input-card-title">LTV-база</h3>
            <div className="input-card-content">
              <p className="input-card-description">
                Ваши лояльные клиенты, которые уже прошли всю воронку и купили основной продукт. Это не просто база контактов — это актив, который готов приносить повторную прибыль.
              </p>
              <ul className="input-card-list">
                <li><strong>Высокая лояльность:</strong> клиенты доверяют вам и готовы к дополнительным покупкам</li>
                <li><strong>Данные о поведении:</strong> полная история взаимодействий, интересов и предпочтений</li>
                <li><strong>Готовность к масштабированию:</strong> база, которая может приносить прибыль многократно</li>
              </ul>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Блок "The Engineering" */}
      <motion.section 
        className="money-engineering-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <h2 className="money-section-title">The Engineering</h2>
        <motion.div 
          className="money-engineering-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <div className="money-card-glow"></div>
          <h3 className="engineering-card-title">Настройка системы максимизации прибыли</h3>
          <p className="engineering-card-text">
            Мы создаём систему, которая превращает разовые продажи в <strong>бесконечный цикл прибыли</strong>. 
            Каждый клиент становится источником многократных транзакций без вашего участия.
          </p>
          <div className="engineering-features">
            <div className="engineering-feature">
              <span className="feature-icon">🔄</span>
              <div className="feature-content">
                <strong>Рекуррентные платежи (подписки):</strong> автоматическое продление доступа, 
                ежемесячные/ежеквартальные платежи без напоминаний. Клиент платит регулярно, пока получает ценность.
              </div>
            </div>
            <div className="engineering-feature">
              <span className="feature-icon">⚡</span>
              <div className="feature-content">
                <strong>Допродажи в 1 клик:</strong> система анализирует поведение клиента и предлагает 
                релевантные допродажи в момент максимальной готовности. Оплата происходит мгновенно, без лишних шагов.
              </div>
            </div>
            <div className="engineering-feature">
              <span className="feature-icon">🎯</span>
              <div className="feature-content">
                <strong>Системы лояльности:</strong> автоматические программы накопления бонусов, 
                персональные скидки и специальные предложения для самых активных клиентов.
              </div>
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* Блок "Технологический стек" */}
      <motion.section 
        className="money-tech-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
      >
        <h2 className="money-section-title">Технологический стек</h2>
        <div className="money-tech-grid">
          <motion.div 
            className="money-tech-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            whileHover={{ scale: 1.05, y: -10 }}
          >
            <div className="money-card-glow"></div>
            <div className="tech-card-header">
              <div className="tech-card-icon">💰</div>
              <h3 className="tech-card-title">Profit-инструменты</h3>
            </div>
            <div className="tech-card-content">
              <div className="tech-stack-item">
                <strong>Настройка рекуррентов</strong>
                <p>Автоматическое продление подписок через платежные системы (ЮKassa, Prodamus, Robokassa) с уведомлениями и обработкой отказов</p>
              </div>
              <div className="tech-stack-item">
                <strong>Upsell-скрипты</strong>
                <p>Автоматические предложения допродаж на основе поведения клиента: в боте, в личном кабинете, через email-рассылки</p>
              </div>
              <div className="tech-stack-item">
                <strong>Системы лояльности</strong>
                <p>Программы накопления бонусов, персональные скидки, VIP-статусы с автоматическим начислением и списанием</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            className="money-tech-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
            whileHover={{ scale: 1.05, y: -10 }}
          >
            <div className="money-card-glow"></div>
            <div className="tech-card-header">
              <div className="tech-card-icon">📈</div>
              <h3 className="tech-card-title">Smart Analytics</h3>
            </div>
            <div className="tech-card-content">
              <div className="tech-stack-item">
                <strong>Интерактивный Dashboard (ROI/LTV)</strong>
                <p>Реальная прибыль в реальном времени: отслеживание LTV каждого клиента, ROI по каждому каналу, прогноз доходности</p>
              </div>
              <div className="tech-stack-item">
                <strong>Аналитика поведения</strong>
                <p>Детальная аналитика действий клиентов: что они смотрят, на что кликают, когда готовы к покупке</p>
              </div>
              <div className="tech-stack-item">
                <strong>Автоматические отчёты</strong>
                <p>Ежедневные/еженедельные отчёты о прибыли, конверсиях, оттоках и возможностях для роста</p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Блок "Результат" */}
      <motion.section 
        className="money-result-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.2 }}
      >
        <h2 className="money-section-title">Результат</h2>
        <motion.div 
          className="money-result-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 1.3 }}
          whileHover={{ scale: 1.02 }}
        >
          <div className="money-card-glow"></div>
          <div className="result-card-header">
            <div className="result-card-icon">🏆</div>
            <h3 className="result-card-title">Полная окупаемость (ROMI+) и бесконечный цикл реинвестирования</h3>
          </div>
          <div className="result-card-content">
            <div className="result-metrics">
              <div className="result-metric">
                <span className="metric-icon">💎</span>
                <div className="metric-content">
                  <div className="metric-label">ROMI+ (Return on Marketing Investment)</div>
                  <div className="metric-description">
                    Каждый вложенный рубль в трафик возвращается с прибылью. Система показывает точную окупаемость 
                    каждого канала и позволяет масштабировать только те, что приносят прибыль.
                  </div>
                </div>
              </div>
              <div className="result-metric">
                <span className="metric-icon">♾️</span>
                <div className="metric-content">
                  <div className="metric-label">Бесконечный цикл реинвестирования</div>
                  <div className="metric-description">
                    Прибыль от рекуррентов и допродаж автоматически реинвестируется в трафик. 
                    Система работает как самоподдерживающийся механизм: чем больше клиентов, тем больше прибыли, 
                    тем больше можно вложить в привлечение новых клиентов.
                  </div>
                </div>
              </div>
              <div className="result-metric">
                <span className="metric-icon">📊</span>
                <div className="metric-content">
                  <div className="metric-label">Масштабируемость без ограничений</div>
                  <div className="metric-description">
                    Система готова обрабатывать тысячи транзакций одновременно. Рекурренты работают автоматически, 
                    допродажи предлагаются без вашего участия, аналитика обновляется в реальном времени. 
                    Вы можете масштабировать бизнес, не увеличивая нагрузку на себя.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* Итоговый вывод */}
      <motion.section 
        className="money-conclusion-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.4 }}
      >
        <h2 className="money-section-title">Итоговый вывод</h2>
        <motion.div 
          className="money-conclusion-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 1.5 }}
        >
          <div className="money-card-glow"></div>
          <p className="conclusion-card-text">
            <strong>Ваша АИЦП полностью укомплектована и готова к масштабированию.</strong> 
            Система превращает разовые продажи в бесконечный цикл прибыли. Каждый клиент становится источником 
            многократных транзакций, а прибыль автоматически реинвестируется в рост. 
            Ваш бизнес работает как печатный станок — постоянно, автоматически, с предсказуемым результатом.
          </p>
          <div className="output-card-buttons">
            <button 
              className="money-cta-btn"
              onClick={() => {
                const message =
                  'Привет! Я прошел по всем этапам АИЦП на вашем сайте. Хочу обсудить внедрение такой системы и расчет окупаемости для моего продукта. Когда удобно пообщаться?'
                // IMPORTANT: open synchronously on click (user gesture).
                const opened = openTelegramChat('ilyaborm', message)
                // Then send analytics without blocking navigation.
                yandexMetricaReachGoal(null, 'contact_telegram_click', { placement: 'money_success_cta', opened })
              }}
            >
              Запустить мой финансовый успех
            </button>
          </div>
        </motion.div>
      </motion.section>
    </div>
  )

  const landingContent = (
    <div className="landing-new-container">
      {/* Hero-секция */}
      <motion.section 
        className="landing-hero"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="landing-hero-header">
          <img src={block.image} alt={block.name} className="landing-hero-image" />
          <div className="landing-hero-text">
            <h1 className="landing-hero-title">
              Лендинг<br />
              <span className="landing-hero-subtitle">Одностраничный сайт</span>
            </h1>
            <p className="landing-hero-offer">
              Задача которого максимально эффективно превращать анонимного посетителя в вашего потенциального клиента.
            </p>
          </div>
        </div>
      </motion.section>

      {/* Блок "Что на входе" */}
      <motion.section 
        className="landing-input-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <h2 className="landing-section-title">Что на входе</h2>
        <div className="landing-input-cards">
          <motion.div 
            className="landing-input-card"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="input-card-icon">✅</div>
            <h3 className="input-card-title">Валидированная гипотеза</h3>
            <div className="input-card-content">
              <p className="input-card-description">
                Оффер, на который люди точно кликают. Это не предположение, а проверенное данными предложение:
              </p>
              <ul className="input-card-list">
                <li><strong>Подтверждённый оффер:</strong> предложение, которое уже показало отклик аудитории на этапе "Аудитория"</li>
                <li><strong>Ясное УТП:</strong> уникальное торговое предложение, которое считывается аудиторией</li>
                <li><strong>Данные о сегментах:</strong> информация о подтверждённых сегментах аудитории и их поведении</li>
              </ul>
              <p className="input-card-note">
                Мы не "рисуем макеты" — мы проектируем воронку захвата на основе данных.
              </p>
            </div>
          </motion.div>
          
          <motion.div 
            className="landing-input-card"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="input-card-icon">📋</div>
            <h3 className="input-card-title">Техническое задание</h3>
            <div className="input-card-content">
              <p className="input-card-description">
                Логика распределения — кому и какой лид-магнит показать в зависимости от источника:
              </p>
              <ul className="input-card-list">
                <li><strong>Сегментация по источникам:</strong> разные источники трафика → разные лид-магниты</li>
                <li><strong>UTM-метки:</strong> сквозная разметка для точной идентификации источника</li>
                <li><strong>Логика маршрутизации:</strong> правила распределения пользователей по воронкам</li>
              </ul>
              <p className="input-card-note">
                Лендинг здесь выступает как интеллектуальный фильтр и шлюз между сырым трафиком и выдачей пользы.
              </p>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Блок "Что мы внедряем (Технологии)" */}
      <motion.section 
        className="landing-tech-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <h2 className="landing-section-title">Что мы внедряем (Технологии)</h2>
        
        {/* Интерфейсы */}
        <motion.div 
          className="landing-tech-category"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <h3 className="tech-category-title">Интерфейсы</h3>
          <p className="tech-category-description">
            Выбор под масштаб школы:
          </p>
          <div className="landing-tech-badges">
            <div className="tech-badge">
              <div className="tech-badge-icon">🎨</div>
              <div className="tech-badge-label">Tilda, Taplink, Wordpress</div>
              <div className="tech-badge-tools">Быстрое развёртывание</div>
            </div>
            <div className="tech-badge">
              <div className="tech-badge-icon">📚</div>
              <div className="tech-badge-label">GetCourse</div>
              <div className="tech-badge-tools">Интеграция с платформой</div>
            </div>
            <div className="tech-badge">
              <div className="tech-badge-icon">⚛️</div>
              <div className="tech-badge-label">Custom React</div>
              <div className="tech-badge-tools">Максимальная гибкость</div>
            </div>
          </div>
        </motion.div>

      </motion.section>

      {/* Выход и Результат */}
      <motion.section 
        className="landing-output-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.2 }}
      >
        <h2 className="landing-section-title">Выход и Результат</h2>
        <motion.div 
          className="landing-output-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 1.3 }}
          whileHover={{ scale: 1.02 }}
        >
          <div className="output-card-header">
            <div className="output-card-icon">🚀</div>
            <h3 className="output-card-title">Технически готовый "Трамплин"</h3>
          </div>
          <div className="output-card-content">
            <p className="output-card-text">
              На выходе вы получаете <strong>технически готовый лендинг</strong>, который:
            </p>
            <div className="output-card-features">
              <div className="output-feature">
                <span className="feature-check">✓</span>
                <span><strong>Мгновенная передача данных:</strong> TG ID / Email / Phone переданы в систему автоматизации</span>
              </div>
              <div className="output-feature">
                <span className="feature-check">✓</span>
                <span><strong>Бесшовная интеграция:</strong> данные пользователя сразу попадают в воронку лид-магнита</span>
              </div>
              <div className="output-feature">
                <span className="feature-check">✓</span>
                <span><strong>Метрика успеха:</strong> максимальный % конверсии из клика в подписку</span>
              </div>
              <div className="output-feature">
                <span className="feature-check">✓</span>
                <span><strong>Интеллектуальный фильтр:</strong> лендинг определяет, какой лид-магнит показать каждому пользователю</span>
              </div>
            </div>
          </div>
          <div className="output-card-buttons">
            <button 
              className="output-next-stage-btn"
              onClick={() => {
                if (onNextBlock) {
                  onNextBlock()
                } else {
                  onBack()
                }
              }}
            >
              Перейти к этапу: Лид-магнит
            </button>
            <button 
              className="consultation-btn"
              onClick={onConsultation}
            >
              Получить бесплатную консультацию
            </button>
          </div>
        </motion.div>
      </motion.section>
    </div>
  )

  const handleHeaderHomeClick = () => {
    // Вернуться на пустую главную страницу
    if (onHomeClick) onHomeClick()
  }

  return (
    <div className={`block-detail-container ${isProductBlock ? 'product-page' : ''} ${isMoneyBlock ? 'money-page' : ''}`}>
      <Header 
        onAvatarClick={onAvatarClick}
        // Top CTA in Header should lead to Diagnostics; stage CTAs use onConsultation (Telegram).
        onConsultation={onDiagnostics || onConsultation}
        onBack={onBack}
        onAlchemyClick={onAlchemyClick}
        onHomeClick={handleHeaderHomeClick}
      />
      
      <div className="block-detail-content">
        {!isAudienceBlock && !isLandingBlock && !isLeadmagnetBlock && !isTripwireBlock && !isAutofunnelBlock && !isProductBlock && !isMoneyBlock && (
          <div className="block-detail-header">
            <img src={block.image} alt={block.name} className="block-detail-image" />
            <h1 className="block-detail-title">{block.name}</h1>
          </div>
        )}

        {isAudienceBlock ? (
          audienceContent
        ) : isLandingBlock ? (
          landingContent
        ) : isLeadmagnetBlock ? (
          leadmagnetContent
        ) : isTripwireBlock ? (
          tripwireContent
        ) : isAutofunnelBlock ? (
          autofunnelContent
        ) : isProductBlock ? (
          productContent
        ) : isMoneyBlock ? (
          moneyContent
        ) : (
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
        )}
      </div>
    </div>
  )
}

export default BlockDetail
