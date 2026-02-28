// Vercel Serverless Function для бесплатного чата
// Поддерживает режим заглушки и Groq API. В продакшене задайте GROQ_API_KEY в Vercel → Settings → Environment Variables, иначе чат (в т.ч. эксперт кабинета) будет отвечать заглушкой.

import { readFile, appendFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { google } from 'googleapis'

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
    const logDir = join(process.cwd(), 'logs')
    const logFile = join(logDir, `chat-${new Date().toISOString().split('T')[0]}.log`)
    
    // Создаем директорию logs, если её нет (игнорируем ошибку, если уже существует)
    try {
      await mkdir(logDir, { recursive: true })
    } catch (e) {
      // Директория уже существует или нет прав - продолжаем
    }
    
    const clientIP = clientInfo.ip || req?.headers?.['x-forwarded-for']?.split(',')[0] || req?.connection?.remoteAddress || 'unknown'
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

    // Вариант 1 (самый простой для Vercel):
    // 1) Отдельные строки для вопроса/ответа (чтобы не терялись при обрезке длинных логов)
    console.log('CHAT_Q', JSON.stringify({ timestamp, messageCount: logEntry.messageCount, source: logEntry.source, message: logEntry.message }))
    console.log('CHAT_A', JSON.stringify({ timestamp, messageCount: logEntry.messageCount, source: logEntry.source, response: logEntry.response, shouldAddCTA: logEntry.shouldAddCTA }))
    // 2) Полный JSON (может обрезаться из-за длинного userAgent, но полезен для деталей)
    console.log('CHAT_LOG', JSON.stringify(logEntry))

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

// Функция для загрузки промпта бота (Telegram)
async function loadBotPrompt() {
  try {
    const botPrompt = await readFile(join(process.cwd(), 'botAIprompt.md'), 'utf-8').catch(() => null)
    if (!botPrompt) {
      return 'Файл botAIprompt.md не найден'
    }
    return botPrompt
  } catch (error) {
    console.error('❌ Ошибка при загрузке botAIprompt.md:', error)
    return 'Ошибка загрузки botAIprompt.md'
  }
}

// Функция для загрузки промпта Мастера Кабинета
async function loadMasterPrompt() {
  try {
    const masterPrompt = await readFile(join(process.cwd(), 'MasterAIprompt.md'), 'utf-8').catch(() => null)
    if (!masterPrompt) return 'Файл MasterAIprompt.md не найден'
    const siteKnowledge = await readFile(join(process.cwd(), 'site_knowledge.md'), 'utf-8').catch(() => null)
    let full = masterPrompt
    if (siteKnowledge) full += '\n\n# @site_knowledge.md:\n' + siteKnowledge
    return full
  } catch (error) {
    console.error('❌ Ошибка при загрузке MasterAIprompt:', error)
    return 'Ошибка загрузки MasterAIprompt.md'
  }
}

// Функция для загрузки промпта зеркала
async function loadMirrorPrompt(userName = 'Путник') {
  try {
    // В Vercel Serverless Functions путь относительно корня проекта
    const mirrorPrompt = await readFile(join(process.cwd(), 'scripts', 'Mirrior.txt'), 'utf-8').catch(() => null)
    
    if (!mirrorPrompt) {
      return 'Файл scripts/Mirrior.txt не найден'
    }
    
    // Заменяем плейсхолдер имени пользователя в промпте
    const promptWithName = mirrorPrompt.replace(/\{userName\}/g, userName)
    
    return promptWithName
  } catch (error) {
    console.error('❌ Ошибка при загрузке промпта зеркала:', error)
    return 'Ошибка загрузки scripts/Mirrior.txt'
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
async function buildSystemContext(shouldAddCTA = false, promptType = 'profile', userName = 'Путник') {
  // Если это зеркало, используем специальный промпт
  if (promptType === 'mirror') {
    const mirrorPrompt = await loadMirrorPrompt(userName)
    return mirrorPrompt
  }

  // Специальный промпт для Telegram-бота
  if (promptType === 'bot_ai') {
    const botPrompt = await loadBotPrompt()
    return botPrompt
  }

  // Промпт Мастера Кабинета (эксперт). Groq лимит 6000 TPM — обрезаем системный промпт (~3 chars/token)
  if (promptType === 'cabinet_expert') {
    const full = await loadMasterPrompt()
    const hasName = userName && String(userName).trim() && String(userName).trim() !== 'Путник'
    const nameBlock = '\n\n# Имя гостя в этом диалоге\n' + (hasName ? `Обращайся к гостю по имени: «${String(userName).trim()}».` : 'Имя не указано — обращение без имени.')
    return truncateText(full + nameBlock, 10000)
  }

  // Стандартный промпт для профиля
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
- КРИТИЧЕСКИ ВАЖНО: НЕ путай продукты КЛИЕНТОВ с моими собственными продуктами! Я создаю воронки и системы для клиентов, но у меня НЕТ своего обучающего курса, AI-School, AI-Tutor или других образовательных продуктов. Если спрашивают про мой курс — честно говори, что у меня его нет, но я помогаю создавать такие системы для клиентов.
- Если информации нет в базе знаний — честно признай это и мягко переведи разговор к теме сайта (АИЦП, автоматизация продаж, воронки, диагностика)
- Пример: "Об этом не расскажу, но могу помочь с автоматизацией вашей воронки продаж. [Записаться на диагностику](https://t.me/ilyaborm)"

# Правила ответа:
- Говори от первого лица (Я, меня, мой), обращайся на "вы"
- КРИТИЧЕСКИ ВАЖНО: Твой ответ должен быть КРАТКИМ — максимум 330 символов. Пиши только суть, без лишних слов. ЗАВЕРШАЙ мысль полностью в пределах этого лимита. НЕ начинай новые предложения, если не укладываешься в лимит.
- КРИТИЧЕСКИ ВАЖНО про курс: Если спрашивают "у тебя есть свой обучающий курс?" — отвечай четко: "Нет, у меня нет своего курса. Я создаю воронки и системы для клиентов, но сам не веду курсы." НЕ придумывай названия курсов, AI-School, AI-Tutor, SoulGuideIT как курс и т.п. SoulGuideIT — это только Telegram-канал, не курс!
- Если добавляешь CTA — используй ТОЛЬКО указанный формат: [Записаться на диагностику](https://t.me/ilyaborm). НЕ придумывай другие CTA типа "[Узнать больше]()" или любые другие варианты. Если CTA не нужен — не добавляй его вообще.
- Не используй фразы "Как я могу вам помочь?"
- Будь живым экспертом, не роботом${ctaInstruction}`
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

const CTA_MARKDOWN = '[Записаться на диагностику](https://t.me/ilyaborm)'
const CTA_URL = 'https://t.me/ilyaborm'

function formatFinalResponse(rawText, shouldAddCTA) {
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
  // Также убираем любые неправильные CTA, которые модель могла придумать
  main = main
    .replace(/\[Записаться на диагностику\]\(https:\/\/t\.me\/ilyaborm\)/g, '')
    .replaceAll(CTA_MARKDOWN, '')
    .replaceAll(CTA_URL, '')
    // Убираем любые другие markdown-ссылки, которые модель могла придумать
    .replace(/\[.*?\]\(.*?\)/g, '')
    .trim()

  if (!shouldAddCTA) {
    return main
  }

  // Гарантируем: ровно одна новая строка перед CTA (без пустой строки)
  return (main ? `${main}\n` : '') + CTA_MARKDOWN
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

/** Заглушка для эксперта кабинета (когда GROQ_API_KEY не задан или API недоступен) */
function handleCabinetExpertMock(message) {
  const lower = (message || '').toLowerCase()
  if (lower.includes('пользователь открыл диалог') || lower.includes('инициируй разговор')) {
    return 'Чувствуете глубину? Что привело вас в этот кабинет? О чём хотите поговорить?'
  }
  return 'Расскажите, что вас привело в кабинет. О чём хотите поговорить?'
}

/** Выбор ответа заглушки: для эксперта кабинета — свой текст, иначе — общий mock */
function getMockResponse(message, promptType) {
  if (promptType === 'cabinet_expert') return handleCabinetExpertMock(message)
  return handleMockResponse(message)
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

  const { message, messageCount = 0, promptType = 'profile', userName = 'Путник', history = [] } = req.body

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Сообщение не может быть пустым' })
  }

  // Определяем, нужно ли добавлять CTA (каждое 3-е сообщение, только для профиля)
  const shouldAddCTA = promptType === 'profile' && messageCount > 0 && messageCount % 3 === 0

  // Проверяем режим заглушки
  const USE_MOCK = process.env.USE_MOCK_RESPONSES === 'true'
  const GROQ_API_KEY = process.env.GROQ_API_KEY
  const HF_API_KEY = process.env.HF_API_KEY // Для обратной совместимости

  console.log('🔍 API Debug:', {
    USE_MOCK,
    promptType,
    userName,
    hasGROQ_API_KEY: !!GROQ_API_KEY,
    GROQ_API_KEY_preview: GROQ_API_KEY ? GROQ_API_KEY.substring(0, 15) + '...' : 'missing',
    GROQ_API_KEY_length: GROQ_API_KEY ? GROQ_API_KEY.length : 0,
    hasHF_API_KEY: !!HF_API_KEY,
    allEnvKeys: Object.keys(process.env).filter(k => k.includes('API') || k.includes('MOCK')).join(', ')
  })

  // Загружаем файлы знаний и формируем полный промпт (для cabinet_expert при ошибке не отдаём 500)
  let systemContext
  try {
    systemContext = await buildSystemContext(shouldAddCTA, promptType, userName)
  } catch (err) {
    console.error('❌ buildSystemContext failed:', err)
    if (promptType === 'cabinet_expert') {
      const fallback = getMockResponse(message, promptType)
      return res.status(200).json({ response: cleanResponse(fallback) })
    }
    throw err
  }

  if (USE_MOCK) {
    console.log('⚠️ Using mock response: USE_MOCK_RESPONSES=true')
    const response = getMockResponse(message, promptType)
    const cleanedResponse = promptType === 'cabinet_expert' ? cleanResponse(response) : formatFinalResponse(response, shouldAddCTA)
    // Логируем переписку (не блокируем ответ)
    logConversation(message, cleanedResponse, { messageCount, shouldAddCTA, source: 'mock' }, req).catch(() => {})
    return res.status(200).json({ response: cleanedResponse })
  }

  if (!GROQ_API_KEY) {
    console.error('❌ GROQ_API_KEY missing! Add GROQ_API_KEY in Vercel → Project → Settings → Environment Variables. Available env vars:', Object.keys(process.env).filter(k => k.includes('API')).join(', '))
    const response = getMockResponse(message, promptType)
    const cleanedResponse = promptType === 'cabinet_expert' ? cleanResponse(response) : formatFinalResponse(response, shouldAddCTA)
    // Логируем переписку (не блокируем ответ)
    logConversation(message, cleanedResponse, { messageCount, shouldAddCTA, source: 'mock' }, req).catch(() => {})
    return res.status(200).json({ response: cleanedResponse })
  }

  try {
    // Используем Groq API (быстрый и бесплатный)
    // Endpoint: https://api.groq.com/openai/v1/chat/completions
    // Формат: OpenAI-совместимый
    const historyMessages = Array.isArray(history) && history.length > 0
      ? history.slice(-20).map((m) => ({ role: m.role, content: String(m.content || '').slice(0, 2000) })).filter((m) => m.content)
      : []
    const requestBody = {
      model: 'llama-3.1-8b-instant', // Актуальная быстрая модель Groq
      messages: [
        { role: 'system', content: systemContext },
        ...historyMessages,
        { role: 'user', content: message }
      ],
      temperature: promptType === 'mirror' ? 0.8 : promptType === 'cabinet_expert' ? 0.75 : 0.7,
      max_tokens: promptType === 'mirror' ? 200 : promptType === 'cabinet_expert' ? 180 : 150
    }

    console.log('📡 Sending request to Groq API...')
    console.log('🔑 Using API key:', GROQ_API_KEY.substring(0, 15) + '...')
    console.log('📦 Request body preview:', JSON.stringify(requestBody).substring(0, 200) + '...')
    console.log('📝 Full system prompt length:', systemContext.length, 'chars')
    console.log('🔍 System prompt contains "Перми":', systemContext.includes('Перми'))
    console.log('🔍 System prompt contains "Сочи":', systemContext.includes('Сочи'))
    console.log('🔍 System prompt contains "Родился":', systemContext.includes('Родился'))
    console.log('📄 System prompt preview (first 500 chars):', systemContext.substring(0, 500))
    
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
      const mockResponse = getMockResponse(message, promptType)
      const cleanedMockResponse = promptType === 'cabinet_expert' ? cleanResponse(mockResponse) : formatFinalResponse(mockResponse, shouldAddCTA)
      // Логируем переписку (не блокируем ответ)
      logConversation(message, cleanedMockResponse, { messageCount, shouldAddCTA, source: 'mock' }, req).catch(() => {})
      return res.status(200).json({ response: cleanedMockResponse })
    }

    const data = await response.json()
    console.log('✅ API response received:', JSON.stringify(data).substring(0, 200))
    
    // Groq API возвращает ответ в OpenAI-совместимом формате
    const assistantMessage = data.choices?.[0]?.message?.content || null

    if (!assistantMessage) {
      console.error('⚠️ No assistant message in response, using mock')
      const mockResponse = getMockResponse(message, promptType)
      const cleanedMockResponse = promptType === 'cabinet_expert' ? cleanResponse(mockResponse) : formatFinalResponse(mockResponse, shouldAddCTA)
      // Логируем переписку (не блокируем ответ)
      logConversation(message, cleanedMockResponse, { messageCount, shouldAddCTA, source: 'mock' }, req).catch(() => {})
      return res.status(200).json({ response: cleanedMockResponse })
    }

    // Очищаем ответ: зеркало и cabinet_expert — только cleanResponse, профиль — formatFinalResponse с CTA
    const cleanedResponse = promptType === 'mirror' || promptType === 'cabinet_expert'
      ? cleanResponse(assistantMessage)
      : formatFinalResponse(assistantMessage, shouldAddCTA)

    // Логируем переписку (не блокируем ответ)
    logConversation(message, cleanedResponse, { messageCount, shouldAddCTA, source: 'groq' }, req).catch(() => {})

    return res.status(200).json({
      response: cleanedResponse
    })

  } catch (error) {
    console.error('❌ Exception in API handler:', error)
    console.error('Error stack:', error.stack)
    // При любой ошибке возвращаем заглушку вместо ошибки
    const mockResponse = getMockResponse(message, promptType)
    const cleanedMockResponse = promptType === 'cabinet_expert' ? cleanResponse(mockResponse) : formatFinalResponse(mockResponse, shouldAddCTA)
    // Логируем переписку (не блокируем ответ)
    logConversation(message, cleanedMockResponse, { messageCount, shouldAddCTA, source: 'mock' }, req).catch(() => {})
    return res.status(200).json({ response: cleanedMockResponse })
  }
}
