// Vercel Serverless Function для генерации PDF на сервере
// Используем pdfmake для генерации PDF с поддержкой кириллицы

import PdfPrinter from 'pdfmake'
import { readFile } from 'fs/promises'
import { join } from 'path'

// Встроенные шрифты pdfmake для поддержки кириллицы
// Используем стандартные шрифты из pdfmake, которые поддерживают UTF-8
let pdfmakeFonts = null

async function loadPdfMakeFonts() {
  if (pdfmakeFonts) return pdfmakeFonts
  
  try {
    // Пытаемся загрузить шрифты Roboto из pdfmake/fonts/Roboto/
    const robotoPath = join(process.cwd(), 'node_modules', 'pdfmake', 'fonts', 'Roboto')
    
    console.log('🔍 Пытаемся загрузить шрифты из:', robotoPath)
    
    pdfmakeFonts = {
      Roboto: {
        normal: await readFile(join(robotoPath, 'Roboto-Regular.ttf')),
        bold: await readFile(join(robotoPath, 'Roboto-Medium.ttf')),
        italics: await readFile(join(robotoPath, 'Roboto-Italic.ttf')),
        bolditalics: await readFile(join(robotoPath, 'Roboto-MediumItalic.ttf'))
      }
    }
    
    console.log('✅ Шрифты Roboto загружены успешно')
    return pdfmakeFonts
  } catch (error) {
    console.error('❌ Ошибка загрузки шрифтов Roboto:', error.message)
    console.error('Error stack:', error.stack)
    // Используем пустой объект - pdfmake будет использовать стандартные шрифты
    // Стандартные шрифты не поддерживают кириллицу, но это позволит избежать ошибки
    pdfmakeFonts = {}
    return pdfmakeFonts
  }
}

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
    
    // Генерируем PDF используя pdfmake (с поддержкой кириллицы)
    try {
      console.log('🚀 Запуск генерации PDF через pdfmake...')
      
      const textContent = resultData?.result || 'Результат расчета недоступен'
      
      // Загружаем шрифты для pdfmake
      const fonts = await loadPdfMakeFonts()
      
      // Создаем принтер PDF
      const printer = new PdfPrinter(fonts)
      
      // Определяем документ PDF
      const docDefinition = {
        pageSize: 'A4',
        pageMargins: [20, 20, 20, 20],
        defaultStyle: {
          font: fonts.Roboto ? 'Roboto' : 'Helvetica',
          fontSize: 11,
          color: '#282828'
        },
        content: [
          // Золотая полоса сверху (симуляция через цветной блок)
          {
            canvas: [
              {
                type: 'rect',
                x: 0,
                y: 0,
                w: 595, // ширина A4 в точках
                h: 13.23, // ~45px в мм
                color: '#FFD700'
              }
            ],
            absolutePosition: { x: 0, y: 0 }
          },
          
          // Темный блок для заголовка
          {
            canvas: [
              {
                type: 'rect',
                x: 0,
                y: 13.23,
                w: 595,
                h: 50,
                color: '#191923'
              }
            ],
            absolutePosition: { x: 0, y: 13.23 }
          },
          
          // Заголовок
          {
            text: methodName,
            fontSize: 20,
            color: '#FFD700',
            bold: true,
            alignment: 'center',
            margin: [0, 70, 0, 20]
          },
          
          // Дата рождения
          {
            text: `📅 Дата рождения: ${birthDate}`,
            fontSize: 12,
            color: '#191923',
            alignment: 'center',
            margin: [0, 0, 0, 15],
            background: '#FFF9E6',
            fillColor: '#FFF9E6'
          },
          
          // Разделительная линия
          {
            canvas: [
              {
                type: 'line',
                x1: 85,
                x2: 510,
                y1: 0,
                y2: 0,
                lineWidth: 2,
                lineColor: '#FFD700'
              }
            ],
            margin: [0, 0, 0, 15]
          },
          
          // Основной текст результата
          {
            text: textContent,
            fontSize: 11,
            color: '#282828',
            alignment: 'justify',
            lineHeight: 1.8,
            margin: [0, 0, 0, 20]
          },
          
          // Ключевое значение, если есть
          ...(resultData?.value ? [{
            text: `✨ Ключевое значение: ${resultData.value}`,
            fontSize: 12,
            color: '#C89600',
            bold: true,
            margin: [0, 10, 0, 0],
            background: '#FFF6E6',
            fillColor: '#FFF6E6'
          }] : [])
        ],
        info: {
          title: methodName,
          author: 'SpaceGrow',
          subject: 'Результат расчета'
        }
      }

      // Генерируем PDF
      const pdfDoc = printer.createPdfKitDocument(docDefinition)
      
      // Конвертируем в Buffer
      const chunks = []
      pdfDoc.on('data', (chunk) => chunks.push(chunk))
      pdfDoc.on('end', () => {})
      
      pdfDoc.end()
      
      // Ждем завершения генерации
      await new Promise((resolve) => {
        pdfDoc.on('end', resolve)
      })
      
      pdfBuffer = Buffer.concat(chunks)
      
      // Конвертируем в base64 для клиента
      base64Data = pdfBuffer.toString('base64')
      pdfBase64 = `data:application/pdf;base64,${base64Data}`
      
      console.log('✅ PDF сгенерирован через pdfmake, размер:', pdfBuffer.length, 'bytes')
      
    } catch (pdfError) {
      console.error('❌ Ошибка генерации PDF через pdfmake:', pdfError)
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
