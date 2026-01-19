// Vercel Serverless Function для генерации PDF на сервере
import { jsPDF } from 'jspdf'

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

    // Генерируем PDF используя jsPDF
    const pdf = new jsPDF({
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait'
    })

    // Заголовок
    pdf.setFontSize(20)
    pdf.setTextColor(255, 215, 0) // Золотой цвет
    pdf.text(methodName, 105, 30, { align: 'center' })
    
    // Дата рождения
    pdf.setFontSize(12)
    pdf.setTextColor(0, 0, 0)
    pdf.text(`Дата рождения: ${birthDate}`, 20, 50)
    
    // Разделительная линия
    pdf.setDrawColor(255, 215, 0)
    pdf.setLineWidth(0.5)
    pdf.line(20, 55, 190, 55)
    
    // Основной текст результата
    pdf.setFontSize(11)
    const textContent = resultData?.result || 'Результат расчета недоступен'
    const lines = pdf.splitTextToSize(textContent, 170)
    pdf.text(lines, 20, 65)
    
    // Ключевое значение, если есть
    if (resultData?.value) {
      const yPos = pdf.internal.pageSize.getHeight() - 40
      pdf.setFontSize(12)
      pdf.setTextColor(200, 150, 0)
      pdf.text(`Ключевое значение: ${resultData.value}`, 20, yPos)
    }

    // Генерируем base64
    const pdfBase64 = pdf.output('datauristring')
    
    // Получаем только base64 данные (без префикса data:...)
    const base64Data = pdfBase64.includes(',') ? pdfBase64.split(',')[1] : pdfBase64
    
    // Формируем имя файла
    const fileName = `${methodName.replace(/\s+/g, '_')}_${birthDate.replace(/\./g, '_')}.pdf`

    // Отправляем PDF в Telegram бот, если указан telegramUserId
    let telegramSent = false
    
    if (telegramUserId && process.env.TELEGRAM_BOT_TOKEN) {
      try {
        // Конвертируем base64 в Buffer
        const pdfBuffer = Buffer.from(base64Data, 'base64')
        
        // Создаем multipart/form-data вручную (более надежно для Vercel)
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
        console.log('Telegram API Response Status:', botResponse.status)
        console.log('Telegram API Response:', responseText.substring(0, 500))
        
        if (botResponse.ok) {
          telegramSent = true
          console.log('✅ PDF успешно отправлен в Telegram')
        } else {
          // Если ошибка - пытаемся разобрать JSON ошибки
          let errorMsg = 'Unknown error'
          try {
            const errorObj = JSON.parse(responseText)
            errorMsg = errorObj.description || responseText
          } catch {
            errorMsg = responseText
          }
          
          console.error('❌ Ошибка отправки PDF в Telegram:', errorMsg)
          
          // Отправляем сообщение с уведомлением и инструкцией
          try {
            const message = `📄 Ваш PDF "${methodName}" готов!\n\n` +
              `Дата рождения: ${birthDate}\n` +
              `Ключевое значение: ${resultData?.value || 'Н/Д'}\n\n` +
              `Файл доступен для скачивания в приложении.`
            
            await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                chat_id: telegramUserId,
                text: message
              })
            })
          } catch (msgError) {
            console.error('Ошибка отправки сообщения:', msgError)
          }
          
          throw new Error(`Telegram API error: ${errorMsg}`)
        }
      } catch (error) {
        console.error('❌ Ошибка отправки в Telegram бот:', error.message)
        console.error('Error stack:', error.stack)
        
        // Отправляем сообщение с информацией
        try {
          const message = `📄 Ваш PDF "${methodName}" готов!\n\n` +
            `Дата рождения: ${birthDate}\n` +
            `Ключевое значение: ${resultData?.value || 'Н/Д'}\n\n` +
            `Файл доступен для скачивания в приложении.`
          
          await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chat_id: telegramUserId,
              text: message
            })
          })
        } catch (msgError) {
          console.error('Ошибка отправки сообщения:', msgError)
        }
      }
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
