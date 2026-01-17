// Простой тест Groq API
import dotenv from 'dotenv'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '..', '.env') })

const API_KEY = process.env.GROQ_API_KEY

console.log('🔑 API Key:', API_KEY ? API_KEY.substring(0, 20) + '...' : 'НЕ НАЙДЕН')
console.log('📏 Длина:', API_KEY?.length || 0)

if (!API_KEY) {
  console.error('❌ Ключ не найден!')
  process.exit(1)
}

// Простейший запрос
const body = JSON.stringify({
  model: 'llama-3.1-8b-instant',
  messages: [{ role: 'user', content: 'Hi' }],
  max_tokens: 10
})

console.log('\n📡 Отправляю запрос...')
console.log('URL: https://api.groq.com/openai/v1/chat/completions')
console.log('Model: llama-3.1-8b-instant')

try {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY.trim()}`,
      'Content-Type': 'application/json'
    },
    body
  })

  console.log(`\n📊 Статус: ${response.status} ${response.statusText}`)
  
  const text = await response.text()
  console.log('📄 Ответ:', text.substring(0, 500))
  
  if (response.ok) {
    const data = JSON.parse(text)
    console.log('\n✅ УСПЕХ!')
    console.log('Ответ модели:', data.choices?.[0]?.message?.content)
  } else {
    console.log('\n❌ ОШИБКА')
    try {
      const error = JSON.parse(text)
      console.log('Детали:', JSON.stringify(error, null, 2))
    } catch (e) {
      console.log('Текст ошибки:', text)
    }
  }
} catch (error) {
  console.error('\n❌ ИСКЛЮЧЕНИЕ:', error.message)
  console.error('Stack:', error.stack)
}
