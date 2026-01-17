// Прямой тест подключения к Groq API
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Загружаем .env из корня проекта
dotenv.config({ path: join(__dirname, '..', '.env') })

const GROQ_API_KEY = process.env.GROQ_API_KEY

console.log('🔍 Тест подключения к Groq API')
console.log('='.repeat(60))
console.log('GROQ_API_KEY существует:', !!GROQ_API_KEY)
console.log('GROQ_API_KEY первые 20 символов:', GROQ_API_KEY ? GROQ_API_KEY.substring(0, 20) + '...' : 'не найден')
console.log('GROQ_API_KEY длина:', GROQ_API_KEY ? GROQ_API_KEY.length : 0)

if (!GROQ_API_KEY) {
  console.error('❌ GROQ_API_KEY не найден!')
  process.exit(1)
}

// Тестируем разные модели (актуальные на январь 2025)
// Проверено на https://console.groq.com/docs/models
const models = [
  'llama-3.1-8b-instant',           // Быстрая модель
  'llama-3.1-70b-versatile',        // Мощная модель
  'llama-3.3-70b-versatile',        // Новая модель
  'llama-3.2-90b-text-preview',     // Preview модель
  'mixtral-8x7b-32768',             // Mixtral
  'gemma2-9b-it',                   // Gemma 2
  'llama-3.1-70b-versatile',        // Дублируем для проверки
  'llama-3.1-8b-instant'            // Дублируем для проверки
]

async function testModel(modelName) {
  try {
    console.log(`\n📡 Тестирую модель: ${modelName}`)
    
    const requestBody = {
      model: modelName,
      messages: [
        {
          role: 'user',
          content: 'Привет'
        }
      ],
      temperature: 0.7,
      max_tokens: 50
    }
    
    const startTime = Date.now()
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY.trim()}`,
      },
      body: JSON.stringify(requestBody)
    })
    const responseTime = Date.now() - startTime
    
    console.log(`   Статус: ${response.status} ${response.statusText} (${responseTime}ms)`)
    
    if (!response.ok) {
      const errorData = await response.text()
      console.error(`   ❌ Ошибка: ${errorData.substring(0, 300)}`)
      return { success: false, model: modelName, status: response.status, error: errorData }
    }
    
    const data = await response.json()
    const message = data.choices?.[0]?.message?.content || 'Нет ответа'
    console.log(`   ✅ Успешно! Ответ: ${message.substring(0, 100)}...`)
    return { success: true, model: modelName, response: message }
    
  } catch (error) {
    console.error(`   ❌ Исключение: ${error.message}`)
    return { success: false, model: modelName, error: error.message }
  }
}

async function runTests() {
  console.log('\n🧪 Начинаю тестирование моделей...\n')
  
  const results = []
  for (const model of models) {
    const result = await testModel(model)
    results.push(result)
    
    // Если модель работает, останавливаемся
    if (result.success) {
      console.log(`\n✅ НАЙДЕНА РАБОТАЮЩАЯ МОДЕЛЬ: ${model}`)
      break
    }
    
    // Небольшая задержка между попытками
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('📊 ИТОГИ ТЕСТИРОВАНИЯ:')
  console.log('='.repeat(60))
  
  const workingModels = results.filter(r => r.success)
  const failedModels = results.filter(r => !r.success)
  
  if (workingModels.length > 0) {
    console.log(`\n✅ Рабочие модели (${workingModels.length}):`)
    workingModels.forEach(r => console.log(`   - ${r.model}`))
  }
  
  if (failedModels.length > 0) {
    console.log(`\n❌ Недоступные модели (${failedModels.length}):`)
    failedModels.forEach(r => {
      console.log(`   - ${r.model}: статус ${r.status || 'error'}`)
      if (r.status === 429) {
        console.log(`     ⚠️ RATE LIMIT - Превышен лимит запросов!`)
      } else if (r.status === 401) {
        console.log(`     ⚠️ UNAUTHORIZED - Проблема с API ключом!`)
      }
    })
  }
  
  if (workingModels.length === 0) {
    console.log('\n❌ ВСЕ МОДЕЛИ НЕДОСТУПНЫ!')
    console.log('\n💡 Возможные причины:')
    console.log('   1. Rate Limit (429) - один ключ используется локально и на Vercel')
    console.log('   2. Неверный API ключ (401)')
    console.log('   3. Проблемы с интернет-соединением')
    console.log('   4. Все модели действительно недоступны')
  }
}

runTests().catch(console.error)
