from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

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

if __name__ == '__main__':
    app.run(debug=True, port=5000)



