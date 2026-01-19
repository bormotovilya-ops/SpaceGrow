import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import astroData from '../../scripts/astroData.json'
import interpretations from '../../scripts/interpretations.json'
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
  { id: 'soul', name: '✨ Формула Души' },
  { id: 'jung', name: '🎭 Архетипы по Юнгу' }
]

// Описания методов
const methodDescriptions = {
  matrix: 'Древняя система самопознания на стыке нумерологии и 22 старших арканов Таро.',
  money: 'Алгоритм вычисления финансовой емкости на основе 9 ключевых энергий.',
  humandesign: 'Механика человека: расчет генетического типа и стратегии принятия решений.',
  pythagoras: 'Анализ сильных сторон личности и врожденных талантов по дате рождения.',
  soul: 'Расчет цепочек диспозиторов на основе точного времени и места рождения. Показывает центры Формулы Души, орбиты планет и их баллы.',
  jung: 'Определение доминирующей модели поведения и теневых сторон личности.'
}

// Планеты для расчета Формулы Души
const PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']

// Русские названия планет
const PLANET_NAMES = {
  Sun: 'Солнце',
  Moon: 'Луна',
  Mercury: 'Меркурий',
  Venus: 'Венера',
  Mars: 'Марс',
  Jupiter: 'Юпитер',
  Saturn: 'Сатурн',
  Uranus: 'Уран',
  Neptune: 'Нептун',
  Pluto: 'Плутон'
}

// Иконки планет
const PLANET_ICONS = {
  Sun: '☀️',
  Moon: '🌙',
  Mercury: '☿',
  Venus: '♀',
  Mars: '♂',
  Jupiter: '♃',
  Saturn: '♄',
  Uranus: '♅',
  Neptune: '♆',
  Pluto: '♇'
}

// Русские названия знаков
const SIGN_NAMES = {
  Aries: 'Овен',
  Taurus: 'Телец',
  Gemini: 'Близнецы',
  Cancer: 'Рак',
  Leo: 'Лев',
  Virgo: 'Дева',
  Libra: 'Весы',
  Scorpio: 'Скорпион',
  Sagittarius: 'Стрелец',
  Capricorn: 'Козерог',
  Aquarius: 'Водолей',
  Pisces: 'Рыбы'
}

/**
 * Геокодинг города через Nominatim API
 */
async function geocodeCity(cityName) {
  if (!cityName || !cityName.trim()) {
    throw new Error('Название города не может быть пустым')
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}&limit=1`,
      {
        headers: {
          'User-Agent': 'SoulFormulaApp/1.0'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Ошибка геокодинга: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data || data.length === 0) {
      throw new Error('Город не найден. Попробуйте указать более точное название.')
    }

    const result = data[0]
    return {
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon)
    }
  } catch (error) {
    console.error('Ошибка геокодинга:', error)
    throw error
  }
}

/**
 * Упрощенный расчет эфемерид (fallback)
 */
function calculateSimpleEphemeris(date, time) {
  const [year, month, day] = date.split('-').map(Number)
  const dateObj = new Date(year, month - 1, day)
  const dayOfYear = Math.floor((dateObj - new Date(year, 0, 0)) / 1000 / 60 / 60 / 24)
  
  const signs = Object.keys(astroData.rulers)
  const result = {}
  
  PLANETS.forEach((planet, index) => {
    const signIndex = (dayOfYear + index * 30) % signs.length
    result[planet] = signs[signIndex]
  })
  
  return result
}

/**
 * Получение эфемерид
 */
async function getEphemeris(date, time, lat, lon) {
  try {
    const response = await fetch(
      `https://api.freeastrologyapi.com/planets?date=${date}&time=${time}&lat=${lat}&lon=${lon}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      }
    ).catch(() => null)

    if (response && response.ok) {
      const data = await response.json()
      return data
    }

    console.warn('API недоступен, используем упрощенный расчет')
    return calculateSimpleEphemeris(date, time)
  } catch (error) {
    console.error('Ошибка получения эфемерид:', error)
    return calculateSimpleEphemeris(date, time)
  }
}

/**
 * Построение графа диспозиторов
 */
function buildDispositorGraph(planetSigns) {
  const graph = {}
  
  PLANETS.forEach(planet => {
    const sign = planetSigns[planet]
    if (sign && astroData.rulers[sign]) {
      graph[planet] = astroData.rulers[sign]
    }
  })
  
  return graph
}

/**
 * Поиск центров
 */
function findCenters(graph) {
  const centers = {
    domiciles: [],
    mutualReceptions: [],
    cycles: []
  }
  
  // Обители
  PLANETS.forEach(planet => {
    if (graph[planet] === planet) {
      centers.domiciles.push(planet)
    }
  })
  
  // Взаимные рецепции
  const checked = new Set()
  PLANETS.forEach(planetA => {
    if (checked.has(planetA)) return
    
    const rulerA = graph[planetA]
    if (rulerA && graph[rulerA] === planetA && planetA !== rulerA) {
      centers.mutualReceptions.push([planetA, rulerA])
      checked.add(planetA)
      checked.add(rulerA)
    }
  })
  
  // Циклы
  const visited = new Set()
  const cyclesFound = new Set()
  
  function findCycle(planet, path = []) {
    const cycleStart = path.indexOf(planet)
    if (cycleStart !== -1) {
      const cycle = path.slice(cycleStart)
      if (cycle.length >= 3) {
        const cycleKey = cycle.sort().join('-')
        if (!cyclesFound.has(cycleKey)) {
          centers.cycles.push([...cycle])
          cyclesFound.add(cycleKey)
        }
      }
      return
    }
    
    if (visited.has(planet)) {
      return
    }
    
    visited.add(planet)
    const newPath = [...path, planet]
    
    const nextPlanet = graph[planet]
    if (nextPlanet) {
      findCycle(nextPlanet, newPath)
    }
    
    visited.delete(planet)
  }
  
  PLANETS.forEach(planet => {
    if (graph[planet]) {
      findCycle(planet)
    }
  })
  
  const allCenters = new Set()
  centers.domiciles.forEach(p => allCenters.add(p))
  centers.mutualReceptions.forEach(pair => {
    pair.forEach(p => allCenters.add(p))
  })
  centers.cycles.forEach(cycle => {
    cycle.forEach(p => allCenters.add(p))
  })
  
  return {
    ...centers,
    all: Array.from(allCenters)
  }
}

/**
 * Определение орбит
 */
function calculateOrbits(graph, centers) {
  const orbits = {}
  
  centers.forEach(center => {
    orbits[center] = 0
  })
  
  const queue = [...centers]
  const visited = new Set(centers)
  
  while (queue.length > 0) {
    const current = queue.shift()
    const currentOrbit = orbits[current] || 0
    
    PLANETS.forEach(planet => {
      if (graph[planet] === current && !visited.has(planet)) {
        orbits[planet] = currentOrbit + 1
        visited.add(planet)
        queue.push(planet)
      }
    })
  }
  
  PLANETS.forEach(planet => {
    if (!(planet in orbits)) {
      orbits[planet] = 999
    }
  })
  
  return orbits
}

/**
 * Расчет баллов планет
 */
function calculatePoints(planetSigns) {
  const points = {}
  
  PLANETS.forEach(planet => {
    const sign = planetSigns[planet]
    if (!sign) {
      points[planet] = astroData.default_points
      return
    }
    
    if (astroData.points[planet] && astroData.points[planet][sign] !== undefined) {
      points[planet] = astroData.points[planet][sign]
    } else {
      points[planet] = astroData.default_points
    }
  })
  
  return points
}

/**
 * Расчет Числа Судьбы (сумма всех цифр даты рождения до однозначного)
 */
function calculateDestinyNumber(dateString) {
  const [day, month, year] = dateString.split('.').map(Number)
  const dateStr = `${day}${month}${year}`
  let sum = 0
  
  for (let i = 0; i < dateStr.length; i++) {
    sum += parseInt(dateStr[i])
  }
  
  // Приводим к однозначному числу
  while (sum > 9) {
    sum = Math.floor(sum / 10) + (sum % 10)
  }
  
  return sum
}

/**
 * Формирование интерпретации для планеты в центре
 */
function getPlanetInterpretation(planet, isRetro, points) {
  const planetData = interpretations.planets[planet]
  if (!planetData) return ''
  
  let text = ''
  
  // Выбираем direct или retro
  if (isRetro) {
    text = planetData.retro || planetData.direct
  } else {
    text = planetData.direct
  }
  
  // Добавляем совет в зависимости от баллов
  if (points >= 0 && points <= 2) {
    text += '\n\n💡 ' + planetData.advice_low
  } else if (points >= 5 && points <= 6) {
    text += '\n\n💡 ' + planetData.advice_high
  }
  
  return text
}

/**
 * Расчет Формулы Души (упрощенная версия для предварительного результата)
 */
function calculateSoulFormula(planetSigns, dateString) {
  const graph = buildDispositorGraph(planetSigns)
  const centers = findCenters(graph)
  const orbits = calculateOrbits(graph, centers.all)
  const points = calculatePoints(planetSigns)
  
  // Упрощенный результат без интерпретаций
  let resultText = 'Формула Души показывает цепочки диспозиторов планет в вашей натальной карте.\n\n'
  
  if (centers.all.length > 0) {
    resultText += 'Центры Формулы Души:\n'
    
    if (centers.domiciles.length > 0) {
      resultText += `Обители: ${centers.domiciles.map(p => PLANET_NAMES[p]).join(', ')}\n`
    }
    
    if (centers.mutualReceptions.length > 0) {
      resultText += `Взаимные рецепции: ${centers.mutualReceptions.map(pair => 
        `${PLANET_NAMES[pair[0]]} ↔ ${PLANET_NAMES[pair[1]]}`
      ).join(', ')}\n`
    }
    
    if (centers.cycles.length > 0) {
      resultText += `Циклы: ${centers.cycles.map(cycle => 
        cycle.map(p => PLANET_NAMES[p]).join(' → ')
      ).join('; ')}\n`
    }
    
    resultText += '\nПланеты по орбитам:\n'
    const orbitsByLevel = {}
    PLANETS.forEach(planet => {
      const orbit = orbits[planet]
      if (orbit !== 999) {
        if (!orbitsByLevel[orbit]) {
          orbitsByLevel[orbit] = []
        }
        orbitsByLevel[orbit].push(`${PLANET_NAMES[planet]} (${points[planet]} баллов)`)
      }
    })
    
    Object.keys(orbitsByLevel).sort((a, b) => Number(a) - Number(b)).forEach(orbit => {
      resultText += `Орбита ${orbit}: ${orbitsByLevel[orbit].join(', ')}\n`
    })
  } else {
    resultText += 'Центры не найдены. Все планеты находятся на удаленных орбитах.'
  }
  
  return {
    result: resultText,
    value: centers.all.length > 0 ? `${centers.all.length} центр(ов)` : 'Нет центров',
    details: { centers, orbits, points, planetSigns, destinyNumber: calculateDestinyNumber(dateString) }
  }
}

/**
 * Генерация полного отчета Формулы Души с интерпретациями (для PDF)
 */
function generateFullSoulFormulaReport(details, dateString) {
  const { centers, orbits, points, planetSigns, destinyNumber } = details
  
  let resultText = '🌟 КОСМИЧЕСКИЙ ПУТЕВОДИТЕЛЬ 🌟\n\n'
  resultText += '═══════════════════════════════════\n\n'
  
  // 1. Ядро вашей личности (Центр)
  resultText += '⭐ ЯДРО ВАШЕЙ ЛИЧНОСТИ ⭐\n\n'
  
  if (centers.all.length > 0) {
    centers.all.forEach(planet => {
      const icon = PLANET_ICONS[planet] || '✨'
      const name = PLANET_NAMES[planet]
      const planetPoints = points[planet] || 2
      const isRetro = false // Можно улучшить, получая из API
      
      resultText += `${icon} ${name} (${planetPoints} баллов)\n`
      resultText += getPlanetInterpretation(planet, isRetro, planetPoints)
      resultText += '\n\n'
    })
    
    if (centers.domiciles.length > 0) {
      resultText += `🏠 Обители: ${centers.domiciles.map(p => `${PLANET_ICONS[p]} ${PLANET_NAMES[p]}`).join(', ')}\n\n`
    }
    
    if (centers.mutualReceptions.length > 0) {
      resultText += `🔄 Взаимные рецепции: ${centers.mutualReceptions.map(pair => 
        `${PLANET_ICONS[pair[0]]} ${PLANET_NAMES[pair[0]]} ↔ ${PLANET_ICONS[pair[1]]} ${PLANET_NAMES[pair[1]]}`
      ).join(', ')}\n\n`
    }
    
    if (centers.cycles.length > 0) {
      resultText += `🌀 Циклы: ${centers.cycles.map(cycle => 
        cycle.map(p => `${PLANET_ICONS[p]} ${PLANET_NAMES[p]}`).join(' → ')
      ).join('; ')}\n\n`
    }
  } else {
    resultText += 'Центры не найдены. Все планеты находятся на удаленных орбитах.\n\n'
  }
  
  resultText += '═══════════════════════════════════\n\n'
  
  // 2. Ваши инструменты (Орбиты)
  resultText += '🛠️ ВАШИ ИНСТРУМЕНТЫ 🛠️\n\n'
  
  const orbitsByLevel = {}
  PLANETS.forEach(planet => {
    const orbit = orbits[planet]
    if (orbit !== 999 && orbit >= 1 && orbit <= 5) {
      if (!orbitsByLevel[orbit]) {
        orbitsByLevel[orbit] = []
      }
      orbitsByLevel[orbit].push(`${PLANET_ICONS[planet]} ${PLANET_NAMES[planet]}`)
    }
  })
  
  Object.keys(orbitsByLevel).sort((a, b) => Number(a) - Number(b)).forEach(orbit => {
    const orbitInfo = interpretations.orbits_info[orbit]
    if (orbitInfo) {
      resultText += `Орбита ${orbit}: ${orbitInfo}\n`
      resultText += `Планеты: ${orbitsByLevel[orbit].join(', ')}\n\n`
    }
  })
  
  resultText += '═══════════════════════════════════\n\n'
  
  // 3. Числовой код (Нумерология)
  resultText += '🔢 ЧИСЛОВОЙ КОД 🔢\n\n'
  
  const numerologyText = interpretations.numerology[destinyNumber.toString()]
  
  if (numerologyText) {
    resultText += `Ваше Число Судьбы: ${destinyNumber}\n\n`
    resultText += numerologyText + '\n'
  }
  
  return resultText
}

/**
 * Генерация промо-блока DemoFooter
 */
function generateDemoFooter() {
  return `
    <!-- Премиальный промо-блок DemoFooter -->
    <div style="
      margin-top: 70px;
      padding: 40px 30px;
      background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 215, 0, 0.1) 50%, rgba(255, 215, 0, 0.15) 100%);
      border: 2px solid rgba(255, 215, 0, 0.5);
      border-radius: 20px;
      backdrop-filter: blur(10px);
      position: relative;
      box-shadow: 0 12px 50px rgba(255, 215, 0, 0.3);
      overflow: hidden;
    ">
      <!-- Декоративные элементы -->
      <div style="
        position: absolute;
        top: -50px;
        right: -50px;
        width: 200px;
        height: 200px;
        background: radial-gradient(circle, rgba(255, 215, 0, 0.1) 0%, transparent 70%);
        border-radius: 50%;
      "></div>
      <div style="
        position: absolute;
        bottom: -30px;
        left: -30px;
        width: 150px;
        height: 150px;
        background: radial-gradient(circle, rgba(255, 215, 0, 0.08) 0%, transparent 70%);
        border-radius: 50%;
      "></div>
      
      <!-- Заголовок в премиальном стиле -->
      <h3 style="
        color: #191923;
        font-size: 22px;
        font-weight: 700;
        text-align: center;
        margin: 0 0 25px 0;
        padding: 0;
        font-family: 'Inter', 'Arial', sans-serif;
        letter-spacing: 0.5px;
        position: relative;
        z-index: 1;
      ">🌌 Космический тест-драйв пройден!</h3>
      
      <!-- Разделитель -->
      <div style="
        width: 80px;
        height: 2px;
        background: linear-gradient(90deg, transparent 0%, #FFD700 50%, transparent 100%);
        margin: 0 auto 25px;
        border-radius: 2px;
      "></div>
      
      <!-- Текст в премиальном стиле -->
      <div style="position: relative; z-index: 1;">
        <p style="
          color: #3a3a3a;
          font-size: 13px;
          line-height: 1.9;
          margin: 0 0 20px 0;
          text-align: justify;
          font-family: 'Inter', 'Arial', sans-serif;
          font-weight: 400;
        ">Перед вами — демонстрация работы нашего аналитического движка. Мы подготовили этот экспресс-анализ, чтобы показать, как алгоритмы могут мгновенно превращать сухие цифры и эфемериды в живой текст.</p>
        
        <p style="
          color: #3a3a3a;
          font-size: 13px;
          line-height: 1.9;
          margin: 0 0 20px 0;
          text-align: justify;
          font-family: 'Inter', 'Arial', sans-serif;
          font-weight: 400;
        ">Это лишь верхушка айсберга: мы намеренно не стали погружать вас в бесконечные таблицы и сложные аспекты, чтобы оставить интерфейс легким, а интригу — живой.</p>
        
        <p style="
          color: #3a3a3a;
          font-size: 13px;
          line-height: 1.9;
          margin: 0 0 30px 0;
          text-align: justify;
          font-family: 'Inter', 'Arial', sans-serif;
          font-weight: 400;
        ">Мы создаем подобные инструменты «под ключ». Если вам нужен корректный астрологический, нумерологический или любой другой расчетный модуль для вашего бота, сайта или приложения — вы по адресу. Мы берем на себя всю математику и логику.</p>
      </div>
      
      <!-- Разделитель перед ссылкой -->
      <div style="
        width: 100%;
        height: 1px;
        background: linear-gradient(90deg, transparent 0%, rgba(255, 215, 0, 0.4) 50%, transparent 100%);
        margin: 35px 0;
      "></div>
      
      <!-- Текстовая ссылка для PDF в премиальном стиле -->
      <div style="
        text-align: center;
        padding: 15px 20px;
        background: linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 165, 0, 0.1) 100%);
        border: 2px solid rgba(255, 215, 0, 0.4);
        border-radius: 10px;
        color: #0066cc;
        font-size: 14px;
        font-weight: 700;
        font-family: 'Inter', 'Arial', sans-serif;
        text-decoration: underline;
        cursor: pointer;
        box-shadow: 0 2px 10px rgba(0, 102, 204, 0.15);
        position: relative;
        z-index: 1;
        letter-spacing: 0.3px;
      " id="pdf-text-link">🛠 Внедрить такой механизм себе: https://t.me/SpaceGrowthBot</div>
      
      <!-- Брендовая плашка в премиальном стиле -->
      <div style="
        text-align: center;
        padding-top: 25px;
        margin-top: 25px;
        border-top: 1px solid rgba(255, 215, 0, 0.3);
        color: #808080;
        font-size: 11px;
        font-style: italic;
        font-family: 'Inter', 'Arial', sans-serif;
        font-weight: 500;
        letter-spacing: 0.5px;
        position: relative;
        z-index: 1;
      ">
        Разработка: Бормотов Илья | SpaceGrow IT-Service
      </div>
    </div>
  `
}

// Расчет результатов для всех методик
const calculateAllMethods = async (dateString, timeString, cityName) => {
  const [day, month, year] = dateString.split('.').map(Number)
  const daySum = sumDigits(day)
  const monthSum = sumDigits(month)
  const yearSum = sumDigits(year)
  
  // Матрица судьбы - аркан дня рождения (до 22)
  const matrixArcana = reduceToArcana(day)
  const matrixResult = `Ваш аркан дня рождения — ${matrixArcana}. Это ключевая энергия, определяющая вашу жизненную силу и предназначение. Аркан ${matrixArcana} раскрывает ваши скрытые таланты и жизненный путь.`
  
  // Код денег - цифровой корень от суммы всех цифр даты рождения (1-9)
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
  
  // Формула Души - расчет на основе времени и места рождения
  let soulResult = { result: 'Для расчета Формулы Души необходимо указать время и место рождения.', value: 'Не указано' }
  if (timeString && cityName) {
    try {
      // Конвертируем дату из ДД.ММ.ГГГГ в ГГГГ-ММ-ДД
      const dateForAPI = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const coords = await geocodeCity(cityName)
      const planetSigns = await getEphemeris(dateForAPI, timeString, coords.lat, coords.lon)
      soulResult = calculateSoulFormula(planetSigns, dateString)
    } catch (error) {
      soulResult = { result: `Ошибка расчета Формулы Души: ${error.message}`, value: 'Ошибка' }
    }
  }
  
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
    soul: soulResult,
    jung: { result: jungResult, value: jungArchetype }
  }
}

// Helper: Конвертация base64 в Blob
function base64ToBlob(base64String) {
  // Убираем префикс data:application/pdf;base64, если он есть
  const base64Data = base64String.includes(',') 
    ? base64String.split(',')[1] 
    : base64String
  
  // Конвертируем base64 в бинарные данные
  const byteCharacters = atob(base64Data)
  const byteNumbers = new Array(byteCharacters.length)
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  
  const byteArray = new Uint8Array(byteNumbers)
  
  // Создаем Blob с типом application/pdf
  return new Blob([byteArray], { type: 'application/pdf' })
}

// Функция для показа PDF после генерации на сервере
function showPDFServerModal(pdfUrl, fileName, methodName, telegramSent = false) {
  const modal = document.createElement('div')
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.9);
    backdrop-filter: blur(10px);
    z-index: 999999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    overflow-y: auto;
  `
  
  const content = document.createElement('div')
  content.style.cssText = `
    background: linear-gradient(135deg, rgba(26, 26, 35, 0.98) 0%, rgba(15, 15, 25, 0.98) 100%);
    border: 2px solid rgba(255, 215, 0, 0.4);
    border-radius: 20px;
    padding: 30px;
    max-width: 500px;
    width: 100%;
    text-align: center;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    position: relative;
    margin: 20px 0;
  `
  
  const title = document.createElement('h3')
  title.textContent = '✅ PDF готов'
  title.style.cssText = `
    color: #FFD700;
    font-size: 24px;
    font-weight: 700;
    margin: 0 0 20px 0;
    letter-spacing: 1px;
  `
  
  const text = document.createElement('p')
  if (telegramSent) {
    text.textContent = 'PDF успешно сгенерирован на сервере и отправлен вам в Telegram! Проверьте сообщения в боте.'
  } else {
    text.textContent = 'PDF успешно сгенерирован на сервере! Используйте ссылку ниже для получения файла.'
  }
  text.style.cssText = `
    color: rgba(255, 255, 255, 0.9);
    font-size: 16px;
    margin: 0 0 25px 0;
    line-height: 1.6;
  `
  
  // Конвертируем base64 в Blob для использования в кнопках
  const blob = base64ToBlob(pdfUrl)
  
  const buttonsContainer = document.createElement('div')
  buttonsContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 15px;
  `
  
  // Кнопка для открытия/скачивания PDF
  const openBtn = createPDFButton('📥 Скачать PDF', () => {
    try {
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = fileName || 'result.pdf'
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100)
    } catch (error) {
      console.error('Ошибка скачивания:', error)
      alert('Ошибка скачивания файла')
    }
  })
  
  // Кнопка для просмотра в новой вкладке
  const viewBtn = createPDFButton('🔍 Просмотреть PDF', () => {
    try {
      const blobUrl = URL.createObjectURL(blob)
      window.open(blobUrl, '_blank')
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000)
    } catch (error) {
      console.error('Ошибка открытия:', error)
      alert('Ошибка открытия файла')
    }
  })
  
  buttonsContainer.appendChild(openBtn)
  buttonsContainer.appendChild(viewBtn)
  
  const closeBtn = document.createElement('button')
  closeBtn.textContent = '✕'
  closeBtn.style.cssText = `
    position: absolute;
    top: 15px;
    right: 15px;
    width: 36px;
    height: 36px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    color: #ffffff;
    font-size: 24px;
    font-weight: 300;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    transition: all 0.3s;
  `
  
  closeBtn.onmouseover = () => {
    closeBtn.style.background = 'rgba(255, 215, 0, 0.2)'
    closeBtn.style.borderColor = '#FFD700'
    closeBtn.style.color = '#FFD700'
  }
  closeBtn.onmouseout = () => {
    closeBtn.style.background = 'rgba(255, 255, 255, 0.1)'
    closeBtn.style.borderColor = 'rgba(255, 255, 255, 0.2)'
    closeBtn.style.color = '#ffffff'
  }
  
  const closeModal = () => {
    if (modal.parentNode) {
      document.body.removeChild(modal)
    }
  }
  
  closeBtn.onclick = closeModal
  modal.onclick = (e) => {
    if (e.target === modal) {
      closeModal()
    }
  }
  
  content.appendChild(closeBtn)
  content.appendChild(title)
  content.appendChild(text)
  content.appendChild(buttonsContainer)
  modal.appendChild(content)
  document.body.appendChild(modal)
  
  setTimeout(() => {
    if (modal.parentNode) {
      closeModal()
    }
  }, 300000) // 5 минут
}

// Функция для показа PDF на мобильных устройствах с 5 методами
function showPDFMobileModal(pdfDataUri, fileName, methodName) {
  // Конвертируем base64 в Blob для всех методов
  const blob = base64ToBlob(pdfDataUri)
  
  const modal = document.createElement('div')
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.9);
    backdrop-filter: blur(10px);
    z-index: 999999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    overflow-y: auto;
  `
  
  const content = document.createElement('div')
  content.style.cssText = `
    background: linear-gradient(135deg, rgba(26, 26, 35, 0.98) 0%, rgba(15, 15, 25, 0.98) 100%);
    border: 2px solid rgba(255, 215, 0, 0.4);
    border-radius: 20px;
    padding: 30px;
    max-width: 500px;
    width: 100%;
    text-align: center;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    position: relative;
    margin: 20px 0;
  `
  
  const title = document.createElement('h3')
  title.textContent = 'PDF готов'
  title.style.cssText = `
    color: #FFD700;
    font-size: 24px;
    font-weight: 700;
    margin: 0 0 20px 0;
    letter-spacing: 1px;
  `
  
  const text = document.createElement('p')
  text.textContent = 'Выберите способ получения PDF файла:'
  text.style.cssText = `
    color: rgba(255, 255, 255, 0.9);
    font-size: 16px;
    margin: 0 0 25px 0;
    line-height: 1.6;
  `
  
  const buttonsContainer = document.createElement('div')
  buttonsContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 15px;
  `
  
  // Проверка поддержки Web Share API
  const supportsShare = navigator.share && navigator.canShare
  
  // КНОПКА 1: Стандартный Blob
  const btn1 = createPDFButton('📥 Стандартный Blob', () => {
    try {
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = fileName || 'result.pdf'
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Очищаем память после небольшой задержки
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl)
      }, 100)
      
      if (modal.parentNode) document.body.removeChild(modal)
    } catch (error) {
      console.error('Ошибка при скачивании через Blob:', error)
      alert('Ошибка при скачивании файла. Попробуйте другой способ.')
    }
  })
  
  // КНОПКА 2: Поделиться (Native Share API)
  const btn2 = createPDFButton('📤 Поделиться (Native Share)', async () => {
    if (!supportsShare) {
      alert('Ваш браузер не поддерживает функцию "Поделиться". Попробуйте другой способ.')
      return
    }
    
    try {
      const file = new File([blob], fileName || 'result.pdf', { type: 'application/pdf' })
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: methodName || 'PDF результат',
          text: 'PDF файл с результатами'
        })
        
        if (modal.parentNode) document.body.removeChild(modal)
      } else {
        alert('Этот файл нельзя поделиться через Web Share API. Попробуйте другой способ.')
      }
    } catch (error) {
      // Пользователь отменил шаринг - это нормально, не показываем ошибку
      if (error.name !== 'AbortError') {
        console.error('Ошибка при использовании Web Share API:', error)
        alert('Ошибка при использовании функции "Поделиться". Попробуйте другой способ.')
      }
    }
  })
  
  // Если Web Share API не поддерживается, скрываем кнопку
  if (!supportsShare) {
    btn2.style.display = 'none'
  }
  
  // КНОПКА 3: Просмотр в новой вкладке
  const btn3 = createPDFButton('🔍 Просмотр в новой вкладке', () => {
    try {
      const blobUrl = URL.createObjectURL(blob)
      window.open(blobUrl, '_blank')
      
      // Очищаем память через некоторое время
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl)
      }, 60000) // 60 секунд должно хватить для открытия
      
      if (modal.parentNode) document.body.removeChild(modal)
    } catch (error) {
      console.error('Ошибка при открытии в новой вкладке:', error)
      alert('Ошибка при открытии файла. Попробуйте другой способ.')
    }
  })
  
  // КНОПКА 4: Концепция сервера (Log)
  const btn4 = createPDFButton('🌐 Концепция сервера (Log)', () => {
    const message = 'Здесь должен быть запрос POST /upload, который сохранит PDF на бэкенде и вернет прямую ссылку https://site.com/file.pdf'
    console.log(message)
    alert(message)
  })
  
  // КНОПКА 5: Копировать ссылку (Base64)
  const btn5 = createPDFButton('📋 Копировать данные в буфер', async () => {
    try {
      await navigator.clipboard.writeText(pdfDataUri)
      btn5.textContent = '✓ Скопировано!'
      btn5.style.background = 'linear-gradient(135deg, #40E0D0 0%, #20B2AA 100%)'
      
      setTimeout(() => {
        btn5.textContent = '📋 Копировать данные в буфер'
        btn5.style.background = 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)'
      }, 3000)
    } catch (error) {
      console.error('Ошибка копирования:', error)
      alert('Ошибка копирования. Попробуйте вручную скопировать данные.')
    }
  })
  
  buttonsContainer.appendChild(btn1)
  if (supportsShare) {
    buttonsContainer.appendChild(btn2)
  }
  buttonsContainer.appendChild(btn3)
  buttonsContainer.appendChild(btn4)
  buttonsContainer.appendChild(btn5)
  
  const closeBtn = document.createElement('button')
  closeBtn.textContent = '✕'
  closeBtn.style.cssText = `
    position: absolute;
    top: 15px;
    right: 15px;
    width: 36px;
    height: 36px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    color: #ffffff;
    font-size: 24px;
    font-weight: 300;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    transition: all 0.3s;
  `
  
  closeBtn.onmouseover = () => {
    closeBtn.style.background = 'rgba(255, 215, 0, 0.2)'
    closeBtn.style.borderColor = '#FFD700'
    closeBtn.style.color = '#FFD700'
  }
  closeBtn.onmouseout = () => {
    closeBtn.style.background = 'rgba(255, 255, 255, 0.1)'
    closeBtn.style.borderColor = 'rgba(255, 255, 255, 0.2)'
    closeBtn.style.color = '#ffffff'
  }
  
  const closeModal = () => {
    if (modal.parentNode) {
      document.body.removeChild(modal)
    }
  }
  
  closeBtn.onclick = closeModal
  modal.onclick = (e) => {
    if (e.target === modal) {
      closeModal()
    }
  }
  
  content.appendChild(closeBtn)
  content.appendChild(title)
  content.appendChild(text)
  content.appendChild(buttonsContainer)
  modal.appendChild(content)
  document.body.appendChild(modal)
  
  setTimeout(() => {
    if (modal.parentNode) {
      closeModal()
    }
  }, 300000) // 5 минут
}

// Функция создания кнопки для PDF (крупные кнопки для мобильных устройств)
function createPDFButton(text, onClick) {
  const btn = document.createElement('button')
  btn.textContent = text
  btn.style.cssText = `
    width: 100%;
    min-height: 60px;
    padding: 18px 24px;
    background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
    color: #0a0a0f;
    border: none;
    border-radius: 12px;
    font-weight: 700;
    font-size: 18px;
    box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
  `
  btn.onclick = onClick
  
  // Для мобильных устройств добавляем активное состояние при касании
  btn.ontouchstart = () => {
    btn.style.transform = 'scale(0.98)'
    btn.style.boxShadow = '0 2px 10px rgba(255, 215, 0, 0.5)'
  }
  
  btn.ontouchend = () => {
    btn.style.transform = 'translateY(0)'
    btn.style.boxShadow = '0 4px 15px rgba(255, 215, 0, 0.4)'
  }
  
  // Для десктопа
  btn.onmouseover = () => {
    btn.style.transform = 'translateY(-2px)'
    btn.style.boxShadow = '0 6px 25px rgba(255, 215, 0, 0.6)'
  }
  
  btn.onmouseout = () => {
    btn.style.transform = 'translateY(0)'
    btn.style.boxShadow = '0 4px 15px rgba(255, 215, 0, 0.4)'
  }
  
  return btn
}

// ВАРИАНТ 1: Показ QR-кода с data URI (улучшенная версия)
function showPDFQRCode(pdfDataUri, fileName, methodName) {
  const modal = document.createElement('div')
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.9);
    backdrop-filter: blur(10px);
    z-index: 999999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    overflow-y: auto;
  `
  
  const content = document.createElement('div')
  content.style.cssText = `
    background: linear-gradient(135deg, rgba(26, 26, 35, 0.98) 0%, rgba(15, 15, 25, 0.98) 100%);
    border: 2px solid rgba(255, 215, 0, 0.4);
    border-radius: 20px;
    padding: 30px;
    max-width: 500px;
    width: 100%;
    text-align: center;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    position: relative;
  `
  
  const title = document.createElement('h3')
  title.textContent = '📱 QR-код для получения PDF'
  title.style.cssText = `
    color: #FFD700;
    font-size: 24px;
    font-weight: 700;
    margin: 0 0 15px 0;
    letter-spacing: 1px;
  `
  
  const qrText = document.createElement('p')
  qrText.textContent = 'Скопируйте data URI ниже и вставьте в адресную строку браузера для просмотра PDF:'
  qrText.style.cssText = `
    color: rgba(255, 255, 255, 0.9);
    font-size: 14px;
    margin: 0 0 20px 0;
    line-height: 1.6;
  `
  
  const linkText = document.createElement('textarea')
  linkText.value = pdfDataUri
  linkText.style.cssText = `
    width: 100%;
    height: 150px;
    margin: 10px 0;
    padding: 15px;
    background: rgba(0, 0, 0, 0.5);
    border: 2px solid rgba(255, 215, 0, 0.3);
    border-radius: 10px;
    font-size: 11px;
    font-family: monospace;
    color: #fff;
    resize: vertical;
    word-break: break-all;
  `
  linkText.readOnly = true
  
  const copyBtn = document.createElement('button')
  copyBtn.textContent = '📋 Скопировать data URI'
  copyBtn.style.cssText = `
    width: 100%;
    padding: 15px 20px;
    background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
    color: #0a0a0f;
    border: none;
    border-radius: 10px;
    font-weight: 700;
    font-size: 16px;
    cursor: pointer;
    margin: 15px 0;
    box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
  `
  copyBtn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(pdfDataUri)
      copyBtn.textContent = '✓ Скопировано! Вставьте в адресную строку браузера'
      copyBtn.style.background = 'linear-gradient(135deg, #40E0D0 0%, #20B2AA 100%)'
      setTimeout(() => {
        copyBtn.textContent = '📋 Скопировать data URI'
        copyBtn.style.background = 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)'
      }, 3000)
    } catch (error) {
      console.error('Ошибка копирования:', error)
      copyBtn.textContent = 'Ошибка копирования'
    }
  }
  
  const instruction = document.createElement('p')
  instruction.textContent = '💡 Совет: После копирования вставьте в адресную строку браузера и нажмите Enter'
  instruction.style.cssText = `
    color: rgba(255, 215, 0, 0.8);
    font-size: 13px;
    margin: 10px 0 0 0;
    font-style: italic;
  `
  
  const closeBtn = document.createElement('button')
  closeBtn.textContent = '✕'
  closeBtn.style.cssText = `
    position: absolute;
    top: 15px;
    right: 15px;
    width: 36px;
    height: 36px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    color: #ffffff;
    font-size: 24px;
    font-weight: 300;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    transition: all 0.3s;
  `
  
  closeBtn.onmouseover = () => {
    closeBtn.style.background = 'rgba(255, 215, 0, 0.2)'
    closeBtn.style.borderColor = '#FFD700'
    closeBtn.style.color = '#FFD700'
  }
  closeBtn.onmouseout = () => {
    closeBtn.style.background = 'rgba(255, 255, 255, 0.1)'
    closeBtn.style.borderColor = 'rgba(255, 255, 255, 0.2)'
    closeBtn.style.color = '#ffffff'
  }
  
  const closeModal = () => {
    if (modal.parentNode) {
      document.body.removeChild(modal)
    }
  }
  
  closeBtn.onclick = closeModal
  modal.onclick = (e) => {
    if (e.target === modal) {
      closeModal()
    }
  }
  
  content.appendChild(closeBtn)
  content.appendChild(title)
  content.appendChild(qrText)
  content.appendChild(linkText)
  content.appendChild(copyBtn)
  content.appendChild(instruction)
  modal.appendChild(content)
  document.body.appendChild(modal)
  
  setTimeout(() => {
    if (modal.parentNode) {
      closeModal()
    }
  }, 300000) // 5 минут
}


// ВАРИАНТ 2: Показ base64 для копирования (улучшенная версия)
function showPDFBase64(pdfDataUri, fileName, methodName) {
  const modal = document.createElement('div')
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.9);
    z-index: 999999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  `
  
  const content = document.createElement('div')
  content.style.cssText = `
    background: linear-gradient(135deg, rgba(26, 26, 35, 0.98) 0%, rgba(15, 15, 25, 0.98) 100%);
    border: 2px solid rgba(255, 215, 0, 0.4);
    border-radius: 20px;
    padding: 30px;
    max-width: 90%;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
  `
  
  const title = document.createElement('h3')
  title.textContent = 'Base64 данные PDF'
  title.style.cssText = `
    color: #FFD700;
    font-size: 24px;
    font-weight: 700;
    margin: 0 0 20px 0;
  `
  
  const text = document.createElement('p')
  text.textContent = 'Скопируйте base64 данные ниже и вставьте в адресную строку браузера для просмотра PDF:'
  text.style.cssText = `
    color: rgba(255, 255, 255, 0.9);
    font-size: 14px;
    margin: 0 0 20px 0;
    line-height: 1.6;
  `
  
  const instruction = document.createElement('p')
  instruction.textContent = '💡 Совет: После копирования вставьте в адресную строку браузера и нажмите Enter'
  instruction.style.cssText = `
    color: rgba(255, 215, 0, 0.8);
    font-size: 13px;
    margin: 10px 0 0 0;
    font-style: italic;
  `
  
  const textarea = document.createElement('textarea')
  textarea.value = pdfDataUri
  textarea.style.cssText = `
    width: 100%;
    height: 300px;
    padding: 15px;
    background: rgba(0, 0, 0, 0.5);
    border: 2px solid rgba(255, 215, 0, 0.3);
    border-radius: 10px;
    color: #fff;
    font-family: monospace;
    font-size: 12px;
    resize: vertical;
    margin-bottom: 20px;
  `
  textarea.readOnly = true
  
  const copyBtn = document.createElement('button')
  copyBtn.textContent = '📋 Скопировать base64'
  copyBtn.style.cssText = `
    padding: 15px 30px;
    background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
    color: #0a0a0f;
    border: none;
    border-radius: 10px;
    font-weight: 700;
    font-size: 16px;
    cursor: pointer;
    margin-right: 10px;
  `
  copyBtn.onclick = async () => {
    await navigator.clipboard.writeText(pdfDataUri)
    copyBtn.textContent = '✓ Скопировано!'
    setTimeout(() => copyBtn.textContent = '📋 Скопировать base64', 2000)
  }
  
  const closeBtn = document.createElement('button')
  closeBtn.textContent = 'Закрыть'
  closeBtn.style.cssText = `
    padding: 15px 30px;
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid rgba(255, 255, 255, 0.3);
    color: #fff;
    border-radius: 10px;
    font-weight: 700;
    font-size: 16px;
    cursor: pointer;
  `
  const closeModal = () => {
    if (modal.parentNode) {
      document.body.removeChild(modal)
    }
  }
  
  closeBtn.onclick = closeModal
  modal.onclick = (e) => {
    if (e.target === modal) {
      closeModal()
    }
  }
  
  content.appendChild(title)
  content.appendChild(text)
  content.appendChild(textarea)
  content.appendChild(copyBtn)
  content.appendChild(instruction)
  content.appendChild(closeBtn)
  modal.appendChild(content)
  document.body.appendChild(modal)
  
  setTimeout(() => {
    if (modal.parentNode) {
      closeModal()
    }
  }, 300000) // 5 минут
}

// Функция для показа PDF в Telegram MiniApp (старая версия, оставлена для совместимости)
function showPDFTelegramModal(pdfDataUri, blobUrl, fileName, methodName, tg) {
  const modal = document.createElement('div')
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.9);
    backdrop-filter: blur(10px);
    z-index: 999999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  `
  
  const content = document.createElement('div')
  content.style.cssText = `
    background: linear-gradient(135deg, rgba(26, 26, 35, 0.98) 0%, rgba(15, 15, 25, 0.98) 100%);
    border: 2px solid rgba(255, 215, 0, 0.4);
    border-radius: 20px;
    padding: 30px;
    max-width: 400px;
    width: 100%;
    text-align: center;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    position: relative;
  `
  
  const title = document.createElement('h3')
  title.textContent = 'PDF готов'
  title.style.cssText = `
    color: #FFD700;
    font-size: 24px;
    font-weight: 700;
    margin: 0 0 15px 0;
    letter-spacing: 1px;
  `
  
  const text = document.createElement('p')
  text.textContent = 'PDF файл создан. Нажмите кнопку ниже, чтобы открыть его:'
  text.style.cssText = `
    color: rgba(255, 255, 255, 0.9);
    font-size: 16px;
    margin: 0 0 25px 0;
    line-height: 1.6;
  `
  
  const openBtn = document.createElement('button')
  openBtn.textContent = `📄 Открыть ${methodName}`
  openBtn.style.cssText = `
    display: block;
    width: 100%;
    padding: 15px 30px;
    background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
    color: #0a0a0f;
    border: none;
    border-radius: 10px;
    font-weight: 700;
    font-size: 16px;
    box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
    cursor: pointer;
    margin-bottom: 15px;
  `
  
  openBtn.onclick = () => {
    // Пытаемся открыть через Telegram WebApp API
    if (tg.openLink) {
      tg.openLink(blobUrl)
    } else {
      // Fallback - открываем в новом окне
      window.open(blobUrl, '_blank')
    }
  }
  
  const copyBtn = document.createElement('button')
  copyBtn.textContent = '📋 Скопировать ссылку'
  copyBtn.style.cssText = `
    display: block;
    width: 100%;
    padding: 12px 24px;
    background: rgba(255, 215, 0, 0.2);
    border: 2px solid rgba(255, 215, 0, 0.5);
    color: #FFD700;
    border-radius: 8px;
    font-weight: 700;
    font-size: 14px;
    cursor: pointer;
    margin-bottom: 15px;
  `
  
  copyBtn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(blobUrl)
      copyBtn.textContent = '✓ Скопировано!'
      setTimeout(() => {
        copyBtn.textContent = '📋 Скопировать ссылку'
      }, 2000)
    } catch (error) {
      console.error('Ошибка копирования:', error)
      copyBtn.textContent = 'Ошибка копирования'
    }
  }
  
  const closeBtn = document.createElement('button')
  closeBtn.textContent = '✕'
  closeBtn.style.cssText = `
    position: absolute;
    top: 15px;
    right: 15px;
    width: 36px;
    height: 36px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    color: #ffffff;
    font-size: 24px;
    font-weight: 300;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  `
  
  const closeModal = () => {
    if (modal.parentNode) {
      document.body.removeChild(modal)
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000)
  }
  
  closeBtn.onclick = closeModal
  modal.onclick = (e) => {
    if (e.target === modal) {
      closeModal()
    }
  }
  
  content.appendChild(closeBtn)
  content.appendChild(title)
  content.appendChild(text)
  content.appendChild(openBtn)
  content.appendChild(copyBtn)
  modal.appendChild(content)
  document.body.appendChild(modal)
  
  setTimeout(() => {
    if (modal.parentNode) {
      closeModal()
    }
  }, 60000)
}

// Функция для показа PDF встроенным в модальное окно (для мобильных устройств)
function showPDFInModal(url, fileName, methodName) {
  // Создаем модальное окно с ссылкой
  const modal = document.createElement('div')
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(10px);
    z-index: 999999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  `
  
  const content = document.createElement('div')
  content.style.cssText = `
    background: linear-gradient(135deg, rgba(26, 26, 35, 0.98) 0%, rgba(15, 15, 25, 0.98) 100%);
    border: 2px solid rgba(255, 215, 0, 0.4);
    border-radius: 20px;
    padding: 30px;
    max-width: 400px;
    width: 100%;
    text-align: center;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    position: relative;
  `
  
  const title = document.createElement('h3')
  title.textContent = 'PDF готов'
  title.style.cssText = `
    color: #FFD700;
    font-size: 24px;
    font-weight: 700;
    margin: 0 0 20px 0;
    letter-spacing: 1px;
  `
  
  const text = document.createElement('p')
  text.textContent = 'PDF файл готов. Вы можете просмотреть его ниже или открыть в новом окне:'
  text.style.cssText = `
    color: rgba(255, 255, 255, 0.9);
    font-size: 16px;
    margin: 0 0 20px 0;
    line-height: 1.6;
  `
  
  // Пытаемся создать iframe для встроенного просмотра PDF
  // Если это data URI, используем его напрямую, иначе blob URL
  const iframe = document.createElement('iframe')
  iframe.src = url
  iframe.style.cssText = `
    width: 100%;
    height: 60vh;
    min-height: 400px;
    border: 2px solid rgba(255, 215, 0, 0.3);
    border-radius: 10px;
    margin-bottom: 20px;
    background: #ffffff;
  `
  
  // Если iframe не загружается, показываем альтернативу
  iframe.onerror = () => {
    iframe.style.display = 'none'
    const errorText = document.createElement('p')
    errorText.textContent = 'PDF не может быть отображен встроенным. Используйте кнопки ниже.'
    errorText.style.cssText = `
      color: rgba(255, 255, 255, 0.7);
      font-size: 14px;
      margin: 0 0 20px 0;
      padding: 20px;
      background: rgba(255, 0, 0, 0.1);
      border-radius: 8px;
    `
    content.insertBefore(errorText, buttonsContainer)
  }
  
  // Кнопка для открытия в новом окне
  const openLink = document.createElement('a')
  openLink.href = url
  openLink.target = '_blank'
  openLink.textContent = `📄 Открыть ${methodName} в новом окне`
  openLink.style.cssText = `
    display: inline-block;
    padding: 12px 24px;
    background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
    color: #0a0a0f;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 700;
    font-size: 14px;
    box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
    transition: transform 0.2s;
    margin-right: 10px;
  `
  
  openLink.onmouseover = () => {
    openLink.style.transform = 'translateY(-2px)'
    openLink.style.boxShadow = '0 6px 25px rgba(255, 215, 0, 0.6)'
  }
  openLink.onmouseout = () => {
    openLink.style.transform = 'translateY(0)'
    openLink.style.boxShadow = '0 4px 15px rgba(255, 215, 0, 0.4)'
  }
  
  // Кнопка для скачивания (fallback)
  const downloadLink = document.createElement('a')
  downloadLink.href = url
  downloadLink.download = fileName
  downloadLink.textContent = '💾 Скачать PDF'
  downloadLink.style.cssText = `
    display: inline-block;
    padding: 12px 24px;
    background: rgba(255, 215, 0, 0.2);
    border: 2px solid rgba(255, 215, 0, 0.5);
    color: #FFD700;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 700;
    font-size: 14px;
    transition: all 0.2s;
  `
  
  downloadLink.onmouseover = () => {
    downloadLink.style.background = 'rgba(255, 215, 0, 0.3)'
    downloadLink.style.borderColor = 'rgba(255, 215, 0, 0.8)'
  }
  downloadLink.onmouseout = () => {
    downloadLink.style.background = 'rgba(255, 215, 0, 0.2)'
    downloadLink.style.borderColor = 'rgba(255, 215, 0, 0.5)'
  }
  
  const buttonsContainer = document.createElement('div')
  buttonsContainer.style.cssText = `
    display: flex;
    gap: 10px;
    justify-content: center;
    flex-wrap: wrap;
  `
  buttonsContainer.appendChild(openLink)
  buttonsContainer.appendChild(downloadLink)
  
  const closeBtn = document.createElement('button')
  closeBtn.textContent = '✕'
  closeBtn.style.cssText = `
    position: absolute;
    top: 15px;
    right: 15px;
    width: 36px;
    height: 36px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    color: #ffffff;
    font-size: 24px;
    font-weight: 300;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    transition: all 0.3s;
  `
  
  closeBtn.onmouseover = () => {
    closeBtn.style.background = 'rgba(255, 215, 0, 0.2)'
    closeBtn.style.borderColor = '#FFD700'
    closeBtn.style.color = '#FFD700'
  }
  closeBtn.onmouseout = () => {
    closeBtn.style.background = 'rgba(255, 255, 255, 0.1)'
    closeBtn.style.borderColor = 'rgba(255, 255, 255, 0.2)'
    closeBtn.style.color = '#ffffff'
  }
  
  const closeModal = () => {
    if (modal.parentNode) {
      document.body.removeChild(modal)
    }
    // Освобождаем URL через 5 секунд после закрытия
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }
  
  closeBtn.onclick = closeModal
  modal.onclick = (e) => {
    if (e.target === modal) {
      closeModal()
    }
  }
  
  content.appendChild(closeBtn)
  content.appendChild(title)
  content.appendChild(text)
  content.appendChild(iframe)
  content.appendChild(buttonsContainer)
  modal.appendChild(content)
  document.body.appendChild(modal)
  
  // Автоматически закрываем через 30 секунд
  setTimeout(() => {
    if (modal.parentNode) {
      closeModal()
    }
  }, 30000)
}

// Генерация PDF через HTML (для поддержки кириллицы)
const generatePDF = (methodName, methodId, resultData, birthDate, soulDetails = null) => {
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
      background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%);
      padding: 0;
      margin: 0;
      box-sizing: border-box;
      position: relative;
      box-shadow: 0 0 50px rgba(0, 0, 0, 0.1);
    ">
      <!-- Премиальная золотая полоса сверху с градиентом -->
      <div style="
        width: 100%;
        height: 45px;
        background: linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FFD700 100%);
        margin: 0;
        padding: 0;
        box-shadow: 0 4px 20px rgba(255, 215, 0, 0.3);
        position: relative;
      ">
        <div style="
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.5) 50%, transparent 100%);
        "></div>
      </div>
      
      <!-- Премиальная темная область для заголовка с градиентом -->
      <div style="
        width: 100%;
        background: linear-gradient(135deg, #191923 0%, #1a1a24 50%, #191923 100%);
        padding: 50px 30px;
        margin: 0;
        box-sizing: border-box;
        position: relative;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
      ">
        <div style="
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent 0%, #FFD700 50%, transparent 100%);
        "></div>
        <h1 style="
          color: #FFD700;
          font-size: 28px;
          font-weight: 700;
          text-align: center;
          margin: 0;
          padding: 0;
          letter-spacing: 1px;
          font-family: 'Inter', 'Arial', sans-serif;
          line-height: 1.3;
        ">${methodName}</h1>
      </div>
      
      <!-- Премиальный контент с фоном -->
      <div style="
        width: 100%;
        background: #ffffff;
        padding: 40px 30px;
        box-sizing: border-box;
        position: relative;
        min-height: calc(1123px - 152px);
      ">
        <!-- Дата рождения в премиальном стиле -->
        <div style="
          text-align: center;
          margin: 0 0 30px 0;
          padding: 12px;
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 215, 0, 0.05) 100%);
          border-radius: 8px;
          border: 1px solid rgba(255, 215, 0, 0.3);
        ">
          <p style="
            color: #191923;
            font-size: 13px;
            font-weight: 600;
            margin: 0;
            padding: 0;
            font-family: 'Inter', 'Arial', sans-serif;
            letter-spacing: 0.5px;
          ">📅 Дата рождения: <span style="color: #C89600; font-weight: 700; font-size: 14px;">${birthDate}</span></p>
        </div>
        
        <!-- Премиальная разделительная линия -->
        <div style="
          width: 100%;
          height: 2px;
          background: linear-gradient(90deg, transparent 0%, #FFD700 50%, transparent 100%);
          margin: 0 0 35px 0;
          border-radius: 2px;
        "></div>
        
        <!-- Основной текст в премиальном контейнере -->
        <div style="
          color: #282828;
          font-size: 12px;
          line-height: 1.8;
          margin: 0 0 25px 0;
          text-align: justify;
          font-family: 'Inter', 'Arial', sans-serif;
          white-space: pre-line;
          background: #ffffff;
          padding: 25px 20px;
          border-radius: 12px;
          border: 1px solid rgba(255, 215, 0, 0.2);
          position: relative;
        ">
          <div style="
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            background: linear-gradient(180deg, #FFD700 0%, #FFA500 100%);
            border-radius: 12px 0 0 12px;
          "></div>
          <div style="padding-left: 15px; color: #282828;">
            ${(methodId === 'soul' && soulDetails 
              ? generateFullSoulFormulaReport(soulDetails, birthDate) 
              : (resultData?.result || 'Результат расчета недоступен')).replace(/\n/g, '<br>')}
          </div>
        </div>
        
        ${resultData.value ? `
        <!-- Ключевое значение в премиальном стиле -->
        <div style="
          background: linear-gradient(135deg, #FFF6E6 0%, #FFEECC 50%, #FFF6E6 100%);
          border-left: 5px solid #FFD700;
          padding: 25px;
          margin: 30px 0 0 0;
          border-radius: 10px;
          box-shadow: 0 4px 15px rgba(255, 215, 0, 0.15);
          position: relative;
          border: 1px solid rgba(255, 215, 0, 0.3);
        ">
          <p style="
            color: #8B6914;
            font-size: 13px;
            font-weight: 700;
            margin: 0;
            padding: 0;
            font-family: 'Inter', 'Arial', sans-serif;
            letter-spacing: 0.5px;
            position: relative;
            z-index: 1;
          ">✨ Ключевое значение: <span style="color: #C89600; font-size: 16px; font-weight: 800;">${resultData.value}</span></p>
        </div>
        ` : ''}
      </div>
    </div>
  `
  
  // Добавляем элемент в DOM - он будет видимым на экране
  document.body.appendChild(element)
  
  // Проверяем, что контент действительно есть
  const contentText = methodId === 'soul' && soulDetails 
    ? generateFullSoulFormulaReport(soulDetails, birthDate) 
    : (resultData?.result || 'Нет данных')
  
  console.log('PDF Generation Debug:', {
    methodName,
    methodId,
    hasResultData: !!resultData,
    hasResult: !!resultData?.result,
    hasSoulDetails: !!soulDetails,
    contentLength: contentText.length,
    contentPreview: contentText.substring(0, 100),
    elementHTML: element.innerHTML.substring(0, 200)
  })
  
  // Проверяем, что контент не пустой
  if (!contentText || contentText.length < 10 || contentText === 'Нет данных') {
    console.error('PDF content is empty!', { methodId, resultData, soulDetails })
    alert('Ошибка: нет данных для генерации PDF. Пожалуйста, сначала выполните расчет.')
    if (element.parentNode) {
      document.body.removeChild(element)
    }
    return
  }
  
  // Используем надежный метод с html2canvas и jsPDF
  // Даем время на рендеринг DOM
  setTimeout(() => {
    // Проверяем, что элемент действительно отрендерен
    const checkElement = document.getElementById('pdf-content')
    if (!checkElement || checkElement.innerHTML.length < 100) {
      console.error('Element not properly rendered!')
      alert('Ошибка при подготовке PDF. Пожалуйста, попробуйте еще раз.')
      if (element.parentNode) {
        document.body.removeChild(element)
      }
      return
    }
    
    generatePDFFallback(element, methodName, methodId, resultData, birthDate, soulDetails)
  }, 1500)
}

// Fallback метод для генерации PDF (старый способ)
function generatePDFFallback(element, methodName, methodId, resultData, birthDate, soulDetails) {
  // Важно: убираем overflow и maxHeight, чтобы html2canvas видел весь контент
  element.style.overflow = 'visible'
  element.style.maxHeight = 'none'
  element.style.height = 'auto'
  // Перемещаем элемент за пределы экрана, но оставляем видимым для html2canvas
  element.style.position = 'absolute'
  element.style.left = '-9999px'
  element.style.top = '0'
  element.style.visibility = 'visible'
  element.style.opacity = '1'
  element.style.display = 'block'
  
  // Получаем реальные размеры контента
  const contentDiv = element.querySelector('div')
  const contentHeight = contentDiv ? contentDiv.scrollHeight : element.scrollHeight
  const contentWidth = element.offsetWidth || 794
  
  // Проверяем, что контент есть
  const innerHTML = element.innerHTML
  console.log('Generating PDF (fallback):', {
    elementWidth: element.offsetWidth,
    elementHeight: element.offsetHeight,
    scrollHeight: element.scrollHeight,
    contentHeight: contentHeight,
    hasContent: innerHTML.length > 0,
    contentPreview: innerHTML.substring(0, 200),
    computedStyle: window.getComputedStyle(element).display
  })
  
  if (!innerHTML || innerHTML.length < 100) {
    console.error('PDF content is empty or too short!', {
      innerHTML: innerHTML,
      length: innerHTML?.length
    })
    alert('Ошибка: контент для PDF пуст. Пожалуйста, попробуйте еще раз.')
    if (element.parentNode) {
      document.body.removeChild(element)
    }
    return
  }
  
  // Используем html2canvas с оптимизированными настройками для меньшего размера файла
  html2canvas(element, {
    scale: 1.5, // Уменьшаем scale для меньшего размера файла
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
    
    // Используем JPEG для меньшего размера файла (качество 0.85 - хороший баланс)
    const imgData = canvas.toDataURL('image/jpeg', 0.85)
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
    
    // Размеры canvas в мм (canvas.width в пикселях с учетом scale=1.5)
    const imgWidth = (canvas.width / 1.5) * 0.264583 // конвертируем пиксели в мм
    const imgHeight = (canvas.height / 1.5) * 0.264583
    
    // Рассчитываем масштаб для вписывания в доступную область
    const ratio = Math.min(usableWidth / imgWidth, usableHeight / imgHeight)
    const finalWidth = imgWidth * ratio
    const finalHeight = imgHeight * ratio
    
    // Основной контент всегда на первой странице (ограничиваем высоту)
    const maxContentHeight = usableHeight * 0.95 // Оставляем небольшой запас
    const contentHeight = Math.min(finalHeight, maxContentHeight)
    
    // Добавляем первую страницу с основным контентом
    pdf.addImage(imgData, 'JPEG', margin, margin, finalWidth, contentHeight)
    
    // Создаем вторую страницу с демо-припиской
    pdf.addPage()
    
    // Создаем отдельный элемент для второй страницы
    const demoElement = document.createElement('div')
    demoElement.id = 'pdf-demo-content'
    demoElement.style.position = 'absolute'
    demoElement.style.left = '-9999px'
    demoElement.style.top = '0'
    demoElement.style.width = '794px'
    demoElement.style.background = 'transparent'
    demoElement.style.color = '#FFD700'
    demoElement.style.fontFamily = "'Inter', 'Arial', sans-serif"
    demoElement.style.visibility = 'visible'
    demoElement.style.opacity = '1'
    demoElement.style.display = 'block'
    
    demoElement.innerHTML = `
      <div style="
        width: 100%;
        min-height: 1123px;
        background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%);
        padding: 60px 30px;
        box-sizing: border-box;
        position: relative;
      ">
        ${generateDemoFooter()}
        
        <!-- Премиальный футер -->
        <div style="
          margin-top: 40px;
          text-align: center;
          padding: 20px;
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.08) 0%, rgba(255, 215, 0, 0.04) 100%);
          border-radius: 10px;
          border-top: 1px solid rgba(255, 215, 0, 0.3);
        ">
          <p style="
            margin: 0; 
            padding: 0;
            color: #969696;
            font-size: 11px;
            font-style: italic;
            font-family: 'Inter', 'Arial', sans-serif;
            font-weight: 500;
            letter-spacing: 1px;
          ">✨ Цифровая Алхимия - Персональная расшифровка ✨</p>
        </div>
      </div>
    `
    
    document.body.appendChild(demoElement)
    
    // Генерируем canvas для второй страницы
    setTimeout(() => {
      html2canvas(demoElement, {
        scale: 1.5,
        useCORS: true,
        letterRendering: true,
        logging: false,
        backgroundColor: '#0a0a0f',
        allowTaint: true,
        scrollX: 0,
        scrollY: 0
      }).then((demoCanvas) => {
        const demoImgData = demoCanvas.toDataURL('image/jpeg', 0.85)
        const demoImgWidth = (demoCanvas.width / 1.5) * 0.264583
        const demoImgHeight = (demoCanvas.height / 1.5) * 0.264583
        const demoRatio = Math.min(usableWidth / demoImgWidth, usableHeight / demoImgHeight)
        const demoFinalWidth = demoImgWidth * demoRatio
        const demoFinalHeight = demoImgHeight * demoRatio
        
        pdf.setPage(2)
        pdf.addImage(demoImgData, 'JPEG', margin, margin, demoFinalWidth, demoFinalHeight)
        
        // Добавляем ссылку на текстовую ссылку на второй странице
        const textLink = demoElement.querySelector('#pdf-text-link')
        if (textLink) {
          const textRect = textLink.getBoundingClientRect()
          const demoElementRect = demoElement.getBoundingClientRect()
          
          const relativeTop = textRect.top - demoElementRect.top
          const relativeLeft = textRect.left - demoElementRect.left
          const textWidth = textRect.width
          const textHeight = textRect.height
          
          const textTopMM = margin + (relativeTop / 1.5) * 0.264583 * demoRatio
          const textLeftMM = margin + (relativeLeft / 1.5) * 0.264583 * demoRatio
          const textWidthMM = (textWidth / 1.5) * 0.264583 * demoRatio
          const textHeightMM = (textHeight / 1.5) * 0.264583 * demoRatio
          
          const pdfHeight = pdf.internal.pageSize.getHeight()
          const linkY = pdfHeight - textTopMM - textHeightMM
          
          pdf.link(textLeftMM, linkY, textWidthMM, textHeightMM, {
            url: 'https://t.me/SpaceGrowthBot'
          })
        }
        
        // Удаляем демо-элемент
        setTimeout(() => {
          if (demoElement.parentNode) {
            document.body.removeChild(demoElement)
          }
        }, 500)
        
        // Сохраняем PDF (поддержка мобильных устройств)
        const fileName = `${methodName.replace(/\s+/g, '_')}_${birthDate.replace(/\./g, '_')}.pdf`
        
        // Определяем мобильное устройство более точно
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && 
                        (window.innerWidth < 768 || 'ontouchstart' in window)
        const tg = window.Telegram?.WebApp || window.TelegramWebApp
        const isTelegram = !!tg
        
        // Для мобильных устройств и Telegram показываем модальное окно с 5 методами получения PDF
        if (isMobile || isTelegram) {
          // Конвертируем PDF в base64 data URL
          const pdfDataUri = pdf.output('datauristring')
          
          // Показываем модальное окно с 5 кнопками для разных методов получения PDF
          showPDFMobileModal(pdfDataUri, fileName, methodName)
        } else {
          // Для десктопа используем стандартный метод скачивания
          pdf.save(fileName)
        }
        
        console.log('PDF saved successfully (fallback)')
        
        // Удаляем основной элемент
        setTimeout(() => {
          if (element.parentNode) {
            document.body.removeChild(element)
          }
        }, 500)
      }).catch((error) => {
        console.error('Ошибка при генерации второй страницы PDF:', error)
        // Удаляем элементы в случае ошибки
        if (demoElement.parentNode) {
          document.body.removeChild(demoElement)
        }
        if (element.parentNode) {
          document.body.removeChild(element)
        }
      })
    }, 500)
  }).catch((error) => {
    console.error('Ошибка при генерации PDF:', error)
    if (element.parentNode) {
      document.body.removeChild(element)
    }
  })
}


function MatrixCalculator() {
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [city, setCity] = useState('')
  const [citySuggestions, setCitySuggestions] = useState([])
  const [isScanning, setIsScanning] = useState(false)
  const [completedMethods, setCompletedMethods] = useState([])
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')
  const [selectedMethod, setSelectedMethod] = useState(null)
  const calculateButtonRef = useRef(null)
  const resultsRef = useRef(null)
  const scanningRef = useRef(null)
  const cityInputRef = useRef(null)
  const suggestionsRef = useRef(null)

  // Автодополнение города
  useEffect(() => {
    if (!city || city.length < 2) {
      setCitySuggestions([])
      return
    }

    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}&limit=5&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'SoulFormulaApp/1.0'
            }
          }
        )

        if (response.ok) {
          const data = await response.json()
          const suggestions = data
            .filter(item => item.type === 'city' || item.type === 'town' || item.type === 'village')
            .map(item => ({
              name: item.display_name.split(',')[0],
              fullName: item.display_name,
              lat: parseFloat(item.lat),
              lon: parseFloat(item.lon)
            }))
          setCitySuggestions(suggestions)
        }
      } catch (err) {
        console.error('Ошибка автодополнения:', err)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [city])

  // Закрытие подсказок при клике вне
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target) &&
        cityInputRef.current &&
        !cityInputRef.current.contains(event.target)
      ) {
        setCitySuggestions([])
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleCitySelect = (suggestion) => {
    setCity(suggestion.name)
    setCitySuggestions([])
  }

  const handleCalculate = async () => {
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

    // Сразу скроллим вниз, чтобы видеть процесс сканирования
    setTimeout(() => {
      // Пытаемся скроллить к блоку сканирования
      if (scanningRef.current) {
        scanningRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        })
      } else {
        // Если блок еще не отрендерился, скроллим к кнопке или просто вниз
        const actionZoneInner = document.querySelector('.action-zone-inner')
        if (actionZoneInner) {
          actionZoneInner.scrollTo({
            top: actionZoneInner.scrollHeight,
            behavior: 'smooth'
          })
        }
      }
    }, 100)

    // Анимация сканирования - последовательное появление галочек
    methods.forEach((method, index) => {
      setTimeout(() => {
        setCompletedMethods(prev => [...prev, method.id])
        
        // После завершения всех методов показываем результаты
        if (index === methods.length - 1) {
          setTimeout(async () => {
            try {
              const calculatedResults = await calculateAllMethods(birthDate, birthTime, city)
              setResults(calculatedResults)
            } catch (err) {
              setError('Ошибка при расчете. Попробуйте еще раз.')
              console.error('Ошибка расчета:', err)
            } finally {
              setIsScanning(false)
            }
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

  const handleInputFocus = (e) => {
    // Скрываем кнопку "Вернуться к столу" при фокусе на поле ввода
    const actionZone = document.getElementById('action-zone')
    if (actionZone) {
      actionZone.classList.add('input-focused')
    }
    
    // НЕ скроллим - оставляем поле ввода видимым
    // Пользователь должен видеть поле, в которое вводит
  }

  const handleInputBlur = () => {
    // Показываем кнопку "Вернуться к столу" при потере фокуса
    const actionZone = document.getElementById('action-zone')
    if (actionZone) {
      actionZone.classList.remove('input-focused')
    }
  }

  const handleInputKeyUp = () => {
    // НЕ скроллим при вводе - пользователь должен видеть поле ввода
  }

  const handleDownloadPDF = async (methodId, methodName) => {
    if (!results || !results[methodId]) {
      return
    }

    // Для Формулы Души передаем details для полного отчета
    const soulDetails = methodId === 'soul' && results[methodId].details ? results[methodId].details : null
    
    // Получаем telegramUserId, если доступен Telegram WebApp
    const tg = window.Telegram?.WebApp || window.TelegramWebApp
    const telegramUserId = tg?.initDataUnsafe?.user?.id || tg?.initData?.user?.id || null
    
    try {
      // Отправляем данные на сервер для генерации PDF
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          methodName,
          methodId,
          resultData: results[methodId],
          birthDate,
          soulDetails,
          telegramUserId
        })
      })

      if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        // Показываем модальное окно с информацией о PDF
        showPDFServerModal(data.pdfUrl, data.fileName, methodName, data.telegramSent)
      } else {
        throw new Error(data.error || 'Неизвестная ошибка')
      }
    } catch (error) {
      console.error('Ошибка генерации PDF на сервере:', error)
      // Fallback: используем локальную генерацию
      generatePDF(methodName, methodId, results[methodId], birthDate, soulDetails)
    }
  }

  // Скроллим к результатам после их появления
  useEffect(() => {
    if (results && !isScanning && resultsRef.current) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        })
      }, 500) // Задержка для завершения анимации появления
    }
  }, [results, isScanning])

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
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyUp={handleInputKeyUp}
          maxLength={10}
          disabled={isScanning}
        />
        
        <label htmlFor="birthTime" className="matrix-label">
          Время рождения
        </label>
        <input
          id="birthTime"
          type="text"
          className="matrix-input"
          placeholder="ЧЧ:ММ"
          value={birthTime}
          onChange={(e) => {
            let value = e.target.value.replace(/\D/g, '')
            if (value.length >= 2) {
              value = value.slice(0, 2) + ':' + value.slice(2, 4)
            }
            setBirthTime(value)
            setError('')
          }}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyUp={handleInputKeyUp}
          maxLength={5}
          disabled={isScanning}
        />
        
        <label htmlFor="city" className="matrix-label">
          Город рождения
        </label>
        <div className="matrix-city-wrapper">
          <input
            ref={cityInputRef}
            id="city"
            type="text"
            className="matrix-input"
            placeholder="Начните вводить название города..."
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyUp={handleInputKeyUp}
            disabled={isScanning}
          />
          {citySuggestions.length > 0 && (
            <div ref={suggestionsRef} className="matrix-suggestions">
              {citySuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="matrix-suggestion-item"
                  onClick={() => handleCitySelect(suggestion)}
                >
                  {suggestion.fullName}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {error && <div className="matrix-error">{error}</div>}
        
        <motion.button
          ref={calculateButtonRef}
          className="matrix-button"
          onClick={handleCalculate}
          disabled={isScanning}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isScanning ? 'Сканирование...' : 'Рассчитать'}
        </motion.button>
      </div>

      {/* Анимация сканирования */}
      <AnimatePresence>
        {isScanning && (
          <motion.div
            ref={scanningRef}
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
            ref={resultsRef}
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
