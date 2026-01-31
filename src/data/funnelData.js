/**
 * Данные блоков воронки для SalesFunnel и маршрута /block/:id
 */
export const funnelData = [
  { id: 'audience', name: 'Аудитория', image: '/images/1_трафик.png', color: '#4a90e2', description: 'Ваша целевая аудитория - люди, которые ищут решение своей проблемы', tech: [], width: 302 },
  { id: 'landing', name: 'Лендинг', image: '/images/2_лендинг.png', color: '#5cb85c', description: 'Сайт для привлечения трафика и первичного контакта с аудиторией', tech: ['Сайт'], width: 269 },
  { id: 'leadmagnet', name: 'Лидмагнит', image: '/images/3_Лидмагнит.png', color: '#f0ad4e', description: 'Бесплатное предложение для сбора контактов и начала взаимодействия', tech: ['PDF', 'MiniApp', 'Бот', 'Тест', 'Презентация'], width: 235 },
  { id: 'tripwire', name: 'Трипваер', image: '/images/3-5.png', color: '#ffd700', description: 'Первая денежная транзакция. Автоматизация импульсивных покупок', tech: ['Эквайринг', 'Фискализация', 'Webhooks'], width: 185 },
  { id: 'autofunnel', name: 'Автоворонки прогрева', image: '/images/4_Прогрев.png', color: '#d9534f', description: 'Автоматизированная система прогрева лидов перед продажей', tech: ['Бот', 'Канал'], width: 202 },
  { id: 'product', name: 'Продукт', image: '/images/5_Курс.png', color: '#5bc0de', description: 'Основной продукт - обучающий курс или услуга', tech: ['Бот', 'MiniApp', 'GetCourse'], width: 168 },
  { id: 'money', name: 'Деньги', image: '/images/6_оплата.png', color: '#9b59b6', description: 'Доход, который получает автор продукта', tech: [], width: 151 }
]

const idOrder = ['audience', 'landing', 'leadmagnet', 'tripwire', 'autofunnel', 'product', 'money']

export function getNextBlockId(currentId) {
  const idx = idOrder.indexOf(currentId)
  return idx >= 0 && idx < idOrder.length - 1 ? idOrder[idx + 1] : undefined
}

export function getBlockById(id) {
  return funnelData.find((b) => b.id === id) || null
}
