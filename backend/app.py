from flask import Flask, jsonify, request
from flask_cors import CORS
import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

app = Flask(__name__)
CORS(app)

# Инициализация OpenAI клиента
openai_client = None
if os.getenv('OPENAI_API_KEY'):
    openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

@app.route('/api/health', methods=['GET'])
def health():
    """Проверка работоспособности API"""
    return jsonify({'status': 'ok', 'message': 'Backend is running'})

@app.route('/api/menu', methods=['GET'])
def get_menu():
    """Получить данные меню"""
    menu_items = [
        {
            'id': 1,
            'image': '/images/item1.jpg',
            'title': '',
            'sidebarTitle': 'Что я делаю',
            'sidebarItems': [
                'Автоматизированные цепочки продаж',
                'Сайты и лендинги',
                'Воронки продаж',
                'Обучающие курсы (боты/GetCourse)',
                'Интеграция всех элементов'
            ]
        },
        {
            'id': 2,
            'image': '/images/item2.jpg',
            'title': '',
            'sidebarTitle': 'Портфолио',
            'sidebarItems': [
                'Реализованные цепочки продаж',
                'Кейсы онлайн-обучения',
                'Воронки с результатами',
                'Интегрированные системы'
            ]
        },
        {
            'id': 3,
            'image': '/images/item3.jpg',
            'title': 'Обо мне',
            'sidebarTitle': 'Отзывы',
            'sidebarItems': [
                'Клиенты о работе',
                'Видео-отзывы',
                'Кейсы до/после',
                'Результаты проектов'
            ]
        },
        {
            'id': 4,
            'image': '/images/item4.jpg',
            'title': '',
            'sidebarTitle': 'Контакты',
            'sidebarItems': [
                'Telegram: @ilyaborm',
                'Канал',
                'Мой сайт',
                'VK'
            ]
        },
        {
            'id': 5,
            'image': '/images/item5.jpg',
            'title': 'Бонус',
            'sidebarTitle': 'Обо мне',
            'sidebarItems': [
                'Архитектор цепочек продаж',
                'Мой подход',
                'Философия работы',
                'Почему это работает'
            ]
        },
        {
            'id': 6,
            'image': '/images/item6.jpg',
            'title': 'Как это работает',
            'sidebarTitle': 'Технологии',
            'sidebarItems': [
                'Автоматизация процессов',
                'AI-интеграции',
                'Telegram-боты',
                'Платформы обучения',
                'Аналитика и оптимизация'
            ]
        }
    ]
    return jsonify(menu_items)

# Контекст для нейросети - информация о бизнесе
SITE_CONTEXT = """
Ты - Илья Бормотов, IT-интегратор и архитектор автоматизированных интеллектуальных цепочек продаж (АИЦП).

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

Ключевые цифры:
- 19+ лет в IT
- 1 млрд. ₽+ суммарный бюджет систем, разработанных под управлением
- 30+ внедренных экосистем
- 500к ₽ максимальный чек за одного бота
- 100% проектов сданы в срок

Технологический стек:
- Web-разработка: Tilda, Wordpress, Taplink, GetCourse, React/Vercel, C#, MS Visual Studio
- Чат-боты и Mini Apps: Python, LeadTeh, BotHelp, SaleBot
- Автоматизация EdTech: GetCourse, автоворонки, викторины
- Системная интеграция: MS SQL, Oracle, PostgreSQL, 1С, интеграция ботов с системами 1С

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

Важно: Отвечай от первого лица, как будто ты сам Илья. Будь конкретным, используй факты из контекста. Если вопрос не относится к твоей деятельности, вежливо перенаправь на контакты.
"""

@app.route('/api/chat', methods=['POST'])
def chat():
    """Обработка вопросов через нейросеть"""
    if not openai_client:
        return jsonify({
            'error': 'OpenAI API не настроен. Добавьте OPENAI_API_KEY в .env файл'
        }), 500
    
    try:
        data = request.get_json()
        user_message = data.get('message', '').strip()
        
        if not user_message:
            return jsonify({'error': 'Сообщение не может быть пустым'}), 400
        
        # Формируем промпт для нейросети
        messages = [
            {
                "role": "system",
                "content": SITE_CONTEXT
            },
            {
                "role": "user",
                "content": user_message
            }
        ]
        
        # Вызов OpenAI API
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",  # Используем более дешевую модель
            messages=messages,
            temperature=0.7,
            max_tokens=500
        )
        
        assistant_message = response.choices[0].message.content
        
        return jsonify({
            'response': assistant_message
        })
        
    except Exception as e:
        return jsonify({
            'error': f'Ошибка при обработке запроса: {str(e)}'
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)



