// Локальный сервер для разработки
// Эмулирует Vercel Serverless Function для /api/chat
// Запуск: node server-local.js

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFile, appendFile, mkdir, existsSync } from 'fs'
import { promises as fs } from 'fs'
import { google } from 'googleapis'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

let _sheetsClient = null
let _sheetsHeaderEnsured = false

function getEnv(name) {
  return process.env[name] ? String(process.env[name]) : ''
}

function getSheetsConfig() {
  const enabled = getEnv('GSHEETS_LOGGING_ENABLED') === 'true'
  const spreadsheetId = getEnv('GSHEETS_SPREADSHEET_ID')
  const sheetName = getEnv('GSHEETS_SHEET_NAME') || 'Logs'
  const clientEmail = getEnv('GSHEETS_SERVICE_ACCOUNT_EMAIL')
  const privateKey = getEnv('GSHEETS_PRIVATE_KEY').replace(/\\n/g, '\n')
  return { enabled, spreadsheetId, sheetName, clientEmail, privateKey }
}

async function getSheetsClient() {
  const cfg = getSheetsConfig()
  if (!cfg.enabled) return null
  if (!cfg.spreadsheetId || !cfg.clientEmail || !cfg.privateKey) return null

  if (_sheetsClient) return _sheetsClient

  const auth = new google.auth.JWT({
    email: cfg.clientEmail,
    key: cfg.privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  _sheetsClient = google.sheets({ version: 'v4', auth })
  return _sheetsClient
}

async function ensureSheetsHeader() {
  const cfg = getSheetsConfig()
  const sheets = await getSheetsClient()
  if (!sheets) return
  if (_sheetsHeaderEnsured) return

  try {
    const range = `${cfg.sheetName}!A1:H1`
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: cfg.spreadsheetId,
      range,
    })
    const hasHeader = Array.isArray(existing.data?.values) && existing.data.values.length > 0 && existing.data.values[0].length > 0
    if (!hasHeader) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: cfg.spreadsheetId,
        range: `${cfg.sheetName}!A1`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [[
            'timestamp',
            'ip',
            'userAgent',
            'messageCount',
            'source',
            'message',
            'response',
            'shouldAddCTA',
          ]],
        },
      })
    }
  } catch (e) {
    // Не критично
  } finally {
    _sheetsHeaderEnsured = true
  }
}

async function logConversationToGoogleSheets(entry) {
  const cfg = getSheetsConfig()
  const sheets = await getSheetsClient()
  if (!sheets) return false

  await ensureSheetsHeader()

  await sheets.spreadsheets.values.append({
    spreadsheetId: cfg.spreadsheetId,
    range: `${cfg.sheetName}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [[
        entry.timestamp,
        entry.client?.ip || '',
        entry.client?.userAgent || '',
        entry.messageCount ?? 0,
        entry.source || '',
        entry.message || '',
        entry.response || '',
        entry.shouldAddCTA ? 'true' : 'false',
      ]],
    },
  })
  return true
}

// Функция для логирования переписки
async function logConversation(message, response, clientInfo = {}, req = null) {
  try {
    const timestamp = new Date().toISOString()
    // __dirname указывает на scripts/, нужно подняться на уровень выше для папки logs
    const rootDir = join(__dirname, '..')
    const logDir = join(rootDir, 'logs')
    const logFile = join(logDir, `chat-${new Date().toISOString().split('T')[0]}.log`)
    
    // Создаем директорию logs, если её нет (игнорируем ошибку, если уже существует)
    try {
      await mkdir(logDir, { recursive: true })
    } catch (e) {
      // Директория уже существует или нет прав - продолжаем
    }
    
    const clientIP = clientInfo.ip || req?.ip || req?.connection?.remoteAddress || 'unknown'
    const userAgent = clientInfo.userAgent || req?.headers?.['user-agent'] || 'unknown'
    
    const logEntry = {
      timestamp,
      client: {
        ip: clientIP,
        userAgent: userAgent
      },
      message,
      response,
      messageCount: clientInfo.messageCount || 0,
      source: clientInfo.source || 'unknown',
      shouldAddCTA: !!clientInfo.shouldAddCTA,
    }
    
    // Пишем в Google Sheets (если настроено)
    try {
      const ok = await Promise.race([
        logConversationToGoogleSheets(logEntry),
        new Promise((resolve) => setTimeout(() => resolve(false), 1500)),
      ])
      if (ok) {
        console.log('📊 Conversation logged to Google Sheets')
        return
      }
    } catch (e) {
      // игнорируем, пишем в файл ниже
    }

    const logLine = JSON.stringify(logEntry) + '\n'
    await appendFile(logFile, logLine, 'utf-8')
    console.log('📝 Conversation logged to:', logFile)
  } catch (error) {
    // Логирование не критично, просто выводим в консоль
    console.error('⚠️ Failed to log conversation:', error.message)
    console.log('📝 Conversation log (fallback):', {
      timestamp: new Date().toISOString(),
      message,
      response: response?.substring(0, 100) + '...',
      messageCount: clientInfo.messageCount || 0
    })
  }
}

// Загружаем .env из корня проекта (__dirname указывает на scripts/)
dotenv.config({ path: join(__dirname, '..', '.env') })

// Функция для загрузки файлов знаний
async function loadKnowledgeFiles() {
  try {
    // __dirname указывает на scripts/, нужно подняться на уровень выше
    const rootDir = join(__dirname, '..')
    const knowledgePath = join(rootDir, 'site_knowledge.md')
    
    console.log('🔍 Загрузка файла знаний:', {
      __dirname,
      rootDir,
      knowledgePath,
      exists: existsSync(knowledgePath)
    })
    
    const siteKnowledge = await readFile(knowledgePath, 'utf-8').catch((err) => {
      console.error('❌ Ошибка чтения файла знаний:', err.message)
      return null
    })
    
    if (!siteKnowledge) {
      console.error('❌ Файл site_knowledge.md не найден или пуст по пути:', knowledgePath)
    } else {
      console.log('✅ Файл знаний загружен, размер:', siteKnowledge.length, 'символов')
    }
    
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

const CTA_MARKDOWN = '[Записаться на диагностику](https://t.me/ilyaborm)'
const CTA_URL = 'https://t.me/ilyaborm'

function formatFinalResponse(rawText, shouldAddCTA, maxChars = 300) {
  const text = cleanResponse(rawText || '')

  // Убираем возможные литералы "\n" / "\r" из ответа модели (в т.ч. двойное экранирование)
  let main = text
    // \n, \\n, \\\\n -> убираем любые "\" перед n/r
    .replace(/\\+n/g, ' ')
    .replace(/\\+r/g, ' ')
    // иногда модель пишет именно "\n\n" как текст
    .replace(/\\n\\n/g, ' ')
    .replace(/\\r\\n/g, ' ')
    // нормализуем настоящие переводы строк в пробел (чтобы не было пустых строк перед CTA)
    .replace(/[\r\n]+/g, ' ')

  // Убираем CTA, если модель добавила его сама (чтобы контролировать частоту)
  main = main
    .replace(/\[Записаться на диагностику\]\(https:\/\/t\.me\/ilyaborm\)/g, '')
    .replaceAll(CTA_MARKDOWN, '')
    .replaceAll(CTA_URL, '')
    .trim()

  if (!shouldAddCTA) {
    return main.length > maxChars ? main.slice(0, maxChars).trimEnd() : main
  }

  // CTA нужен: оставляем место под "\n" + CTA
  const reserve = 1 + CTA_MARKDOWN.length
  const maxMain = Math.max(0, maxChars - reserve)
  if (main.length > maxMain) {
    main = main.slice(0, maxMain).trimEnd()
  }

  return (main ? `${main}\n` : '') + CTA_MARKDOWN
}

// Функция для обработки заглушки (предопределенные ответы)
async function handleMockResponse(message, systemContext, res, messageCount = 0, req = null) {
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
      const cleanedResponse = formatFinalResponse(value, messageCount > 0 && messageCount % 3 === 0)
      console.log('📝 Mock response found for key:', key)
      // Логируем переписку (не блокируем ответ)
      logConversation(message, cleanedResponse, { messageCount, shouldAddCTA: messageCount > 0 && messageCount % 3 === 0, source: 'mock' }, req).catch(() => {})
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
  
  const cleanedDefaultResponse = formatFinalResponse(defaultResponse, messageCount > 0 && messageCount % 3 === 0)
  console.log('📝 Using default mock response')
  // Логируем переписку (не блокируем ответ)
  logConversation(message, cleanedDefaultResponse, { messageCount, shouldAddCTA: messageCount > 0 && messageCount % 3 === 0, source: 'mock' }, req).catch(() => {})
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
async function buildSystemContext(shouldAddCTA = false) {
  const knowledge = await loadKnowledgeFiles()
  
  // Файл теперь короткий (около 4000 символов), используем полностью без обрезки
  const siteKnowledge = knowledge.siteKnowledge || ''
  
  // Логируем, что попадает в промпт (проверка на наличие ключевой информации)
  const hasCityInfo = siteKnowledge.includes('Родился в Перми') || siteKnowledge.includes('живу в Сочи') || siteKnowledge.includes('Перми')
  const isMockContent = siteKnowledge.includes('Файл site_knowledge.md не найден') || siteKnowledge.length < 100
  
  console.log('📋 Knowledge file loaded:', {
    originalLength: siteKnowledge.length,
    hasCityInfo: hasCityInfo,
    isMockContent: isMockContent,
    preview: siteKnowledge.substring(0, 200) + '...'
  })
  
  if (isMockContent) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: Файл знаний не загружен! Используется заглушка.')
    console.error('🔍 Проверьте путь к файлу site_knowledge.md')
  }
  
  if (!hasCityInfo && !isMockContent) {
    console.warn('⚠️ WARNING: City information (Пермь/Сочи) not found in knowledge file!')
  }

  // Формируем инструкцию о CTA (без вывода литералов вида "\n")
  const ctaInstruction = shouldAddCTA
    ? '\n\nВАЖНО: В ЭТОМ ответе добавь CTA в самом конце на новой строке (один перенос строки, без пустой строки, без символов "\\n"). Формат CTA ровно такой: [Записаться на диагностику](https://t.me/ilyaborm)'
    : '\n\nВАЖНО: В ЭТОМ ответе НЕ добавляй CTA.'
  
  return `Ты — Илья Бормотов, IT-интегратор и архитектор АИЦП. Отвечай на вопросы как мой "цифровой двойник", опираясь на базу знаний ниже.

# База знаний:
${siteKnowledge}

# КРИТИЧЕСКИ ВАЖНО - Честность и точность:
- НИКОГДА не выдумывай факты, которых нет в базе знаний выше
- НЕ придумывай информацию о семье, друзьях, личной жизни, если её нет в базе знаний
- НЕ сочиняй детали биографии, проекты, кейсы или события, которых нет в файле
- Если информации нет в базе знаний — честно признай это и мягко переведи разговор к теме сайта (АИЦП, автоматизация продаж, воронки, диагностика)
- Пример: "Об этом не расскажу, но могу помочь с автоматизацией вашей воронки продаж. [Записаться на диагностику](https://t.me/ilyaborm)"

# Правила ответа:
- Говори от первого лица (Я, меня, мой), обращайся на "вы"
- Максимальная длина ответа — 300 символов. Только суть!
- Если добавляешь CTA — ставь ссылку на новой строке (один перенос строки), без пустой строки. Формат: [Записаться на диагностику](https://t.me/ilyaborm)
- Не используй фразы "Как я могу вам помочь?"
- Будь живым экспертом, не роботом${ctaInstruction}`
}

// Endpoint для чата (эмулирует api/chat.js)
app.post('/api/chat', async (req, res) => {
  console.log('\n' + '='.repeat(60))
  console.log('📨 ПОЛУЧЕН ЗАПРОС К /api/chat')
  console.log('='.repeat(60))
  console.log('📝 Сообщение:', req.body.message?.substring(0, 100) + (req.body.message?.length > 100 ? '...' : ''))
  console.log('📊 Message count:', req.body.messageCount || 0)
  
  const { message, messageCount = 0 } = req.body

  if (!message || !message.trim()) {
    console.error('❌ Пустое сообщение!')
    return res.status(400).json({ error: 'Сообщение не может быть пустым' })
  }

  // Определяем, нужно ли добавлять CTA (каждое 3-е сообщение)
  const shouldAddCTA = messageCount > 0 && messageCount % 3 === 0

  // Проверяем токен Groq
  const GROQ_API_KEY = process.env.GROQ_API_KEY
  const USE_MOCK_ENV = process.env.USE_MOCK_RESPONSES === 'true'

  console.log('\n🔍 ПРОВЕРКА НАСТРОЕК:')
  console.log('  - USE_MOCK_RESPONSES:', process.env.USE_MOCK_RESPONSES || 'не установлен')
  console.log('  - USE_MOCK_ENV:', USE_MOCK_ENV)
  console.log('  - GROQ_API_KEY существует:', !!GROQ_API_KEY)
  console.log('  - GROQ_API_KEY первые 15 символов:', GROQ_API_KEY ? GROQ_API_KEY.substring(0, 15) + '...' : 'не найден')
  console.log('  - GROQ_API_KEY длина:', GROQ_API_KEY ? GROQ_API_KEY.length : 0)
  
  // КРИТИЧЕСКАЯ ПРОВЕРКА: если USE_MOCK_ENV = true, сразу возвращаем заглушку
  if (USE_MOCK_ENV) {
    console.log('\n⚠️ ВНИМАНИЕ: USE_MOCK_RESPONSES=true - принудительно используется заглушка!')
    console.log('💡 Чтобы использовать Groq API, удалите или установите USE_MOCK_RESPONSES=false в .env')
    const systemContext = await buildSystemContext(shouldAddCTA)
    return handleMockResponse(message, systemContext, res, messageCount, req)
  }

  if (!GROQ_API_KEY) {
    console.error('\n❌ GROQ_API_KEY НЕ НАЙДЕН!')
    console.error('💡 Добавьте GROQ_API_KEY в файл .env')
    const systemContext = await buildSystemContext(shouldAddCTA)
    return handleMockResponse(message, systemContext, res, messageCount, req)
  }

  // Загружаем файлы знаний и формируем полный промпт
  console.log('\n📚 Загрузка файлов знаний...')
  const systemContext = await buildSystemContext(shouldAddCTA)
  console.log('✅ Файлы знаний загружены, промпт сформирован')
  console.log('   - Длина промпта:', systemContext.length, 'символов')
  console.log('   - Should add CTA:', shouldAddCTA)

  console.log('\n✅ Groq API ключ найден, отправляю запрос к Groq API...')

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
      return handleMockResponse(message, systemContext, res, messageCount, req)
    }

    const data = await response.json()
    console.log('📦 Получен ответ от Groq:', JSON.stringify(data).substring(0, 200))
    
    // Groq API возвращает ответ в OpenAI-совместимом формате
    const assistantMessage = data.choices?.[0]?.message?.content || null
    
    if (!assistantMessage) {
      console.error('⚠️ Неожиданный формат ответа, используем заглушку:', data)
      return handleMockResponse(message, systemContext, res, messageCount, req)
    }

    // Очищаем ответ от markdown-символов, применяем лимит и CTA-политику
    const cleanedResponse = formatFinalResponse(assistantMessage, shouldAddCTA)

    console.log('✅ Получен ответ от Groq API')
    
    // Логируем переписку (не блокируем ответ)
    logConversation(message, cleanedResponse, { messageCount, shouldAddCTA, source: 'groq' }, req).catch(() => {})
    
    return res.status(200).json({
      response: cleanedResponse,
      source: 'groq'
    })

  } catch (error) {
    console.error('❌ Ошибка в try-catch:', error)
    console.error('❌ Error details:', error.stack)
    // При любой ошибке возвращаем заглушку
    return handleMockResponse(message, systemContext, res, messageCount, req)
  }
})

app.listen(PORT, () => {
  console.log(`\n🚀 Локальный сервер запущен на http://localhost:${PORT}`)
  console.log(`📡 API endpoint: http://localhost:${PORT}/api/chat`)
  
  // Проверяем загрузку .env
  console.log(`\n🔍 Проверка переменных окружения:`)
  const envPath = join(__dirname, '..', '.env')
  console.log(`  - .env файл загружен:`, existsSync(envPath))
  
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
