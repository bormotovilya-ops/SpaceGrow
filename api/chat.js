// Vercel Serverless Function для бесплатного чата
// Поддерживает режим заглушки и Hugging Face API

import { readFile } from 'fs/promises'
import { join } from 'path'

// Функция для загрузки файлов знаний
async function loadKnowledgeFiles() {
  try {
    // В Vercel Serverless Functions путь относительно корня проекта
    const siteKnowledge = await readFile(join(process.cwd(), 'site_knowledge.md'), 'utf-8').catch(() => null)
    
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
  
  // Обрезаем site_knowledge.md, чтобы уложиться в лимит 6000 токенов
  const siteKnowledgeTruncated = truncateText(knowledge.siteKnowledge, 5000)
  
  return `Ты — Илья Бормотов, IT-интегратор и архитектор АИЦП. Отвечай на вопросы как мой "цифровой двойник", опираясь на базу знаний ниже.

# База знаний:
${siteKnowledgeTruncated}

# Правила ответа:
- Говори от первого лица (Я, меня, мой), обращайся на "вы"
- Максимальная длина ответа — 300 символов. Только суть!
- В конце ВСЕГДА добавляй CTA: [Записаться на диагностику](https://t.me/ilyaborm)
- Не используй фразы "Как я могу вам помочь?"
- Будь живым экспертом, не роботом`
}

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

// Функция для обработки заглушки
function handleMockResponse(message) {
  const lowerMessage = message.toLowerCase().trim()
  
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
  
  for (const [key, value] of Object.entries(responses)) {
    if (lowerMessage.includes(key)) {
      return value
    }
  }
  
  return `Спасибо за вопрос! Я Илья Бормотов, IT-интегратор и архитектор автоматизированных интеллектуальных цепочек продаж. 

Для более подробного ответа свяжитесь со мной напрямую:
- Telegram: @ilyaborm
- Канал: @SoulGuideIT
- Телефон: +7 (999) 123-77-88
- Email: bormotovilya@gmail.com

Также предлагаю бесплатную диагностику воронки или мини-аудит бизнес-процессов.`
}

export default async function handler(req, res) {
  // Разрешаем только POST запросы
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // CORS заголовки
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  const { message } = req.body

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Сообщение не может быть пустым' })
  }

  // Проверяем режим заглушки
  const USE_MOCK = process.env.USE_MOCK_RESPONSES === 'true'
  const GROQ_API_KEY = process.env.GROQ_API_KEY
  const HF_API_KEY = process.env.HF_API_KEY // Для обратной совместимости

  console.log('🔍 API Debug:', {
    USE_MOCK,
    hasGROQ_API_KEY: !!GROQ_API_KEY,
    GROQ_API_KEY_preview: GROQ_API_KEY ? GROQ_API_KEY.substring(0, 15) + '...' : 'missing',
    GROQ_API_KEY_length: GROQ_API_KEY ? GROQ_API_KEY.length : 0,
    hasHF_API_KEY: !!HF_API_KEY,
    allEnvKeys: Object.keys(process.env).filter(k => k.includes('API') || k.includes('MOCK')).join(', ')
  })

  // Загружаем файлы знаний и формируем полный промпт
  const systemContext = await buildSystemContext()

  if (USE_MOCK) {
    console.log('⚠️ Using mock response: USE_MOCK_RESPONSES=true')
    const response = handleMockResponse(message)
    const cleanedResponse = cleanResponse(response)
    return res.status(200).json({ response: cleanedResponse })
  }

  if (!GROQ_API_KEY) {
    console.error('❌ GROQ_API_KEY missing! Available env vars:', Object.keys(process.env).filter(k => k.includes('API')).join(', '))
    const response = handleMockResponse(message)
    const cleanedResponse = cleanResponse(response)
    return res.status(200).json({ response: cleanedResponse })
  }

  try {
    // Используем Groq API (быстрый и бесплатный)
    // Endpoint: https://api.groq.com/openai/v1/chat/completions
    // Формат: OpenAI-совместимый
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

    console.log('📡 Sending request to Groq API...')
    console.log('🔑 Using API key:', GROQ_API_KEY.substring(0, 15) + '...')
    console.log('📦 Request body:', JSON.stringify(requestBody).substring(0, 200) + '...')
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY.trim()}`,
      },
      body: JSON.stringify(requestBody)
    })

    console.log('📊 Response status:', response.status, response.statusText)
    console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      // Если ошибка API, переключаемся на заглушку
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error('❌ Groq API error:', response.status, errorText)
      const mockResponse = handleMockResponse(message)
      const cleanedMockResponse = cleanResponse(mockResponse)
      return res.status(200).json({ response: cleanedMockResponse })
    }

    const data = await response.json()
    console.log('✅ API response received:', JSON.stringify(data).substring(0, 200))
    
    // Groq API возвращает ответ в OpenAI-совместимом формате
    const assistantMessage = data.choices?.[0]?.message?.content || null

    if (!assistantMessage) {
      console.error('⚠️ No assistant message in response, using mock')
      const mockResponse = handleMockResponse(message)
      const cleanedMockResponse = cleanResponse(mockResponse)
      return res.status(200).json({ response: cleanedMockResponse })
    }

    console.log('💬 Assistant message:', assistantMessage.substring(0, 100) + '...')

    // Очищаем ответ от markdown-символов и форматируем
    const cleanedResponse = cleanResponse(assistantMessage)

    return res.status(200).json({
      response: cleanedResponse
    })

  } catch (error) {
    console.error('❌ Exception in API handler:', error)
    console.error('Error stack:', error.stack)
    // При любой ошибке возвращаем заглушку вместо ошибки
    const mockResponse = handleMockResponse(message)
    const cleanedMockResponse = cleanResponse(mockResponse)
    return res.status(200).json({ response: cleanedMockResponse })
  }
}
