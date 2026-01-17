// Тест API ключа Groq через разные endpoints
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '..', '.env') })

const GROQ_API_KEY = process.env.GROQ_API_KEY

console.log('🔍 Тест API ключа Groq')
console.log('='.repeat(60))
console.log('GROQ_API_KEY первые 20 символов:', GROQ_API_KEY ? GROQ_API_KEY.substring(0, 20) + '...' : 'не найден')
console.log('GROQ_API_KEY длина:', GROQ_API_KEY ? GROQ_API_KEY.length : 0)
console.log('')

if (!GROQ_API_KEY) {
  console.error('❌ GROQ_API_KEY не найден!')
  process.exit(1)
}

// Тест 1: Проверка списка доступных моделей
async function testModelsList() {
  console.log('📡 Тест 1: Получение списка моделей (/models)')
  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY.trim()}`,
      },
    })
    
    console.log(`   Статус: ${response.status} ${response.statusText}`)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`   ❌ Ошибка: ${errorText.substring(0, 500)}`)
      return { success: false, status: response.status, error: errorText }
    }
    
    const data = await response.json()
    const models = data.data || []
    console.log(`   ✅ Успешно! Доступно моделей: ${models.length}`)
    if (models.length > 0) {
      console.log(`   📋 Первые 5 моделей:`)
      models.slice(0, 5).forEach(m => {
        console.log(`      - ${m.id} (${m.owned_by || 'unknown'})`)
      })
    }
    return { success: true, models: models.map(m => m.id) }
  } catch (error) {
    console.error(`   ❌ Исключение: ${error.message}`)
    return { success: false, error: error.message }
  }
}

// Тест 2: Простой запрос к chat/completions
async function testChatCompletion() {
  console.log('\n📡 Тест 2: Простой запрос к chat/completions')
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
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY.trim()}`,
      },
      body: JSON.stringify(requestBody)
    })
    
    console.log(`   Статус: ${response.status} ${response.statusText}`)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`   ❌ Ошибка: ${errorText.substring(0, 500)}`)
      
      // Парсим JSON ошибки, если возможно
      try {
        const errorJson = JSON.parse(errorText)
        if (errorJson.error) {
          console.error(`   📋 Детали ошибки:`)
          console.error(`      - Тип: ${errorJson.error.type || 'unknown'}`)
          console.error(`      - Сообщение: ${errorJson.error.message || 'unknown'}`)
          console.error(`      - Код: ${errorJson.error.code || 'unknown'}`)
        }
      } catch (e) {
        // Не JSON, просто текст
      }
      
      return { success: false, status: response.status, error: errorText }
    }
    
    const data = await response.json()
    const message = data.choices?.[0]?.message?.content || 'Нет ответа'
    console.log(`   ✅ Успешно! Ответ: ${message.substring(0, 100)}`)
    return { success: true, response: message }
  } catch (error) {
    console.error(`   ❌ Исключение: ${error.message}`)
    return { success: false, error: error.message }
  }
}

// Тест 3: Проверка заголовков ответа
async function testHeaders() {
  console.log('\n📡 Тест 3: Проверка заголовков ответа')
  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY.trim()}`,
      },
    })
    
    console.log(`   Статус: ${response.status}`)
    console.log(`   Заголовки ответа:`)
    response.headers.forEach((value, key) => {
      if (key.toLowerCase().includes('rate') || key.toLowerCase().includes('limit') || key.toLowerCase().includes('remaining')) {
        console.log(`      ${key}: ${value}`)
      }
    })
    
    return { success: response.ok, status: response.status }
  } catch (error) {
    console.error(`   ❌ Исключение: ${error.message}`)
    return { success: false, error: error.message }
  }
}

async function runAllTests() {
  const results = {
    modelsList: await testModelsList(),
    chatCompletion: await testChatCompletion(),
    headers: await testHeaders()
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('📊 ИТОГОВЫЕ РЕЗУЛЬТАТЫ:')
  console.log('='.repeat(60))
  
  if (results.modelsList.success) {
    console.log('✅ Тест 1 (список моделей): УСПЕШНО')
    console.log(`   💡 Доступно ${results.modelsList.models?.length || 0} моделей`)
  } else {
    console.log('❌ Тест 1 (список моделей): ОШИБКА')
    console.log(`   Статус: ${results.modelsList.status || 'unknown'}`)
    if (results.modelsList.status === 403) {
      console.log('   ⚠️ FORBIDDEN (403) - Проблема с правами доступа!')
      console.log('   💡 Возможные причины:')
      console.log('      1. Ключ не активирован (подождите несколько минут)')
      console.log('      2. Неверная роль пользователя (нужна роль owner или developer)')
      console.log('      3. Аккаунт не подтвержден (проверьте email)')
      console.log('      4. Ограничения на аккаунте')
    }
  }
  
  if (results.chatCompletion.success) {
    console.log('\n✅ Тест 2 (chat/completions): УСПЕШНО')
  } else {
    console.log('\n❌ Тест 2 (chat/completions): ОШИБКА')
    console.log(`   Статус: ${results.chatCompletion.status || 'unknown'}`)
  }
  
  if (results.headers.success) {
    console.log('\n✅ Тест 3 (заголовки): УСПЕШНО')
  } else {
    console.log('\n❌ Тест 3 (заголовки): ОШИБКА')
  }
  
  console.log('\n💡 РЕКОМЕНДАЦИИ:')
  if (!results.modelsList.success && results.modelsList.status === 403) {
    console.log('   1. Проверьте роль пользователя на https://console.groq.com')
    console.log('      (нужна роль owner или developer)')
    console.log('   2. Подождите 5-10 минут после создания ключа (активация)')
    console.log('   3. Проверьте, подтвержден ли email аккаунта')
    console.log('   4. Попробуйте создать новый ключ')
  } else if (results.modelsList.success && !results.chatCompletion.success) {
    console.log('   ✅ Ключ работает, но модель недоступна')
    console.log('   💡 Попробуйте другую модель из списка доступных')
  } else if (results.modelsList.success && results.chatCompletion.success) {
    console.log('   ✅ ВСЕ ТЕСТЫ ПРОЙДЕНЫ! Ключ работает корректно!')
  }
}

runAllTests().catch(console.error)
