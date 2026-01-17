// Тестовый скрипт для проверки Groq API
// Запуск: node test-groq.js

import dotenv from 'dotenv'
dotenv.config()

const GROQ_API_KEY = process.env.GROQ_API_KEY

if (!GROQ_API_KEY) {
  console.error('❌ GROQ_API_KEY не найден в .env файле')
  process.exit(1)
}

console.log('✅ Токен найден:', GROQ_API_KEY.substring(0, 10) + '...')
console.log('📡 Отправляю тестовый запрос к Groq API...\n')

try {
  // Проверяем токен - он должен начинаться с gsk_
  if (!GROQ_API_KEY.startsWith('gsk_')) {
    console.warn('⚠️ Токен не начинается с gsk_ - возможно, это не Groq токен')
  }
  
  console.log('Пробую модель: llama-3.1-8b-instant')
  console.log('Длина токена:', GROQ_API_KEY.length)
  console.log('Первые 20 символов:', GROQ_API_KEY.substring(0, 20))
  
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY.trim()}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'user',
          content: 'Hello'
        }
      ],
      max_tokens: 10
    })
  })

  console.log('Статус ответа:', response.status, response.statusText)

  if (!response.ok) {
    const errorData = await response.text()
    console.error('❌ Ошибка Groq API:')
    console.error(errorData)
    
    try {
      const errorJson = JSON.parse(errorData)
      console.error('\nДетали ошибки:')
      console.error(JSON.stringify(errorJson, null, 2))
    } catch (e) {
      console.error('Не удалось распарсить ошибку как JSON')
    }
  } else {
    const data = await response.json()
    console.log('✅ Успешный ответ от Groq API!')
    console.log('Ответ:', data.choices[0]?.message?.content)
  }
} catch (error) {
  console.error('❌ Ошибка при запросе:')
  console.error(error.message)
  console.error(error.stack)
}
