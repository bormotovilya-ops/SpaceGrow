// Тест через curl-подобный запрос для проверки точного формата
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '..', '.env') })

const GROQ_API_KEY = process.env.GROQ_API_KEY

console.log('🔍 Тест через curl (точный формат запроса)')
console.log('='.repeat(60))
console.log('GROQ_API_KEY первые 20 символов:', GROQ_API_KEY ? GROQ_API_KEY.substring(0, 20) + '...' : 'не найден')
console.log('')

if (!GROQ_API_KEY) {
  console.error('❌ GROQ_API_KEY не найден!')
  process.exit(1)
}

// Тест 1: Простой запрос через curl к /models
async function testCurlModels() {
  console.log('📡 Тест 1: curl GET /models')
  try {
    const curlCommand = `curl -X GET "https://api.groq.com/openai/v1/models" -H "Authorization: Bearer ${GROQ_API_KEY.trim()}" -H "Content-Type: application/json" -v`
    console.log(`   Команда: curl -X GET "https://api.groq.com/openai/v1/models" -H "Authorization: Bearer ..."`)
    
    const { stdout, stderr } = await execAsync(curlCommand, { 
      maxBuffer: 1024 * 1024,
      timeout: 10000
    })
    
    console.log(`   ✅ Выполнено`)
    if (stdout) {
      console.log(`   Ответ: ${stdout.substring(0, 500)}`)
    }
    if (stderr) {
      console.log(`   Stderr: ${stderr.substring(0, 500)}`)
    }
    
    return { success: true, output: stdout }
  } catch (error) {
    console.log(`   ❌ Ошибка: ${error.message}`)
    if (error.stdout) {
      console.log(`   Stdout: ${error.stdout.substring(0, 500)}`)
    }
    if (error.stderr) {
      console.log(`   Stderr: ${error.stderr.substring(0, 500)}`)
    }
    return { success: false, error: error.message }
  }
}

// Тест 2: Простой запрос через curl к /chat/completions
async function testCurlChat() {
  console.log('\n📡 Тест 2: curl POST /chat/completions')
  try {
    const requestBody = JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'user',
          content: 'Hi'
        }
      ],
      temperature: 0.7,
      max_tokens: 10
    })
    
    const curlCommand = `curl -X POST "https://api.groq.com/openai/v1/chat/completions" -H "Authorization: Bearer ${GROQ_API_KEY.trim()}" -H "Content-Type: application/json" -d '${requestBody}' -v`
    console.log(`   Команда: curl -X POST "https://api.groq.com/openai/v1/chat/completions" ...`)
    
    const { stdout, stderr } = await execAsync(curlCommand, { 
      maxBuffer: 1024 * 1024,
      timeout: 10000
    })
    
    console.log(`   ✅ Выполнено`)
    if (stdout) {
      console.log(`   Ответ: ${stdout.substring(0, 500)}`)
    }
    if (stderr) {
      console.log(`   Stderr: ${stderr.substring(0, 500)}`)
    }
    
    return { success: true, output: stdout }
  } catch (error) {
    console.log(`   ❌ Ошибка: ${error.message}`)
    if (error.stdout) {
      console.log(`   Stdout: ${error.stdout.substring(0, 500)}`)
    }
    if (error.stderr) {
      console.log(`   Stderr: ${error.stderr.substring(0, 500)}`)
    }
    return { success: false, error: error.message }
  }
}

// Тест 3: Проверка через fetch с максимально простым запросом
async function testMinimalFetch() {
  console.log('\n📡 Тест 3: Минимальный fetch запрос')
  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY.trim()}`,
      },
    })
    
    console.log(`   Статус: ${response.status} ${response.statusText}`)
    console.log(`   Headers ответа:`)
    response.headers.forEach((value, key) => {
      console.log(`      ${key}: ${value}`)
    })
    
    const text = await response.text()
    console.log(`   Тело ответа: ${text.substring(0, 500)}`)
    
    if (response.ok) {
      return { success: true, status: response.status }
    } else {
      return { success: false, status: response.status, error: text }
    }
  } catch (error) {
    console.log(`   ❌ Исключение: ${error.message}`)
    return { success: false, error: error.message }
  }
}

async function runAllTests() {
  console.log('🧪 Начинаю тестирование через curl и минимальные запросы...\n')
  
  // Тест через fetch (самый простой)
  const fetchResult = await testMinimalFetch()
  
  // Тесты через curl (если curl доступен)
  let curlModelsResult = null
  let curlChatResult = null
  
  try {
    await execAsync('curl --version', { timeout: 2000 })
    console.log('\n✅ curl доступен, выполняю тесты через curl...')
    curlModelsResult = await testCurlModels()
    curlChatResult = await testCurlChat()
  } catch (error) {
    console.log('\n⚠️ curl не доступен, пропускаю curl тесты')
  }
  
  // Итоги
  console.log('\n' + '='.repeat(60))
  console.log('📊 ИТОГОВЫЕ РЕЗУЛЬТАТЫ:')
  console.log('='.repeat(60))
  
  if (fetchResult.success) {
    console.log('\n✅ Минимальный fetch запрос: УСПЕШНО')
  } else {
    console.log('\n❌ Минимальный fetch запрос: ОШИБКА')
    console.log(`   Статус: ${fetchResult.status || 'unknown'}`)
    if (fetchResult.status === 403) {
      console.log('   ⚠️ FORBIDDEN (403) - Проблема с правами доступа')
      console.log('\n💡 ВОЗМОЖНЫЕ ПРИЧИНЫ:')
      console.log('   1. Model Permissions - модели заблокированы для проекта/организации')
      console.log('      → Проверьте: Console → Settings → Organization → Limits → Model Permissions')
      console.log('   2. Роль пользователя - нужна Developer или Owner')
      console.log('      → Проверьте: Console → Settings → Team → Roles')
      console.log('   3. Проект/организация - ключ не назначен к правильному проекту')
      console.log('      → Проверьте: Console → Projects')
      console.log('   4. Free Tier ограничения - может потребоваться подтверждение')
      console.log('      → Проверьте: Console → Billing → Settings')
    }
  }
  
  if (curlModelsResult) {
    if (curlModelsResult.success) {
      console.log('\n✅ curl GET /models: УСПЕШНО')
    } else {
      console.log('\n❌ curl GET /models: ОШИБКА')
    }
  }
  
  if (curlChatResult) {
    if (curlChatResult.success) {
      console.log('\n✅ curl POST /chat/completions: УСПЕШНО')
    } else {
      console.log('\n❌ curl POST /chat/completions: ОШИБКА')
    }
  }
}

runAllTests().catch(console.error)
