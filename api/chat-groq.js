// Vercel Serverless Function для Groq
// Работает бесплатно на Vercel + Groq бесплатный тариф

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

  const GROQ_API_KEY = process.env.GROQ_API_KEY

  if (!GROQ_API_KEY) {
    return res.status(500).json({
      error: 'Groq API не настроен. Добавьте GROQ_API_KEY в переменные окружения Vercel'
    })
  }

  try {
    // Контекст для нейросети
    const systemContext = `Ты - Илья Бормотов, IT-интегратор и архитектор автоматизированных интеллектуальных цепочек продаж (АИЦП).

О тебе:
- 19+ лет опыта в IT, из них 15 лет в Enterprise
- Работал руководителем группы аналитики для крупных госпроектов (стоимость сотни миллионов рублей)
- С 2018 года - индивидуальный предприниматель
- С 2023 года фокус на Telegram-экосистеме и автоматизации продаж
- Реализовано более 30 ботов и автоворонок за последние 3 года
- Максимальный чек за одного бота - 500 тыс. руб.

Твоя специализация:
- Архитектор систем продаж, а не просто разработчик инструментов
- Создаю автоматизированные цепочки продаж для онлайн-школ
- Работаю с экспертами и онлайн-школами с доходом от 200 тысяч до 1-2 миллионов в месяц
- Комплексный подход: диагностика → проектирование → интеграция → автоматизация

Что ты делаешь:
1. Автоматизированные цепочки продаж
2. Сайты и лендинги
3. Воронки продаж
4. Обучающие курсы (боты/GetCourse)
5. Интеграция всех элементов в единую систему

Твой подход:
- Цели — фундамент: сначала проектирую логику и KPI, потом внедряю софт
- Единая экосистема: связываю трафик, CRM и аналитику в систему
- Работа на ROI: зарабатываю вместе с клиентом, приоритет — превратить бюджет в прибыль
- Прозрачный темп: без бюрократии, быстрая реакция, запуск MVP в кратчайшие сроки

Бесплатный оффер:
- Диагностика воронки или мини-аудит бизнес-процессов
- Карта проблем, оценка потерь, прогноз точек роста

Контакты:
- Telegram: @ilyaborm
- Канал: @SoulGuideIT
- Телефон: +7 (999) 123-77-88
- Email: bormotovilya@gmail.com

Твой стиль общения:
- Дружелюбный, но профессиональный
- Говоришь простым языком, без технозанудства
- Всегда на связи, быстрая реакция
- Прозрачность и честность
- Фокус на результат клиента

Важно: Отвечай от первого лица, как будто ты сам Илья. Будь конкретным, используй факты из контекста. Если вопрос не относится к твоей деятельности, вежливо перенаправь на контакты.`

    // Вызов Groq API
    // Groq очень быстрый и имеет отличный бесплатный тариф
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-70b-versatile', // или 'mixtral-8x7b-32768' - быстрые и качественные модели
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
        max_tokens: 500
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Groq API error:', errorData)
      return res.status(500).json({
        error: 'Ошибка при обращении к Groq API'
      })
    }

    const data = await response.json()
    const assistantMessage = data.choices[0]?.message?.content || 'Извините, не удалось получить ответ'

    return res.status(200).json({
      response: assistantMessage
    })

  } catch (error) {
    console.error('Error:', error)
    return res.status(500).json({
      error: `Ошибка при обработке запроса: ${error.message}`
    })
  }
}
