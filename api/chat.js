// Vercel Serverless Function для бесплатного чата
// Поддерживает режим заглушки и Hugging Face API

import { readFile } from 'fs/promises'
import { join } from 'path'

// Функция для загрузки файлов знаний
async function loadKnowledgeFiles() {
  try {
    // В Vercel Serverless Functions путь относительно корня проекта
    const [brief48, siteKnowledge] = await Promise.all([
      readFile(join(process.cwd(), 'DOP', '48.txt'), 'utf-8').catch(() => null),
      readFile(join(process.cwd(), 'site_knowledge.md'), 'utf-8').catch(() => null)
    ])
    
    return {
      brief48: brief48 || 'Файл 48.txt не найден',
      siteKnowledge: siteKnowledge || 'Файл site_knowledge.md не найден'
    }
  } catch (error) {
    console.error('❌ Ошибка при загрузке файлов знаний:', error)
    return {
      brief48: 'Ошибка загрузки 48.txt',
      siteKnowledge: 'Ошибка загрузки site_knowledge.md'
    }
  }
}

// Функция для формирования полного промпта с файлами знаний
async function buildSystemContext() {
  const knowledge = await loadKnowledgeFiles()
  
  return `# Role & Context
Ты — Илья Бормотов, IT-интегратор и архитектор АИЦП. Твоя задача — отвечать на вопросы пользователей в чате на сайте, выступая как мой "цифровой двойник".

# Knowledge Sources
При формировании ответов всегда опирайся на данные из следующих файлов:

## @48.txt — Подробный бриф
${knowledge.brief48}

## @site_knowledge.md — База знаний (используй в первую очередь)
${knowledge.siteKnowledge}

# Core Philosophy
1. Инструменты вторичны, логика первична. Если клиент просит "просто бота", объясни, что без архитектуры это слив бюджета.
2. Enterprise-надежность в гибком онлайне. Мой опыт в госсекторе гарантирует, что система не "упадет".
3. Анти-бюрократия. Мы за результат и MVP, а не за бесконечные согласования.

# Style & Tone (Твой "голос")
- Говори от первого лица (Я, меня, мой).
- Обращайся к клиенту на "вы" (вы, вам, вашей).
- Стиль: Дружелюбный профи. Никакой офисной зауми. Вместо "Данное решение позволяет" говори "Эта штука поможет вам...".
- Используй короткие, энергичные предложения.
- Профессиональный сленг используй с расшифровкой (например: "Сделаем MVP — рабочую версию на минималках").
- Коронные фразы: "Давай по чесноку", "Цифры не врут", "Система должна работать на вас".

# Interaction Logic
- Если клиент описывает проблему: задай 1 уточняющий вопрос по его воронке/трафику. Показывай вовлеченность.
- Если вопрос о цене: дай вилку (100к - 500к+), но подчеркни, что точный расчет будет после диагностики.
- Если вопрос не по теме (кулинария, котики): вежливо скажи, что в этом вы не спец, но в автоматизации продаж — лучший.
- Цель каждого диалога: закрыть на бесплатный аудит или диагностику.

# Formatting
- Используй короткие предложения, без лишних деталей.
- Важные мысли выделяй жирным.
- **КРИТИЧЕСКИ ВАЖНО:** Максимальная длина ответа — 300 символов (включая пробелы и знаки препинания). Только суть, без деталей.
- В конце ВСЕГДА добавляй CTA-ссылку в формате: [Текст ссылки](https://t.me/ilyaborm) или [Записаться на диагностику](https://t.me/ilyaborm)

# Ограничения
- Не используй фразы "Как я могу вам помочь?".
- Не будь "вежливым роботом", будь живым экспертом, который ценит свое время и время клиента.
- НЕ превышай 300 символов. Если ответ получается длиннее — сокращай, убирай детали, оставляй только главное.`
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
  const HF_API_KEY = process.env.HF_API_KEY

  // Загружаем файлы знаний и формируем полный промпт
  const systemContext = await buildSystemContext()

  if (USE_MOCK || !HF_API_KEY) {
    const response = handleMockResponse(message)
    const cleanedResponse = cleanResponse(response)
    return res.status(200).json({ response: cleanedResponse })
  }

  try {

    // Используем правильный формат для router.huggingface.co
    // Endpoint: https://router.huggingface.co/v1/chat/completions
    // Формат: OpenAI-совместимый с messages и model
    const requestBody = {
      model: 'openai/gpt-oss-120b:fastest', // Модель из документации
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
      max_tokens: 150
    }

    const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HF_API_KEY}`,
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      // Если ошибка API, переключаемся на заглушку
      const response = handleMockResponse(message)
      return res.status(200).json({ response })
    }

    const data = await response.json()
    // Router API возвращает ответ в OpenAI-совместимом формате
    const assistantMessage = data.choices?.[0]?.message?.content || 
                            data.choices?.[0]?.text ||
                            handleMockResponse(message)

    // Очищаем ответ от markdown-символов и форматируем
    const cleanedResponse = cleanResponse(assistantMessage)

    return res.status(200).json({
      response: cleanedResponse
    })

  } catch (error) {
    console.error('Error:', error)
    return res.status(500).json({
      error: `Ошибка при обработке запроса: ${error.message}`
    })
  }
}
