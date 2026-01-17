// Тест разных вариантов endpoint и форматов запросов к Groq API
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '..', '.env') })

const GROQ_API_KEY = process.env.GROQ_API_KEY

console.log('🔍 Тест разных вариантов endpoint Groq API')
console.log('='.repeat(60))
console.log('GROQ_API_KEY первые 20 символов:', GROQ_API_KEY ? GROQ_API_KEY.substring(0, 20) + '...' : 'не найден')
console.log('')

if (!GROQ_API_KEY) {
  console.error('❌ GROQ_API_KEY не найден!')
  process.exit(1)
}

// Варианты endpoint для тестирования
const endpoints = [
  {
    name: 'OpenAI-совместимый (стандартный)',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY.trim()}`,
    }
  },
  {
    name: 'OpenAI-совместимый (с дополнительными заголовками)',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY.trim()}`,
      'User-Agent': 'Groq-API-Client/1.0',
    }
  },
  {
    name: 'Прямой Groq endpoint (если существует)',
    url: 'https://api.groq.com/v1/chat/completions',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY.trim()}`,
    }
  },
  {
    name: 'С API ключом в заголовке groq-api-key',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    headers: {
      'Content-Type': 'application/json',
      'groq-api-key': GROQ_API_KEY.trim(),
    }
  },
]

async function testEndpoint(endpoint, index) {
  console.log(`\n📡 Тест ${index + 1}: ${endpoint.name}`)
  console.log(`   URL: ${endpoint.url}`)
  console.log(`   Headers:`, Object.keys(endpoint.headers).join(', '))
  
  try {
    const requestBody = {
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'user',
          content: 'Hi'
        }
      ],
      temperature: 0.7,
      max_tokens: 10
    }
    
    const startTime = Date.now()
    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: endpoint.headers,
      body: JSON.stringify(requestBody)
    })
    const responseTime = Date.now() - startTime
    
    console.log(`   Статус: ${response.status} ${response.statusText} (${responseTime}ms)`)
    
    // Получаем все заголовки ответа
    const responseHeaders = {}
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value
    })
    
    if (response.status === 200 || response.status === 201) {
      const data = await response.json()
      const message = data.choices?.[0]?.message?.content || 'Нет ответа'
      console.log(`   ✅ УСПЕХ! Ответ: ${message.substring(0, 50)}...`)
      console.log(`   📋 Заголовки ответа:`)
      Object.entries(responseHeaders).forEach(([key, value]) => {
        if (key.toLowerCase().includes('rate') || key.toLowerCase().includes('limit') || key.toLowerCase().includes('remaining')) {
          console.log(`      ${key}: ${value}`)
        }
      })
      return { success: true, endpoint: endpoint.name, response: message }
    } else {
      const errorText = await response.text()
      console.log(`   ❌ Ошибка: ${errorText.substring(0, 300)}`)
      
      // Пытаемся распарсить JSON ошибки
      try {
        const errorJson = JSON.parse(errorText)
        if (errorJson.error) {
          console.log(`   📋 Детали:`)
          console.log(`      Тип: ${errorJson.error.type || 'unknown'}`)
          console.log(`      Сообщение: ${errorJson.error.message || 'unknown'}`)
          console.log(`      Код: ${errorJson.error.code || 'unknown'}`)
          if (errorJson.error.param) {
            console.log(`      Параметр: ${errorJson.error.param}`)
          }
        }
      } catch (e) {
        // Не JSON
      }
      
      return { success: false, endpoint: endpoint.name, status: response.status, error: errorText }
    }
  } catch (error) {
    console.error(`   ❌ Исключение: ${error.message}`)
    if (error.cause) {
      console.error(`   Причина: ${error.cause}`)
    }
    return { success: false, endpoint: endpoint.name, error: error.message }
  }
}

// Также тестируем простой GET запрос к /models
async function testModelsEndpoint() {
  console.log(`\n📡 Дополнительный тест: GET /models`)
  console.log(`   URL: https://api.groq.com/openai/v1/models`)
  
  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY.trim()}`,
      },
    })
    
    console.log(`   Статус: ${response.status} ${response.statusText}`)
    
    if (response.ok) {
      const data = await response.json()
      const models = data.data || []
      console.log(`   ✅ УСПЕХ! Доступно моделей: ${models.length}`)
      if (models.length > 0) {
        console.log(`   📋 Первые 3 модели:`)
        models.slice(0, 3).forEach(m => {
          console.log(`      - ${m.id}`)
        })
      }
      return { success: true }
    } else {
      const errorText = await response.text()
      console.log(`   ❌ Ошибка: ${errorText.substring(0, 300)}`)
      return { success: false, status: response.status, error: errorText }
    }
  } catch (error) {
    console.error(`   ❌ Исключение: ${error.message}`)
    return { success: false, error: error.message }
  }
}

async function runAllTests() {
  console.log('🧪 Начинаю тестирование всех вариантов endpoint...\n')
  
  const results = []
  
  // Тестируем все варианты endpoint
  for (let i = 0; i < endpoints.length; i++) {
    const result = await testEndpoint(endpoints[i], i)
    results.push(result)
    
    // Если нашли рабочий вариант, останавливаемся
    if (result.success) {
      console.log(`\n🎉 НАЙДЕН РАБОЧИЙ ВАРИАНТ: ${result.endpoint}`)
      break
    }
    
    // Небольшая задержка между попытками
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  // Тестируем /models endpoint
  const modelsResult = await testModelsEndpoint()
  results.push({ ...modelsResult, endpoint: 'GET /models' })
  
  // Итоги
  console.log('\n' + '='.repeat(60))
  console.log('📊 ИТОГОВЫЕ РЕЗУЛЬТАТЫ:')
  console.log('='.repeat(60))
  
  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)
  
  if (successful.length > 0) {
    console.log(`\n✅ Рабочие варианты (${successful.length}):`)
    successful.forEach(r => {
      console.log(`   - ${r.endpoint}`)
      if (r.response) {
        console.log(`     Ответ: ${r.response.substring(0, 50)}...`)
      }
    })
  }
  
  if (failed.length > 0) {
    console.log(`\n❌ Неудачные варианты (${failed.length}):`)
    failed.forEach(r => {
      console.log(`   - ${r.endpoint}: статус ${r.status || 'error'}`)
      if (r.status === 403) {
        console.log(`     ⚠️ FORBIDDEN - Проблема с правами доступа`)
      } else if (r.status === 401) {
        console.log(`     ⚠️ UNAUTHORIZED - Проблема с API ключом`)
      } else if (r.status === 404) {
        console.log(`     ⚠️ NOT FOUND - Неверный endpoint`)
      }
    })
  }
  
  if (successful.length === 0) {
    console.log('\n❌ ВСЕ ВАРИАНТЫ НЕ РАБОТАЮТ!')
    console.log('\n💡 Это означает, что проблема НЕ в endpoint или формате запроса,')
    console.log('   а в самом API ключе или аккаунте Groq.')
    console.log('\n🔧 Рекомендации:')
    console.log('   1. Проверьте роль пользователя (нужна owner или developer)')
    console.log('   2. Проверьте, подтвержден ли email аккаунта')
    console.log('   3. Проверьте тариф (может потребоваться привязать карту)')
    console.log('   4. Подождите 5-10 минут после создания ключа')
    console.log('   5. Создайте новый ключ')
  } else {
    console.log('\n✅ НАЙДЕН РАБОЧИЙ ВАРИАНТ!')
    console.log('💡 Обновите код, чтобы использовать этот endpoint/формат')
  }
}

runAllTests().catch(console.error)
