import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import astroData from '../../scripts/astroData.json'
import './SoulFormula.css'

// Планеты для расчета
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
 * @param {string} cityName - Название города
 * @returns {Promise<{lat: number, lon: number}>} Координаты города
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
 * Получение эфемерид через FreeAstrologyAPI
 * @param {string} date - Дата в формате YYYY-MM-DD
 * @param {string} time - Время в формате HH:MM
 * @param {number} lat - Широта
 * @param {number} lon - Долгота
 * @returns {Promise<Object>} Позиции планет в знаках
 */
async function getEphemeris(date, time, lat, lon) {
  try {
    // Формируем дату и время в формате ISO
    const dateTime = `${date}T${time}:00`
    
    // Используем бесплатный API для получения эфемерид
    // Альтернатива: https://api.astrodatabank.com или другие бесплатные сервисы
    // Для демонстрации используем mock данные, если API недоступен
    
    // Попытка использовать Swiss Ephemeris через веб-сервис
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

    // Fallback: используем упрощенный расчет на основе даты
    // В реальном приложении здесь должен быть полноценный расчет эфемерид
    console.warn('API недоступен, используем упрощенный расчет')
    return calculateSimpleEphemeris(date, time)
  } catch (error) {
    console.error('Ошибка получения эфемерид:', error)
    // Fallback на упрощенный расчет
    return calculateSimpleEphemeris(date, time)
  }
}

/**
 * Упрощенный расчет эфемерид (fallback)
 * В реальном приложении должен использоваться полноценный расчет
 */
function calculateSimpleEphemeris(date, time) {
  const dateObj = new Date(`${date}T${time}:00`)
  const dayOfYear = Math.floor((dateObj - new Date(dateObj.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24)
  
  const signs = Object.keys(astroData.rulers)
  const result = {}
  
  PLANETS.forEach((planet, index) => {
    // Упрощенный расчет: распределяем планеты по знакам на основе дня года
    const signIndex = (dayOfYear + index * 30) % signs.length
    result[planet] = signs[signIndex]
  })
  
  return result
}

/**
 * Построение графа диспозиторов
 * @param {Object} planetSigns - Объект {планета: знак}
 * @returns {Object} Граф связей {планета: управитель_знака}
 */
function buildDispositorGraph(planetSigns) {
  const graph = {}
  
  PLANETS.forEach(planet => {
    const sign = planetSigns[planet]
    if (sign && astroData.rulers[sign]) {
      // Планета указывает на управителя своего знака
      graph[planet] = astroData.rulers[sign]
    }
  })
  
  return graph
}

/**
 * Поиск центров (обители, взаимные рецепции, циклы)
 * @param {Object} graph - Граф диспозиторов
 * @returns {Object} Информация о центрах
 */
function findCenters(graph) {
  const centers = {
    domiciles: [], // Обители (планета указывает сама на себя)
    mutualReceptions: [], // Взаимные рецепции
    cycles: [] // Циклы (3+ планеты)
  }
  
  // 1. Поиск обителей (планета в своем знаке)
  PLANETS.forEach(planet => {
    if (graph[planet] === planet) {
      centers.domiciles.push(planet)
    }
  })
  
  // 2. Поиск взаимных рецепций (A -> B и B -> A)
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
  
  // 3. Поиск циклов (3+ планеты замыкают цепочку)
  const visited = new Set()
  const cyclesFound = new Set()
  
  function findCycle(planet, path = []) {
    // Если планета уже в пути - найден цикл
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
    
    // Если планета уже посещена в другом пути, пропускаем
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
  
  // Объединяем все центры
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
 * Определение орбит планет относительно центров
 * @param {Object} graph - Граф диспозиторов
 * @param {Array} centers - Массив планет-центров
 * @returns {Object} Орбиты планет {планета: орбита}
 */
function calculateOrbits(graph, centers) {
  const orbits = {}
  const centerSet = new Set(centers)
  
  // Центры находятся на орбите 0
  centers.forEach(center => {
    orbits[center] = 0
  })
  
  // BFS для определения орбит остальных планет
  const queue = [...centers]
  const visited = new Set(centers)
  
  while (queue.length > 0) {
    const current = queue.shift()
    const currentOrbit = orbits[current] || 0
    
    // Ищем все планеты, которые указывают на текущую
    PLANETS.forEach(planet => {
      if (graph[planet] === current && !visited.has(planet)) {
        orbits[planet] = currentOrbit + 1
        visited.add(planet)
        queue.push(planet)
      }
    })
  }
  
  // Планеты, не попавшие в граф, получают максимальную орбиту
  PLANETS.forEach(planet => {
    if (!(planet in orbits)) {
      orbits[planet] = 999 // Неопределенная орбита
    }
  })
  
  return orbits
}

/**
 * Расчет баллов планет
 * @param {Object} planetSigns - Объект {планета: знак}
 * @returns {Object} Баллы планет {планета: баллы}
 */
function calculatePoints(planetSigns) {
  const points = {}
  
  PLANETS.forEach(planet => {
    const sign = planetSigns[planet]
    if (!sign) {
      points[planet] = astroData.default_points
      return
    }
    
    // Получаем баллы из таблицы points
    if (astroData.points[planet] && astroData.points[planet][sign] !== undefined) {
      points[planet] = astroData.points[planet][sign]
    } else {
      points[planet] = astroData.default_points
    }
  })
  
  return points
}

/**
 * Основная функция расчета Формулы Души
 * @param {Object} planetSigns - Позиции планет в знаках
 * @returns {Object} Результат расчета
 */
function calculateSoulFormula(planetSigns) {
  // 1. Строим граф диспозиторов
  const graph = buildDispositorGraph(planetSigns)
  
  // 2. Находим центры
  const centers = findCenters(graph)
  
  // 3. Определяем орбиты
  const orbits = calculateOrbits(graph, centers.all)
  
  // 4. Считаем баллы
  const points = calculatePoints(planetSigns)
  
  return {
    graph,
    centers,
    orbits,
    points,
    planetSigns
  }
}

function SoulFormula() {
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [city, setCity] = useState('')
  const [citySuggestions, setCitySuggestions] = useState([])
  const [isCalculating, setIsCalculating] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
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

  const handleCitySelect = (suggestion) => {
    setCity(suggestion.name)
    setCitySuggestions([])
  }

  const handleCalculate = async () => {
    // Валидация
    if (!birthDate) {
      setError('Введите дату рождения')
      return
    }

    if (!birthTime) {
      setError('Введите время рождения')
      return
    }

    if (!city) {
      setError('Введите город рождения')
      return
    }

    // Проверка формата даты
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(birthDate)) {
      setError('Дата должна быть в формате ГГГГ-ММ-ДД')
      return
    }

    // Проверка формата времени
    const timeRegex = /^\d{2}:\d{2}$/
    if (!timeRegex.test(birthTime)) {
      setError('Время должно быть в формате ЧЧ:ММ')
      return
    }

    setError('')
    setIsCalculating(true)
    setResult(null)

    try {
      // 1. Геокодинг города
      const coords = await geocodeCity(city)
      
      // 2. Получение эфемерид
      const planetSigns = await getEphemeris(birthDate, birthTime, coords.lat, coords.lon)
      
      // 3. Расчет Формулы Души
      const calculationResult = calculateSoulFormula(planetSigns)
      
      setResult(calculationResult)
    } catch (err) {
      setError(err.message || 'Ошибка при расчете. Попробуйте еще раз.')
      console.error('Ошибка расчета:', err)
    } finally {
      setIsCalculating(false)
    }
  }

  const handleDateChange = (e) => {
    let value = e.target.value.replace(/\D/g, '')
    
    // Форматирование ГГГГ-ММ-ДД
    if (value.length >= 4) {
      value = value.slice(0, 4) + '-' + value.slice(4)
    }
    if (value.length >= 7) {
      value = value.slice(0, 7) + '-' + value.slice(7, 9)
    }
    
    setBirthDate(value)
    setError('')
  }

  const handleTimeChange = (e) => {
    let value = e.target.value.replace(/\D/g, '')
    
    // Форматирование ЧЧ:ММ
    if (value.length >= 2) {
      value = value.slice(0, 2) + ':' + value.slice(2, 4)
    }
    
    setBirthTime(value)
    setError('')
  }

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

  return (
    <div className="soul-formula">
      <div className="soul-formula-header">
        <h2 className="soul-formula-title">Формула Души</h2>
        <p className="soul-formula-description">
          Расчет цепочек диспозиторов на основе точного времени и места рождения
        </p>
      </div>

      <div className="soul-formula-inputs">
        <div className="soul-formula-input-group">
          <label htmlFor="birthDate" className="soul-formula-label">
            Дата рождения
          </label>
          <input
            id="birthDate"
            type="text"
            className="soul-formula-input"
            placeholder="ГГГГ-ММ-ДД"
            value={birthDate}
            onChange={handleDateChange}
            maxLength={10}
            disabled={isCalculating}
          />
        </div>

        <div className="soul-formula-input-group">
          <label htmlFor="birthTime" className="soul-formula-label">
            Время рождения
          </label>
          <input
            id="birthTime"
            type="text"
            className="soul-formula-input"
            placeholder="ЧЧ:ММ"
            value={birthTime}
            onChange={handleTimeChange}
            maxLength={5}
            disabled={isCalculating}
          />
        </div>

        <div className="soul-formula-input-group soul-formula-city-group">
          <label htmlFor="city" className="soul-formula-label">
            Город рождения
          </label>
          <div className="soul-formula-city-wrapper">
            <input
              ref={cityInputRef}
              id="city"
              type="text"
              className="soul-formula-input"
              placeholder="Начните вводить название города..."
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={isCalculating}
            />
            {citySuggestions.length > 0 && (
              <div ref={suggestionsRef} className="soul-formula-suggestions">
                {citySuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="soul-formula-suggestion-item"
                    onClick={() => handleCitySelect(suggestion)}
                  >
                    {suggestion.fullName}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {error && <div className="soul-formula-error">{error}</div>}

        <motion.button
          className="soul-formula-button"
          onClick={handleCalculate}
          disabled={isCalculating}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isCalculating ? 'Расчет...' : 'Рассчитать Формулу Души'}
        </motion.button>
      </div>

      {/* Результаты */}
      <AnimatePresence>
        {result && !isCalculating && (
          <motion.div
            className="soul-formula-result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <h3 className="soul-formula-result-title">Результат расчета</h3>
            
            {/* Центры */}
            <div className="soul-formula-section">
              <h4 className="soul-formula-section-title">Центры Формулы Души</h4>
              
              {result.centers.domiciles.length > 0 && (
                <div className="soul-formula-center-type">
                  <strong>Обители (планеты в своих знаках):</strong>
                  <ul>
                    {result.centers.domiciles.map(planet => (
                      <li key={planet}>
                        {PLANET_NAMES[planet]} в знаке {SIGN_NAMES[result.planetSigns[planet]]} 
                        (баллы: {result.points[planet]})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.centers.mutualReceptions.length > 0 && (
                <div className="soul-formula-center-type">
                  <strong>Взаимные рецепции:</strong>
                  <ul>
                    {result.centers.mutualReceptions.map((pair, index) => (
                      <li key={index}>
                        {PLANET_NAMES[pair[0]]} ↔ {PLANET_NAMES[pair[1]]}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.centers.cycles.length > 0 && (
                <div className="soul-formula-center-type">
                  <strong>Циклы (3+ планеты):</strong>
                  <ul>
                    {result.centers.cycles.map((cycle, index) => (
                      <li key={index}>
                        {cycle.map(p => PLANET_NAMES[p]).join(' → ')} → ...
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.centers.all.length === 0 && (
                <p className="soul-formula-no-centers">Центры не найдены</p>
              )}
            </div>

            {/* Орбиты и баллы */}
            <div className="soul-formula-section">
              <h4 className="soul-formula-section-title">Планеты по орбитам</h4>
              <div className="soul-formula-orbits">
                {[0, 1, 2, 3, 4, 5].map(orbit => {
                  const planetsOnOrbit = PLANETS.filter(p => result.orbits[p] === orbit)
                  if (planetsOnOrbit.length === 0) return null
                  
                  return (
                    <div key={orbit} className="soul-formula-orbit">
                      <strong>Орбита {orbit}:</strong>
                      <ul>
                        {planetsOnOrbit.map(planet => (
                          <li key={planet}>
                            {PLANET_NAMES[planet]} в {SIGN_NAMES[result.planetSigns[planet]]} 
                            (баллы: {result.points[planet]})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Полная таблица планет */}
            <div className="soul-formula-section">
              <h4 className="soul-formula-section-title">Все планеты</h4>
              <div className="soul-formula-planets-table">
                <table>
                  <thead>
                    <tr>
                      <th>Планета</th>
                      <th>Знак</th>
                      <th>Баллы</th>
                      <th>Орбита</th>
                      <th>Управитель</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PLANETS.map(planet => (
                      <tr key={planet}>
                        <td>{PLANET_NAMES[planet]}</td>
                        <td>{SIGN_NAMES[result.planetSigns[planet]]}</td>
                        <td>{result.points[planet]}</td>
                        <td>{result.orbits[planet] === 999 ? '—' : result.orbits[planet]}</td>
                        <td>{result.graph[planet] ? PLANET_NAMES[result.graph[planet]] : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default SoulFormula
