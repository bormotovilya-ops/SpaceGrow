// Локальный сервер для разработки
// Эмулирует Vercel Serverless Function для /api/chat
// Запуск: node server-local.js

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFile } from 'fs/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config()

// Функция для загрузки файлов знаний
async function loadKnowledgeFiles() {
  try {
    const siteKnowledge = await readFile(join(__dirname, 'site_knowledge.md'), 'utf-8').catch(() => null)
    
    return {
      siteKnowledge: siteKnowledge || 'Файл site_knowledge.md не найден'
    }
  } catch (error) {
    console.error('❌ Ошибка при загрузке файлов знаний:', error)
    return {
      siteKnowledge: 'Ошибка загрузки site_knowledge.md'
    }
  }
}

const app = express()
const PORT = 5000

app.use(cors())
app.use(express.json())

// Функция для очистки markdown-символов из ответа
function cleanResponse(text) {
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

// Функция для обработки заглушки (предопределенные ответы)
function handleMockResponse(message, systemContext, res) {
  const lowerMessage = message.toLowerCase().trim()
  
  // Предопределенные ответы на частые вопросы
  const responses = {
    'привет': 'Привет! Я Илья Бормотов, IT-интегратор и архитектор автоматизированных интеллектуальных цепочек продаж. Чем могу помочь?',
    'здравствуй': 'Здравствуйте! Я Илья Бормотов. Готов ответить на ваши вопросы о моих услугах.',
    'как дела': 'Отлично, спасибо! Готов помочь вам с вопросами по автоматизации продаж и созданию воронок.',
    'что ты делаешь': 'Я создаю автоматизированные цепочки продаж для онлайн-школ. Это включает: сайты, лендинги, воронки продаж, обучающие курсы и интеграцию всех элементов в единую систему.',
    'чем занимаешься': 'Я IT-интегратор с 19+ годами опыта. Специализируюсь на создании автоматизированных интеллектуальных цепочек продаж для онлайн-школ и экспертов.',
    'какой этап цепочки продаж помогает расположить к себе аудиторию': 'Этап "Прогрев" помогает расположить к себе аудиторию. Это важный этап воронки, где мы даем ценность, обучаем и создаем доверие перед предложением.',
    'прогрев': 'Прогрев - это этап воронки, где мы даем ценность аудитории, обучаем и создаем доверие. Это помогает расположить к себе клиентов перед предложением услуг.',
    'контакты': 'Со мной можно связаться:\n- Telegram: @ilyaborm\n- Канал: @SoulGuideIT\n- Телефон: +7 (999) 123-77-88\n- Email: bormotovilya@gmail.com',
    'как связаться': 'Со мной можно связаться:\n- Telegram: @ilyaborm\n- Канал: @SoulGuideIT\n- Телефон: +7 (999) 123-77-88\n- Email: bormotovilya@gmail.com',
    'телефон': 'Мой телефон: +7 (999) 123-77-88. Также можете написать в Telegram: @ilyaborm',
    'telegram': 'Мой Telegram: @ilyaborm. Также есть канал: @SoulGuideIT',
    'опыт': 'У меня 19+ лет опыта в IT, из них 15 лет в Enterprise. С 2018 года - индивидуальный предприниматель. С 2023 года фокус на Telegram-экосистеме и автоматизации продаж.',
    'сколько лет опыта': 'У меня 19+ лет опыта в IT, из них 15 лет в Enterprise. Работал руководителем группы аналитики для крупных госпроектов.',
    'стоимость': 'Стоимость зависит от проекта. Максимальный чек за одного бота - 500 тыс. руб. Предлагаю бесплатную диагностику воронки или мини-аудит бизнес-процессов.',
    'цена': 'Стоимость зависит от проекта. Предлагаю бесплатную диагностику воронки для оценки вашей ситуации.',
    'бесплатно': 'Да, предлагаю бесплатную диагностику воронки или мини-аудит бизнес-процессов. Это включает карту проблем, оценку потерь и прогноз точек роста.',
    'диагностика': 'Предлагаю бесплатную диагностику воронки или мини-аудит бизнес-процессов. Это поможет выявить проблемы, оценить потери и найти точки роста. Свяжитесь со мной для подробностей.',
  }
  
  // Ищем точное совпадение или частичное
  for (const [key, value] of Object.entries(responses)) {
    if (lowerMessage.includes(key)) {
      const cleanedResponse = cleanResponse(value)
      console.log('📝 Mock response found for key:', key)
      return res.status(200).json({ response: cleanedResponse, source: 'mock' })
    }
  }

  // Если не найдено, возвращаем общий ответ
  const defaultResponse = `Спасибо за вопрос! Я Илья Бормотов, IT-интегратор и архитектор автоматизированных интеллектуальных цепочек продаж. 

Для более подробного ответа свяжитесь со мной напрямую:
- Telegram: @ilyaborm
- Канал: @SoulGuideIT
- Телефон: +7 (999) 123-77-88
- Email: bormotovilya@gmail.com

Также предлагаю бесплатную диагностику воронки или мини-аудит бизнес-процессов.`
  
  const cleanedDefaultResponse = cleanResponse(defaultResponse)
  console.log('📝 Using default mock response')
  return res.status(200).json({ response: cleanedDefaultResponse, source: 'mock' })
}

// Функция для умной обрезки текста по предложениям (без потери смысла)
function truncateText(text, maxChars = 5000) {
  if (!text || text.length <= maxChars) return text
  
  // Обрезаем до maxChars, но ищем последнюю точку, восклицательный или вопросительный знак
  // чтобы не обрезать посередине предложения
  let truncated = text.substring(0, maxChars)
  
  // Ищем последнее завершенное предложение
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('. '),
    truncated.lastIndexOf('!\n'),
    truncated.lastIndexOf('?\n'),
    truncated.lastIndexOf('.\n'),
    truncated.lastIndexOf('! '),
    truncated.lastIndexOf('? ')
  )
  
  // Если нашли конец предложения в последних 200 символах, обрезаем там
  if (lastSentenceEnd > maxChars - 200 && lastSentenceEnd > 0) {
    truncated = truncated.substring(0, lastSentenceEnd + 1)
  }
  
  return truncated + '\n\n[Текст обрезан для экономии токенов]'
}

// Функция для формирования полного промпта с файлами знаний
async function buildSystemContext() {
  const knowledge = await loadKnowledgeFiles()
  
  // Файл теперь короткий (около 4000 символов), используем полностью без обрезки
  const siteKnowledge = knowledge.siteKnowledge || ''
  
  // Логируем, что попадает в промпт (проверка на наличие ключевой информации)
  const hasCityInfo = siteKnowledge.includes('Родился в Перми') || siteKnowledge.includes('живу в Сочи') || siteKnowledge.includes('Перми')
  console.log('📋 Knowledge file loaded:', {
    originalLength: siteKnowledge.length,
    hasCityInfo: hasCityInfo,
    preview: siteKnowledge.substring(0, 200) + '...'
  })
  
  if (!hasCityInfo) {
    console.warn('⚠️ WARNING: City information (Пермь/Сочи) not found in knowledge file!')
  }
  
  return `Ты — Илья Бормотов, IT-интегратор и архитектор АИЦП. Отвечай на вопросы как мой "цифровой двойник", опираясь на базу знаний ниже.

# База знаний:
${siteKnowledge}

# Правила ответа:
- Говори от первого лица (Я, меня, мой), обращайся на "вы"
- Максимальная длина ответа — 300 символов. Только суть!
- В конце ВСЕГДА добавляй CTA: [Записаться на диагностику](https://t.me/ilyaborm)
- Не используй фразы "Как я могу вам помочь?"
- Будь живым экспертом, не роботом`
}

// Endpoint для чата (эмулирует api/chat.js)
app.post('/api/chat', async (req, res) => {
  console.log('📨 Получен запрос:', req.body.message?.substring(0, 50) + '...')
  
  const { message } = req.body

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Сообщение не может быть пустым' })
  }

  // Проверяем токен Groq
  const GROQ_API_KEY = process.env.GROQ_API_KEY
  const USE_MOCK_ENV = process.env.USE_MOCK_RESPONSES === 'true'

  console.log('🔍 Проверка настроек:')
  console.log('  - USE_MOCK_RESPONSES:', process.env.USE_MOCK_RESPONSES)
  console.log('  - USE_MOCK_ENV:', USE_MOCK_ENV)
  console.log('  - GROQ_API_KEY существует:', !!GROQ_API_KEY)
  console.log('  - GROQ_API_KEY первые 15 символов:', GROQ_API_KEY ? GROQ_API_KEY.substring(0, 15) + '...' : 'не найден')
  console.log('  - GROQ_API_KEY длина:', GROQ_API_KEY ? GROQ_API_KEY.length : 0)
  console.log('  - Все env переменные с API:', Object.keys(process.env).filter(k => k.includes('API')).join(', '))

  // Загружаем файлы знаний и формируем полный промпт
  const systemContext = await buildSystemContext()
  console.log('📚 Файлы знаний загружены, промпт сформирован')

  if (USE_MOCK_ENV) {
    console.log('📝 Используется режим заглушки (USE_MOCK_RESPONSES=true)')
    return handleMockResponse(message, systemContext, res)
  }

  if (!GROQ_API_KEY) {
    console.error('❌ GROQ_API_KEY не найден!')
    return handleMockResponse(message, systemContext, res)
  }

  console.log('✅ Groq API ключ найден, отправляю запрос к Groq API...')

  try {
    // Используем Groq API (быстрый и бесплатный)
    // Endpoint: https://api.groq.com/openai/v1/chat/completions
    // Формат: OpenAI-совместимый
    console.log('📡 Отправляю запрос к api.groq.com/openai/v1/chat/completions...')
    console.log('🔑 Токен (первые 15):', GROQ_API_KEY.substring(0, 15) + '...')
    
    const requestBody = {
      model: 'llama-3.1-8b-instant', // Актуальная быстрая модель Groq
      messages: [
        {
          role: 'system',
          content: systemContext
        },
        {
          role: 'user',
          content: message
        }
      ],
      temperature: 0.7,
      max_tokens: 300 // Увеличил до 300, так как Groq быстрый
    }
    
    console.log('📦 Тело запроса (preview):', JSON.stringify(requestBody).substring(0, 300))
    console.log('📝 Полный системный промпт (длина):', systemContext.length, 'символов')
    console.log('🔍 Промпт содержит "Перми":', systemContext.includes('Перми'))
    console.log('🔍 Промпт содержит "Сочи":', systemContext.includes('Сочи'))
    console.log('🔍 Промпт содержит "Родился":', systemContext.includes('Родился'))
    console.log('📄 Промпт (первые 500 символов):', systemContext.substring(0, 500))
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY.trim()}`,
      },
      body: JSON.stringify(requestBody)
    })

    console.log('📊 Финальный статус ответа:', response.status, response.statusText)

    if (!response.ok) {
      const errorData = await response.text()
      console.error('❌ Groq API error status:', response.status)
      console.error('❌ Groq API error body:', errorData)
      
      // При ошибке API возвращаем заглушку вместо ошибки
      return handleMockResponse(message, systemContext, res)
    }

    const data = await response.json()
    console.log('📦 Получен ответ от Groq:', JSON.stringify(data).substring(0, 200))
    
    // Groq API возвращает ответ в OpenAI-совместимом формате
    const assistantMessage = data.choices?.[0]?.message?.content || null
    
    if (!assistantMessage) {
      console.error('⚠️ Неожиданный формат ответа, используем заглушку:', data)
      return handleMockResponse(message, systemContext, res)
    }

    // Очищаем ответ от markdown-символов и форматируем
    const cleanedResponse = cleanResponse(assistantMessage)

    console.log('✅ Получен ответ от Groq API')
    return res.status(200).json({
      response: cleanedResponse,
      source: 'groq'
    })

  } catch (error) {
    console.error('❌ Ошибка в try-catch:', error)
    console.error('❌ Error details:', error.stack)
    // При любой ошибке возвращаем заглушку
    return handleMockResponse(message, systemContext, res)
  }
})

app.listen(PORT, () => {
  console.log(`\n🚀 Локальный сервер запущен на http://localhost:${PORT}`)
  console.log(`📡 API endpoint: http://localhost:${PORT}/api/chat`)
  
  // Проверяем загрузку .env
  console.log(`\n🔍 Проверка переменных окружения:`)
  console.log(`  - .env файл загружен:`, require('fs').existsSync('.env'))
  
  const groqApiKey = process.env.GROQ_API_KEY
  const useMock = process.env.USE_MOCK_RESPONSES === 'true'
  
  console.log(`  - USE_MOCK_RESPONSES:`, process.env.USE_MOCK_RESPONSES)
  console.log(`  - GROQ_API_KEY существует:`, !!groqApiKey)
  console.log(`  - GROQ_API_KEY длина:`, groqApiKey ? groqApiKey.length : 0)
  console.log(`  - GROQ_API_KEY первые 20 символов:`, groqApiKey ? groqApiKey.substring(0, 20) + '...' : 'не найден')
  
  if (useMock) {
    console.log(`\n📝 Режим заглушки активен (USE_MOCK_RESPONSES=true)`)
  } else if (groqApiKey) {
    console.log(`\n✅ Groq API настроен: ${groqApiKey.substring(0, 10)}...`)
  } else {
    console.log(`\n📝 Режим заглушки (нет GROQ_API_KEY)`)
    console.log(`💡 Для использования Groq API добавьте GROQ_API_KEY в .env`)
    console.log(`💡 Получите ключ на https://console.groq.com`)
  }
  
  console.log(`\n💡 Запустите фронтенд в другом терминале: npm run dev\n`)
})
