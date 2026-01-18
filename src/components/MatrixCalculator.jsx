import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import './MatrixCalculator.css'

// Функция для приведения числа к диапазону 1-22
const reduceToArcana = (num) => {
  while (num > 22) {
    num -= 22
  }
  while (num < 1) {
    num += 22
  }
  return num
}

// Функция для суммирования цифр числа
const sumDigits = (num) => {
  let sum = 0
  while (num > 0) {
    sum += num % 10
    num = Math.floor(num / 10)
  }
  return sum
}

// Функция для вычисления цифрового корня (1-9)
const digitalRoot = (num) => {
  let result = num
  while (result > 9) {
    result = sumDigits(result)
  }
  return result === 0 ? 9 : result
}

// Методики для сканирования
const methods = [
  { id: 'matrix', name: '🔮 Матрица судьбы' },
  { id: 'money', name: '💰 Код денег' },
  { id: 'humandesign', name: '⚡ HumanDesign' },
  { id: 'pythagoras', name: '🌟 Квадрат Пифагора' },
  { id: 'soul', name: '✨ Дизайн Души' },
  { id: 'jung', name: '🎭 Архетипы по Юнгу' }
]

// Описания методов
const methodDescriptions = {
  matrix: 'Древняя система самопознания на стыке нумерологии и 22 старших арканов Таро.',
  money: 'Алгоритм вычисления финансовой емкости на основе 9 ключевых энергий.',
  humandesign: 'Механика человека: расчет генетического типа и стратегии принятия решений.',
  pythagoras: 'Анализ сильных сторон личности и врожденных талантов по дате рождения.',
  soul: 'Астрологическая формула, показывающая положение планет в момент вашего воплощения.',
  jung: 'Определение доминирующей модели поведения и теневых сторон личности.'
}

// Расчет результатов для всех методик
const calculateAllMethods = (dateString) => {
  const [day, month, year] = dateString.split('.').map(Number)
  const daySum = sumDigits(day)
  const monthSum = sumDigits(month)
  const yearSum = sumDigits(year)
  
  // Матрица судьбы - аркан дня рождения (до 22)
  const matrixArcana = reduceToArcana(day)
  const matrixResult = `Ваш аркан дня рождения — ${matrixArcana}. Это ключевая энергия, определяющая вашу жизненную силу и предназначение. Аркан ${matrixArcana} раскрывает ваши скрытые таланты и жизненный путь.`
  
  // Код денег - цифровой корень от суммы всех цифр даты рождения (1-9)
  // Суммируем все цифры даты отдельно
  const allDigitsSum = daySum + monthSum + yearSum
  const moneyCode = digitalRoot(allDigitsSum)
  const moneyResult = `Ваш код денег — ${moneyCode}. Эта энергия определяет ваши финансовые возможности и способы привлечения изобилия. Код ${moneyCode} показывает, как вы взаимодействуете с денежными потоками.`
  
  // HumanDesign - на основе четности дня
  const humanDesignTypes = ['Манифестор', 'Генератор', 'Проектор', 'Рефлектор']
  const humanDesignType = humanDesignTypes[day % 4]
  const humanDesignStrategies = [
    'информировать перед действием',
    'отвечать на запросы жизни',
    'ждать приглашения',
    'ждать лунного цикла'
  ]
  const humanDesignResult = `Ваш тип — ${humanDesignType}. Ваша стратегия — ${humanDesignStrategies[day % 4]}. Это определяет ваш способ взаимодействия с миром и принятия решений.`
  
  // Квадрат Пифагора - на основе четности месяца
  const pythagorasTypes = ['Аналитик', 'Интуитивист', 'Практик', 'Философ']
  const pythagorasType = pythagorasTypes[month % 4]
  const pythagorasResult = `Ваш профиль — ${pythagorasType}. Вы обладаете ${month % 2 === 0 ? 'логическим мышлением и системным подходом к решению задач' : 'глубокой интуицией и творческим видением мира'}.`
  
  // Дизайн Души - на основе четности года
  const soulTypes = ['Солнечный', 'Лунный', 'Звездный', 'Планетарный']
  const soulType = soulTypes[year % 4]
  const soulResult = `Ваш дизайн — ${soulType}. Ваша душа стремится к ${year % 2 === 0 ? 'активному проявлению, лидерству и влиянию на окружающих' : 'внутренней гармонии, созерцанию и глубокому пониманию жизни'}.`
  
  // Архетипы по Юнгу - остаток от деления дня на 12
  const jungArchetypes = [
    'Мудрец', 'Герой', 'Маг', 'Бунтарь', 'Любовник', 'Создатель',
    'Правитель', 'Опекун', 'Невинный', 'Искатель', 'Мудрец', 'Шут'
  ]
  const jungIndex = (day - 1) % 12
  const jungArchetype = jungArchetypes[jungIndex]
  const jungResult = `Ваш доминирующий архетип — ${jungArchetype}. Это определяет вашу модель поведения, способы взаимодействия с миром и проявление теневых сторон личности.`
  
  return {
    matrix: { result: matrixResult, value: matrixArcana },
    money: { result: moneyResult, value: moneyCode },
    humandesign: { result: humanDesignResult, value: humanDesignType },
    pythagoras: { result: pythagorasResult, value: pythagorasType },
    soul: { result: soulResult, value: soulType },
    jung: { result: jungResult, value: jungArchetype }
  }
}

// Генерация PDF через HTML (для поддержки кириллицы)
const generatePDF = (methodName, methodId, resultData, birthDate) => {
  // Создаем временный HTML элемент - ПОЛНОСТЬЮ ВИДИМЫЙ на экране
  const element = document.createElement('div')
  element.id = 'pdf-content'
  element.style.position = 'fixed'
  element.style.top = '50%'
  element.style.left = '50%'
  element.style.transform = 'translate(-50%, -50%)'
  element.style.width = '794px'
  element.style.minHeight = '1123px'
  element.style.maxHeight = '90vh'
  element.style.overflow = 'auto'
  element.style.padding = '0'
  element.style.margin = '0'
  element.style.background = '#ffffff'
  element.style.color = '#282828'
  element.style.fontFamily = "'Inter', 'Arial', sans-serif"
  element.style.zIndex = '99999'
  element.style.boxSizing = 'border-box'
  element.style.border = '2px solid #FFD700'
  element.style.boxShadow = '0 0 50px rgba(0,0,0,0.8)'
  element.style.visibility = 'visible'
  element.style.opacity = '1'
  element.style.display = 'block'
  
  element.innerHTML = `
    <div style="
      width: 100%;
      min-height: 1123px;
      background: #ffffff;
      padding: 0;
      margin: 0;
      box-sizing: border-box;
      position: relative;
    ">
      <!-- Золотая полоса сверху -->
      <div style="
        width: 100%;
        height: 38px;
        background: #FFD700;
        margin: 0;
        padding: 0;
      "></div>
      
      <!-- Темная область для заголовка -->
      <div style="
        width: 100%;
        background: #191923;
        padding: 57px 76px;
        margin: 0;
        box-sizing: border-box;
      ">
        <h1 style="
          color: #FFD700;
          font-size: 28px;
          font-weight: 700;
          text-align: center;
          margin: 0;
          padding: 0;
          letter-spacing: 1px;
          font-family: 'Inter', 'Arial', sans-serif;
        ">${methodName}</h1>
      </div>
      
      <!-- Белый контент -->
      <div style="
        width: 100%;
        background: #ffffff;
        padding: 76px;
        box-sizing: border-box;
        position: relative;
        min-height: calc(1123px - 152px);
      ">
        <!-- Дата рождения -->
        <p style="
          color: #505050;
          font-size: 14px;
          text-align: center;
          margin: 0 0 38px 0;
          padding: 0;
          font-family: 'Inter', 'Arial', sans-serif;
        ">Дата рождения: ${birthDate}</p>
        
        <!-- Разделительная линия -->
        <div style="
          width: 100%;
          height: 2px;
          background: #FFD700;
          margin: 0 0 57px 0;
        "></div>
        
        <!-- Основной текст -->
        <div style="
          color: #282828;
          font-size: 13px;
          line-height: 1.8;
          margin: 0 0 57px 0;
          text-align: justify;
          font-family: 'Inter', 'Arial', sans-serif;
        ">${resultData.result.replace(/\n/g, '<br>')}</div>
        
        ${resultData.value ? `
        <!-- Ключевое значение -->
        <div style="
          background: #FFF6E6;
          border-left: 4px solid #FFD700;
          padding: 30px;
          margin: 57px 0;
          border-radius: 4px;
        ">
          <p style="
            color: #C89600;
            font-size: 13px;
            font-weight: 700;
            margin: 0;
            padding: 0;
            font-family: 'Inter', 'Arial', sans-serif;
          ">Ключевое значение: ${resultData.value}</p>
        </div>
        ` : ''}
        
        <!-- Футер -->
        <div style="
          position: absolute;
          bottom: 38px;
          left: 76px;
          right: 76px;
          text-align: center;
          color: #969696;
          font-size: 10px;
          font-style: italic;
          font-family: 'Inter', 'Arial', sans-serif;
        ">
          <p style="margin: 0; padding: 0;">Цифровая Алхимия - Персональная расшифровка</p>
        </div>
      </div>
    </div>
  `
  
  // Добавляем элемент в DOM - он будет видимым на экране
  document.body.appendChild(element)
  
  // Ждем полного рендеринга и генерируем PDF напрямую через html2canvas
  setTimeout(() => {
    // Важно: убираем overflow и maxHeight, чтобы html2canvas видел весь контент
    element.style.overflow = 'visible'
    element.style.maxHeight = 'none'
    element.style.height = 'auto'
    
    // Получаем реальные размеры контента
    const contentDiv = element.querySelector('div')
    const contentHeight = contentDiv ? contentDiv.scrollHeight : element.scrollHeight
    const contentWidth = element.offsetWidth || 794
    
    console.log('Generating PDF:', {
      elementWidth: element.offsetWidth,
      elementHeight: element.offsetHeight,
      scrollHeight: element.scrollHeight,
      contentHeight: contentHeight
    })
    
    // Используем html2canvas БЕЗ указания фиксированных размеров
    html2canvas(element, {
      scale: 2,
      useCORS: true,
      letterRendering: true,
      logging: false,
      backgroundColor: '#ffffff',
      allowTaint: true,
      scrollX: 0,
      scrollY: 0
      // НЕ указываем width и height - пусть html2canvas сам определит
    }).then((canvas) => {
      console.log('Canvas created:', canvas.width, 'x', canvas.height)
      
      // Создаем PDF из canvas
      const imgData = canvas.toDataURL('image/png', 1.0) // Используем PNG для лучшего качества
      const pdf = new jsPDF({
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      })
      
      // Размеры A4 в мм
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const margin = 10 // отступы по 10мм
      const usableWidth = pdfWidth - 2 * margin
      const usableHeight = pdfHeight - 2 * margin
      
      // Размеры canvas в мм (canvas.width в пикселях с учетом scale=2)
      const imgWidth = (canvas.width / 2) * 0.264583 // конвертируем пиксели в мм
      const imgHeight = (canvas.height / 2) * 0.264583
      
      // Рассчитываем масштаб для вписывания в доступную область
      const ratio = Math.min(usableWidth / imgWidth, usableHeight / imgHeight)
      const finalWidth = imgWidth * ratio
      const finalHeight = imgHeight * ratio
      
      // Если контент не помещается на одну страницу, разбиваем на несколько
      if (finalHeight > usableHeight) {
        // Разбиваем на несколько страниц
        const pageHeight = usableHeight
        let yPosition = 0
        let pageNum = 0
        
        while (yPosition < canvas.height) {
          if (pageNum > 0) {
            pdf.addPage()
          }
          
          // Высота части, которую поместим на эту страницу
          const sourceHeight = Math.min(pageHeight / (ratio * 0.264583 * 2), canvas.height - yPosition)
          
          // Создаем canvas для этой части
          const pageCanvas = document.createElement('canvas')
          pageCanvas.width = canvas.width
          pageCanvas.height = sourceHeight
          const ctx = pageCanvas.getContext('2d')
          ctx.drawImage(canvas, 0, yPosition, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight)
          
          const pageImgData = pageCanvas.toDataURL('image/png', 1.0)
          const pageFinalHeight = (sourceHeight / 2) * 0.264583 * ratio
          
          pdf.addImage(pageImgData, 'PNG', margin, margin, usableWidth, pageFinalHeight)
          
          yPosition += sourceHeight
          pageNum++
        }
      } else {
        // Контент помещается на одну страницу
        pdf.addImage(imgData, 'PNG', margin, margin, finalWidth, finalHeight)
      }
      
      // Сохраняем PDF
      pdf.save(`${methodName.replace(/\s+/g, '_')}_${birthDate.replace(/\./g, '_')}.pdf`)
      
      console.log('PDF saved successfully')
      
      // Удаляем элемент
      setTimeout(() => {
        if (element.parentNode) {
          document.body.removeChild(element)
        }
      }, 500)
    }).catch((error) => {
      console.error('Ошибка при генерации PDF:', error)
      if (element.parentNode) {
        document.body.removeChild(element)
      }
    })
  }, 1000)
}

function MatrixCalculator() {
  const [birthDate, setBirthDate] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [completedMethods, setCompletedMethods] = useState([])
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')
  const [selectedMethod, setSelectedMethod] = useState(null)

  const handleCalculate = () => {
    if (!birthDate) {
      setError('Пожалуйста, введите дату рождения')
      return
    }

    // Проверка формата даты
    const dateRegex = /^\d{2}\.\d{2}\.\d{4}$/
    if (!dateRegex.test(birthDate)) {
      setError('Пожалуйста, введите дату в формате ДД.ММ.ГГГГ')
      return
    }

    // Валидация даты
    const [day, month, year] = birthDate.split('.').map(Number)
    if (day < 1 || day > 31) {
      setError('День должен быть от 1 до 31')
      return
    }
    if (month < 1 || month > 12) {
      setError('Месяц должен быть от 1 до 12')
      return
    }
    if (year < 1900 || year > new Date().getFullYear()) {
      setError(`Год должен быть от 1900 до ${new Date().getFullYear()}`)
      return
    }

    // Проверка корректности даты
    const date = new Date(year, month - 1, day)
    if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
      setError('Введена некорректная дата')
      return
    }

    setError('')
    setIsScanning(true)
    setCompletedMethods([])
    setResults(null)

    // Анимация сканирования - последовательное появление галочек
    methods.forEach((method, index) => {
      setTimeout(() => {
        setCompletedMethods(prev => [...prev, method.id])
        
        // После завершения всех методов показываем результаты
        if (index === methods.length - 1) {
          setTimeout(() => {
            const calculatedResults = calculateAllMethods(birthDate)
            setResults(calculatedResults)
            setIsScanning(false)
          }, 800)
        }
      }, (index + 1) * 800) // Задержка 0.8 секунды между каждым методом
    })
  }

  const handleDateChange = (e) => {
    let value = e.target.value.replace(/\D/g, '') // Только цифры
    
    // Форматирование ДД.ММ.ГГГГ
    if (value.length >= 2) {
      value = value.slice(0, 2) + '.' + value.slice(2)
    }
    if (value.length >= 5) {
      value = value.slice(0, 5) + '.' + value.slice(5, 9)
    }
    
    setBirthDate(value)
    setError('')
    setResults(null)
    setCompletedMethods([])
  }

  const handleDownloadPDF = (methodId, methodName) => {
    if (results && results[methodId]) {
      generatePDF(methodName, methodId, results[methodId], birthDate)
    }
  }

  return (
    <div className="matrix-calculator">
      <div className="matrix-input-section">
        <label htmlFor="birthDate" className="matrix-label">
          Дата рождения
        </label>
        <input
          id="birthDate"
          type="text"
          className="matrix-input"
          placeholder="ДД.ММ.ГГГГ"
          value={birthDate}
          onChange={handleDateChange}
          maxLength={10}
          disabled={isScanning}
        />
        {error && <div className="matrix-error">{error}</div>}
        
        <motion.button
          className="matrix-button"
          onClick={handleCalculate}
          disabled={isScanning}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isScanning ? 'Сканирование...' : 'Рассчитать влияние планет на судьбу'}
        </motion.button>
      </div>

      {/* Анимация сканирования */}
      <AnimatePresence>
        {isScanning && (
          <motion.div
            className="scanning-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <h3 className="scanning-title">Сканирование систем...</h3>
            <div className="methods-list">
              {methods.map((method, index) => (
                <motion.div
                  key={method.id}
                  className="method-item"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ 
                    opacity: 1, 
                    x: 0,
                    transition: { delay: index * 0.1 }
                  }}
                >
                  <span className="method-name">{method.name}</span>
                  <AnimatePresence>
                    {completedMethods.includes(method.id) && (
                      <motion.span
                        className="checkmark"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      >
                        ✓
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Результаты */}
      <AnimatePresence>
        {results && !isScanning && (
          <motion.div
            className="results-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="results-title">Результаты анализа</h3>
            <div className="results-grid">
              {methods.map((method, index) => (
                <motion.div
                  key={method.id}
                  className="result-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <h4 
                    className="card-title"
                    onClick={() => setSelectedMethod(method.id)}
                  >
                    {method.name}
                  </h4>
                  <p className="card-result">✨ {results[method.id]?.result}</p>
                  <motion.button
                    className="card-download-button"
                    onClick={() => handleDownloadPDF(method.id, method.name)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Скачать полную расшифровку (PDF)
                  </motion.button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Модальное окно с описанием метода */}
      <AnimatePresence>
        {selectedMethod && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedMethod(null)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="modal-close"
                onClick={() => setSelectedMethod(null)}
              >
                ×
              </button>
              <h3 className="modal-title">
                {methods.find(m => m.id === selectedMethod)?.name}
              </h3>
              <p className="modal-description">
                {methodDescriptions[selectedMethod]}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default MatrixCalculator
