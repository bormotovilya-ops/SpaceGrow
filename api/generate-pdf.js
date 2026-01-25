// Vercel Serverless Function для генерации PDF на сервере
// Используем Puppeteer для скриншота HTML, затем конвертируем в PDF (решает проблему с кириллицей)

import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'

// Функция генерации HTML-контента (аналогично клиентской версии)
function generatePDFHTML(methodName, methodId, resultData, birthDate, soulDetails = null) {
  const textContent = resultData?.result || 'Результат расчета недоступен'
  
  return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Inter', 'Arial', sans-serif;
      width: 794px;
      min-height: 1123px;
      background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%);
      margin: 0;
      padding: 0;
    }
  </style>
</head>
<body>
  <!-- Премиальная золотая полоса сверху -->
  <div style="
    width: 100%;
    height: 45px;
    background: linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FFD700 100%);
    box-shadow: 0 4px 20px rgba(255, 215, 0, 0.3);
  "></div>
  
  <!-- Премиальная темная область для заголовка -->
  <div style="
    width: 100%;
    background: linear-gradient(135deg, #191923 0%, #1a1a24 50%, #191923 100%);
    padding: 50px 30px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  ">
    <h1 style="
      color: #FFD700;
      font-size: 28px;
      font-weight: 700;
      text-align: center;
      margin: 0;
      padding: 0;
      letter-spacing: 1px;
      font-family: 'Inter', 'Arial', sans-serif;
    ">${methodName}</h1>
  </div>
  
  <!-- Контент -->
  <div style="
    width: 100%;
    background: #ffffff;
    padding: 40px 30px;
    box-sizing: border-box;
  ">
    <!-- Дата рождения -->
    <div style="
      text-align: center;
      margin: 0 0 30px 0;
      padding: 12px;
      background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 215, 0, 0.05) 100%);
      border-radius: 8px;
      border: 1px solid rgba(255, 215, 0, 0.3);
    ">
      <p style="
        color: #191923;
        font-size: 13px;
        font-weight: 600;
        margin: 0;
        font-family: 'Inter', 'Arial', sans-serif;
      ">📅 Дата рождения: <span style="color: #C89600; font-weight: 700; font-size: 14px;">${birthDate}</span></p>
    </div>
    
    <!-- Разделительная линия -->
    <div style="
      width: 100%;
      height: 2px;
      background: linear-gradient(90deg, transparent 0%, #FFD700 50%, transparent 100%);
      margin: 0 0 35px 0;
    "></div>
    
    <!-- Основной текст -->
    <div style="
      color: #282828;
      font-size: 12px;
      line-height: 1.8;
      margin: 0 0 25px 0;
      text-align: justify;
      font-family: 'Inter', 'Arial', sans-serif;
      white-space: pre-line;
      background: #ffffff;
      padding: 25px 20px;
      border-radius: 12px;
      border: 1px solid rgba(255, 215, 0, 0.2);
    ">
      ${textContent.replace(/\n/g, '<br>')}
    </div>
    
    ${resultData?.value ? `
    <!-- Ключевое значение -->
    <div style="
      background: linear-gradient(135deg, #FFF6E6 0%, #FFEECC 50%, #FFF6E6 100%);
      border-left: 5px solid #FFD700;
      padding: 25px;
      margin: 30px 0 0 0;
      border-radius: 10px;
      box-shadow: 0 4px 15px rgba(255, 215, 0, 0.15);
    ">
      <p style="
        color: #8B6914;
        font-size: 13px;
        font-weight: 700;
        margin: 0;
        font-family: 'Inter', 'Arial', sans-serif;
      ">✨ Ключевое значение: <span style="color: #C89600; font-size: 16px; font-weight: 800;">${resultData.value}</span></p>
    </div>
    ` : ''}
  </div>
  
  <!-- ВТОРАЯ СТРАНИЦА: Демо-приписка -->
  <div style="
    page-break-before: always;
    width: 100%;
    min-height: 1123px;
    background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%);
    padding: 60px 30px;
    box-sizing: border-box;
  ">
    <!-- Премиальный промо-блок -->
    <div style="
      margin-top: 70px;
      padding: 40px 30px;
      background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 215, 0, 0.1) 50%, rgba(255, 215, 0, 0.15) 100%);
      border: 2px solid rgba(255, 215, 0, 0.5);
      border-radius: 20px;
      position: relative;
      box-shadow: 0 12px 50px rgba(255, 215, 0, 0.3);
    ">
      <h3 style="
        color: #191923;
        font-size: 22px;
        font-weight: 700;
        text-align: center;
        margin: 0 0 25px 0;
        font-family: 'Inter', 'Arial', sans-serif;
      ">🌌 Космический тест-драйв пройден!</h3>
      
      <div style="
        width: 80px;
        height: 2px;
        background: linear-gradient(90deg, transparent 0%, #FFD700 50%, transparent 100%);
        margin: 0 auto 25px;
      "></div>
      
      <p style="
        color: #3a3a3a;
        font-size: 13px;
        line-height: 1.9;
        margin: 0 0 20px 0;
        text-align: justify;
        font-family: 'Inter', 'Arial', sans-serif;
      ">Перед вами — демонстрация работы нашего аналитического движка. Мы подготовили этот экспресс-анализ, чтобы показать, как алгоритмы могут мгновенно превращать сухие цифры и эфемериды в живой текст.</p>
      
      <p style="
        color: #3a3a3a;
        font-size: 13px;
        line-height: 1.9;
        margin: 0 0 20px 0;
        text-align: justify;
        font-family: 'Inter', 'Arial', sans-serif;
      ">Это лишь верхушка айсберга: мы намеренно не стали погружать вас в бесконечные таблицы и сложные аспекты, чтобы оставить интерфейс легким, а интригу — живой.</p>
      
      <p style="
        color: #3a3a3a;
        font-size: 13px;
        line-height: 1.9;
        margin: 0 0 30px 0;
        text-align: justify;
        font-family: 'Inter', 'Arial', sans-serif;
      ">Мы создаем подобные инструменты «под ключ». Если вам нужен корректный астрологический, нумерологический или любой другой расчетный модуль для вашего бота, сайта или приложения — вы по адресу. Мы берем на себя всю математику и логику.</p>
      
      <div style="
        width: 100%;
        height: 1px;
        background: linear-gradient(90deg, transparent 0%, rgba(255, 215, 0, 0.4) 50%, transparent 100%);
        margin: 35px 0;
      "></div>
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="https://t.me/SpaceGrowthBot" style="
          color: #FFD700;
          font-size: 16px;
          font-weight: 700;
          text-decoration: none;
          font-family: 'Inter', 'Arial', sans-serif;
          display: inline-block;
          padding: 12px 30px;
          border: 2px solid #FFD700;
          border-radius: 10px;
          background: rgba(255, 215, 0, 0.1);
        ">👉 Написать в Telegram</a>
      </div>
    </div>
    
    <!-- Премиальный футер -->
    <div style="
      margin-top: 40px;
      text-align: center;
      padding: 20px;
      background: linear-gradient(135deg, rgba(255, 215, 0, 0.08) 0%, rgba(255, 215, 0, 0.04) 100%);
      border-radius: 10px;
      border-top: 1px solid rgba(255, 215, 0, 0.3);
    ">
      <p style="
        margin: 0;
        color: #969696;
        font-size: 11px;
        font-style: italic;
        font-family: 'Inter', 'Arial', sans-serif;
      ">✨ Цифровая Алхимия - Персональная расшифровка ✨</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

// Функция генерации HTML-контента для персонального отчета
function generatePersonalReportHTML(reportData) {
  const formatDate = (dateString) => {
    if (!dateString) return 'Не указано'
    try {
      return new Date(dateString).toLocaleDateString('ru-RU')
    } catch {
      return dateString
    }
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '0 сек'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) return `${hours}ч ${minutes}м ${secs}с`
    if (minutes > 0) return `${minutes}м ${secs}с`
    return `${secs}с`
  }

  const getSegmentColor = (segment) => {
    const colors = {
      'newcomer': '#4a90e2',
      'engaged': '#f0ad4e',
      'converter': '#5cb85c',
      'loyal': '#9b59b6'
    }
    return colors[segment] || '#95a5a6'
  }

  const getEngagementColor = (level) => {
    const colors = {
      'low': '#e74c3c',
      'medium': '#f39c12',
      'high': '#27ae60'
    }
    return colors[level] || '#95a5a6'
  }

  return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Inter', 'Arial', sans-serif;
      width: 794px;
      min-height: 1123px;
      background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%);
      margin: 0;
      padding: 0;
      color: #191923;
    }
  </style>
</head>
<body>
  <!-- Премиальная золотая полоса сверху -->
  <div style="
    width: 100%;
    height: 45px;
    background: linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FFD700 100%);
    box-shadow: 0 4px 20px rgba(255, 215, 0, 0.3);
  "></div>

  <!-- Премиальная темная область для заголовка -->
  <div style="
    width: 100%;
    background: linear-gradient(135deg, #191923 0%, #1a1a24 50%, #191923 100%);
    padding: 50px 30px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  ">
    <h1 style="
      color: #FFD700;
      font-size: 28px;
      font-weight: 700;
      text-align: center;
      margin: 0;
      padding: 0;
      letter-spacing: 1px;
      font-family: 'Inter', 'Arial', sans-serif;
    ">Ваш персональный отчёт</h1>
    <p style="
      color: #ffffff;
      font-size: 16px;
      text-align: center;
      margin-top: 10px;
      opacity: 0.9;
    ">Анализ вашего пути в MiniApp • ${formatDate(reportData.generated_at)}</p>
  </div>

  <!-- Контент -->
  <div style="
    width: 100%;
    background: #ffffff;
    padding: 40px 30px;
    box-sizing: border-box;
  ">
    <!-- Информация о пользователе -->
    <div style="margin-bottom: 40px;">
      <h2 style="
        color: #191923;
        font-size: 20px;
        font-weight: 700;
        margin-bottom: 20px;
        border-bottom: 3px solid #FFD700;
        padding-bottom: 10px;
      ">👤 Информация о пользователе</h2>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #4a90e2;">
          <strong>Telegram ID:</strong> ${reportData.user?.tg_user_id || 'Не указан'}
        </div>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #4a90e2;">
          <strong>Cookie ID:</strong> ${reportData.user?.cookie_id || 'Не указан'}
        </div>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #f0ad4e;">
          <strong>Источник трафика:</strong> ${reportData.user?.traffic_source || 'Не определен'}
        </div>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #f0ad4e;">
          <strong>Первый визит:</strong> ${formatDate(reportData.user?.first_visit_date)}
        </div>
      </div>
    </div>

    <!-- Сегментация -->
    <div style="margin-bottom: 40px;">
      <h2 style="
        color: #191923;
        font-size: 20px;
        font-weight: 700;
        margin-bottom: 20px;
        border-bottom: 3px solid #FFD700;
        padding-bottom: 10px;
      ">🎯 Сегментация</h2>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
        <div style="
          background: ${getSegmentColor(reportData.segmentation?.user_segment)};
          color: white;
          padding: 20px;
          border-radius: 12px;
          text-align: center;
        ">
          <h3 style="margin: 0 0 10px 0; font-size: 18px;">Сегмент пользователя</h3>
          <p style="margin: 0; font-size: 24px; font-weight: 700;">${reportData.segmentation?.user_segment || 'Не определен'}</p>
        </div>
        <div style="
          background: ${getEngagementColor(reportData.segmentation?.engagement_level)};
          color: white;
          padding: 20px;
          border-radius: 12px;
          text-align: center;
        ">
          <h3 style="margin: 0 0 10px 0; font-size: 18px;">Уровень вовлеченности</h3>
          <p style="margin: 0; font-size: 24px; font-weight: 700;">${reportData.segmentation?.engagement_level || 'Не определен'}</p>
        </div>
      </div>
      <div style="margin-top: 20px; background: #f0f8ff; padding: 15px; border-radius: 8px;">
        <h4 style="margin: 0 0 10px 0; color: #191923;">Основание для сегментации:</h4>
        <ul style="margin: 0; padding-left: 20px;">
          ${reportData.segmentation?.basis?.map(item => `<li>${item}</li>`).join('') || '<li>Данные в процессе анализа</li>'}
        </ul>
      </div>
    </div>

    <!-- Рекомендации -->
    <div style="margin-bottom: 40px;">
      <h2 style="
        color: #191923;
        font-size: 20px;
        font-weight: 700;
        margin-bottom: 20px;
        border-bottom: 3px solid #FFD700;
        padding-bottom: 10px;
      ">💡 Персональные рекомендации</h2>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
          <h4 style="margin: 0 0 10px 0; color: #191923;">🎯 Следующие шаги:</h4>
          <ul style="margin: 0; padding-left: 15px;">
            ${reportData.recommendations?.next_steps?.map(step => `<li>${step}</li>`).join('') || '<li>Рекомендации формируются...</li>'}
          </ul>
        </div>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
          <h4 style="margin: 0 0 10px 0; color: #191923;">🚀 Автоматические действия:</h4>
          <ul style="margin: 0; padding-left: 15px;">
            ${reportData.recommendations?.automatic_actions?.map(action => `<li>${action}</li>`).join('') || '<li>Автоматизация настраивается...</li>'}
          </ul>
        </div>
      </div>
    </div>

    <!-- Персональный путь -->
    <div style="margin-bottom: 40px;">
      <h2 style="
        color: #191923;
        font-size: 20px;
        font-weight: 700;
        margin-bottom: 20px;
        border-bottom: 3px solid #FFD700;
        padding-bottom: 10px;
      ">🗺️ Персональный путь</h2>

      ${reportData.journey?.miniapp_opens?.length > 0 ? `
      <div style="margin-bottom: 20px;">
        <h3 style="color: #191923; margin-bottom: 10px;">📱 Открытия MiniApp:</h3>
        ${reportData.journey.miniapp_opens.slice(0, 5).map(open => `
          <div style="background: #f8f9fa; padding: 10px; margin: 5px 0; border-radius: 6px; border-left: 3px solid #4a90e2;">
            <strong>${open.page}</strong> • ${open.device} • ${formatDate(open.timestamp)}
          </div>
        `).join('')}
      </div>
      ` : ''}

      ${reportData.journey?.ai_interactions?.length > 0 ? `
      <div style="margin-bottom: 20px;">
        <h3 style="color: #191923; margin-bottom: 10px;">🤖 AI взаимодействия:</h3>
        ${reportData.journey.ai_interactions.slice(0, 3).map(interaction => `
          <div style="background: #f8f9fa; padding: 10px; margin: 5px 0; border-radius: 6px; border-left: 3px solid #9b59b6;">
            ${interaction.messages_count} сообщений • Темы: ${interaction.topics?.join(', ') || 'Общие'} • ${formatDuration(interaction.duration)}
          </div>
        `).join('')}
      </div>
      ` : ''}
    </div>
  </div>

  <!-- ВТОРАЯ СТРАНИЦА: Дополнительная информация -->
  <div style="
    page-break-before: always;
    width: 100%;
    min-height: 1123px;
    background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%);
    padding: 60px 30px;
    box-sizing: border-box;
  ">
    <h2 style="
      color: #191923;
      font-size: 24px;
      font-weight: 700;
      text-align: center;
      margin-bottom: 40px;
    ">📊 Детальный анализ активности</h2>

    ${reportData.journey?.content_views?.length > 0 ? `
    <div style="margin-bottom: 30px;">
      <h3 style="color: #191923; margin-bottom: 15px;">👁️ Просмотры контента:</h3>
      ${reportData.journey.content_views.slice(0, 10).map(view => `
        <div style="background: #f8f9fa; padding: 8px; margin: 3px 0; border-radius: 4px;">
          ${view.section} • ${formatDuration(view.time_spent)} • ${view.scroll_depth}% прокрутки
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${reportData.journey?.game_actions?.length > 0 ? `
    <div style="margin-bottom: 30px;">
      <h3 style="color: #191923; margin-bottom: 15px;">🎮 Игровые действия:</h3>
      ${reportData.journey.game_actions.slice(0, 5).map(action => `
        <div style="background: #f8f9fa; padding: 8px; margin: 3px 0; border-radius: 4px;">
          ${action.game_type} • ${action.action_type} • Очки: ${action.scores}
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${reportData.journey?.cta_clicks?.length > 0 ? `
    <div style="margin-bottom: 30px;">
      <h3 style="color: #191923; margin-bottom: 15px;">🎯 CTA клики:</h3>
      ${reportData.journey.cta_clicks.slice(0, 5).map(click => `
        <div style="background: #f8f9fa; padding: 8px; margin: 3px 0; border-radius: 4px;">
          ${click.location} • ${click.previous_step} • ${formatDuration(click.duration)}
        </div>
      `).join('')}
    </div>
    ` : ''}

    <!-- Премиальный футер -->
    <div style="
      margin-top: 60px;
      text-align: center;
      padding: 30px;
      background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 215, 0, 0.05) 100%);
      border-radius: 15px;
      border: 2px solid rgba(255, 215, 0, 0.3);
    ">
      <h3 style="color: #191923; margin-bottom: 15px;">🌟 Персонализированный подход</h3>
      <p style="color: #666; margin-bottom: 20px; line-height: 1.6;">
        Этот отчет создан специально для вас на основе вашего уникального пути взаимодействия с нашим сервисом.
        Мы анализируем каждое ваше действие, чтобы сделать наше взаимодействие максимально эффективным.
      </p>
      <p style="color: #969696; font-size: 12px; font-style: italic;">
        ✨ Персональный отчет • ${formatDate(reportData.generated_at)} ✨
      </p>
    </div>
  </div>
</body>
</html>
  `.trim()
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

  try {
    const { methodName, methodId, resultData, birthDate, soulDetails, telegramUserId } = req.body

    if (!methodName || !methodId || !resultData || !birthDate) {
      return res.status(400).json({ error: 'Отсутствуют обязательные поля' })
    }

    // Генерируем HTML-контент
    const htmlContent = generatePDFHTML(methodName, methodId, resultData, birthDate, soulDetails)
    
    // Формируем имя файла
    const fileName = `${methodName.replace(/\s+/g, '_')}_${birthDate.replace(/\./g, '_')}.pdf`
    
    let pdfBuffer = null
    let base64Data = null
    let pdfBase64 = null
    
    // Генерируем PDF используя Puppeteer (рендеринг HTML в PDF - решает проблему с кириллицей)
    try {
      console.log('🚀 Запуск генерации PDF через Puppeteer (HTML -> PDF)...')
      
      // Проверяем, что HTML контент сгенерирован
      if (!htmlContent || htmlContent.length === 0) {
        throw new Error('HTML контент пустой или не сгенерирован')
      }
      
      console.log('📄 HTML контент подготовлен, длина:', htmlContent.length, 'символов')
      
      // Запускаем браузер с Chromium для Vercel
      const browser = await puppeteer.launch({
        args: [
          ...chromium.args,
          '--hide-scrollbars',
          '--disable-web-security',
        ],
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      })
      
      console.log('🌐 Браузер запущен успешно')
      
      try {
        // Создаем новую страницу
        const page = await browser.newPage()
        console.log('📄 Страница создана')
        
        // Устанавливаем таймаут для загрузки
        page.setDefaultNavigationTimeout(60000)
        
        // Устанавливаем контент HTML
        await page.setContent(htmlContent, {
          waitUntil: 'networkidle0',
          timeout: 60000
        })
        console.log('✅ HTML контент установлен на странице')
        
        // Ждем загрузки шрифтов Google Fonts
        await page.evaluateHandle(() => document.fonts.ready)
        console.log('✅ Шрифты загружены')
        
        // Дополнительная пауза для полной загрузки всех ресурсов
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Генерируем PDF напрямую из HTML (с обеими страницами через page-break)
        console.log('📄 Генерируем многостраничный PDF из HTML...')
        
        // Генерируем PDF с обеими страницами - Puppeteer автоматически разобьет на страницы по page-break
        pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
          preferCSSPageSize: false
        })
        
        if (!pdfBuffer || pdfBuffer.length === 0) {
          throw new Error('PDF buffer пустой после генерации')
        }
        
        console.log('✅ PDF с двумя страницами создан, размер:', pdfBuffer.length, 'bytes')
        
        // Конвертируем в base64 для клиента
        base64Data = pdfBuffer.toString('base64')
        pdfBase64 = `data:application/pdf;base64,${base64Data}`
        
        console.log('✅ PDF сгенерирован через Puppeteer, размер:', pdfBuffer.length, 'bytes')
        
      } catch (pageError) {
        console.error('❌ Ошибка при работе со страницей Puppeteer:', pageError)
        throw pageError
      } finally {
        // Закрываем браузер
        console.log('🔒 Закрываем браузер...')
        await browser.close()
        console.log('✅ Браузер закрыт')
      }
      
    } catch (pdfError) {
      console.error('❌ Ошибка генерации PDF через Puppeteer:', pdfError)
      console.error('Error name:', pdfError.name)
      console.error('Error message:', pdfError.message)
      console.error('Error stack:', pdfError.stack)
      throw new Error(`Ошибка генерации PDF: ${pdfError.message}`)
    }

    // Отправляем PDF в Telegram бот, если указан telegramUserId
    let telegramSent = false
    
    // ВАЖНО: Отправляем PDF в Telegram ТОЛЬКО если PDF успешно сгенерирован
    if (telegramUserId && process.env.TELEGRAM_BOT_TOKEN && pdfBuffer) {
      try {
        console.log('📤 Отправка PDF в Telegram для пользователя:', telegramUserId)
        
        // Создаем multipart/form-data вручную
        const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2, 15)
        const crlf = '\r\n'
        const parts = []
        
        // chat_id
        parts.push(Buffer.from(`--${boundary}${crlf}`, 'utf-8'))
        parts.push(Buffer.from(`Content-Disposition: form-data; name="chat_id"${crlf}${crlf}`, 'utf-8'))
        parts.push(Buffer.from(`${telegramUserId}${crlf}`, 'utf-8'))
        
        // caption
        const caption = `📄 ${methodName}\nДата рождения: ${birthDate}${resultData?.value ? `\nКлючевое значение: ${resultData.value}` : ''}`
        parts.push(Buffer.from(`--${boundary}${crlf}`, 'utf-8'))
        parts.push(Buffer.from(`Content-Disposition: form-data; name="caption"${crlf}${crlf}`, 'utf-8'))
        parts.push(Buffer.from(`${caption}${crlf}`, 'utf-8'))
        
        // document
        parts.push(Buffer.from(`--${boundary}${crlf}`, 'utf-8'))
        parts.push(Buffer.from(`Content-Disposition: form-data; name="document"; filename="${fileName}"${crlf}`, 'utf-8'))
        parts.push(Buffer.from(`Content-Type: application/pdf${crlf}${crlf}`, 'utf-8'))
        parts.push(pdfBuffer)
        parts.push(Buffer.from(`${crlf}--${boundary}--${crlf}`, 'utf-8'))
        
        // Объединяем все части
        const fullBody = Buffer.concat(parts)
        
        console.log('📤 Размер отправляемого файла:', fullBody.length, 'bytes')
        
        // Отправляем PDF в Telegram
        const botResponse = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendDocument`, {
          method: 'POST',
          headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': fullBody.length.toString()
          },
          body: fullBody
        })
        
        const responseText = await botResponse.text()
        console.log('📊 Telegram API Response Status:', botResponse.status)
        console.log('📊 Telegram API Response:', responseText.substring(0, 500))
        
        if (botResponse.ok) {
          telegramSent = true
          console.log('✅ PDF успешно отправлен в Telegram!')
          const responseData = JSON.parse(responseText)
          console.log('📄 Telegram response:', JSON.stringify(responseData, null, 2))
        } else {
          let errorMsg = 'Unknown error'
          try {
            const errorObj = JSON.parse(responseText)
            errorMsg = errorObj.description || responseText
            console.error('❌ Telegram API Error Details:', JSON.stringify(errorObj, null, 2))
          } catch {
            errorMsg = responseText
            console.error('❌ Telegram API Raw Error:', responseText)
          }
          
          console.error('❌ Ошибка отправки PDF в Telegram:', errorMsg)
          // НЕ выбрасываем ошибку - пусть PDF все равно возвращается клиенту
          // telegramSent останется false, но файл будет доступен для скачивания
        }
      } catch (error) {
        console.error('❌ Критическая ошибка отправки в Telegram бот:', error.message)
        console.error('Error stack:', error.stack)
        
        // Не отправляем fallback сообщение - пусть пользователь видит, что файл можно скачать в приложении
        // Ошибка уже логируется выше
      }
    } else if (telegramUserId && process.env.TELEGRAM_BOT_TOKEN && !pdfBuffer) {
      console.warn('⚠️ PDF не был сгенерирован, пропускаем отправку в Telegram')
    } else {
      console.log('ℹ️ Отправка в Telegram пропущена:', {
        hasUserId: !!telegramUserId,
        hasToken: !!process.env.TELEGRAM_BOT_TOKEN,
        hasPdfBuffer: !!pdfBuffer
      })
    }

    return res.status(200).json({
      success: true,
      pdfUrl: pdfBase64,
      fileName: fileName,
      telegramSent: telegramSent
    })

  } catch (error) {
    console.error('❌ Ошибка генерации PDF:', error)
    return res.status(500).json({ 
      error: 'Ошибка генерации PDF',
      message: error.message 
    })
  }
}
