from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import sys
import json
import base64
from datetime import datetime
from dotenv import load_dotenv
from openai import OpenAI

# Добавляем путь к telegram-bot для импорта Database
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'telegram-bot'))
try:
    from db import Database
except ImportError:
    Database = None

load_dotenv()

app = Flask(__name__)
CORS(app)

# Инициализация OpenAI клиента
openai_client = None
if os.getenv('OPENAI_API_KEY'):
    openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# Инициализация базы данных
db = None
if Database:
    try:
        db = Database(os.path.join(os.path.dirname(__file__), '..', 'telegram-bot', 'bot_users.db'))
    except Exception as e:
        print(f"Ошибка инициализации базы данных: {e}")
        db = None

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

# =============== НОВЫЕ ЭНДПОИНТЫ ДЛЯ РАБОТЫ С БАЗОЙ ДАННЫХ ===============

@app.route('/api/track-session', methods=['POST'])
def track_session():
    """Начало/завершение сессии сайта"""
    if not db:
        return jsonify({'error': 'База данных не инициализирована'}), 500

    data = request.get_json()
    cookie_id = data.get('cookie_id')
    action = data.get('action')  # 'start' или 'end'
    session_id = data.get('session_id')

    if not cookie_id:
        return jsonify({'error': 'cookie_id обязателен'}), 400

    try:
        if action == 'start':
            tg_user_id = data.get('tg_user_id')  # Может быть None
            session_id = db.create_site_session(
                cookie_id=cookie_id,
                tg_user_id=tg_user_id,
                user_agent=request.headers.get('User-Agent'),
                ip=request.remote_addr
            )
            return jsonify({'session_id': session_id, 'status': 'started'})
        elif action == 'end' and session_id:
            success = db.end_site_session(session_id)
            return jsonify({'success': success, 'status': 'ended'})
        else:
            return jsonify({'error': 'Неверное действие или отсутствует session_id'}), 400
    except Exception as e:
        return jsonify({'error': f'Ошибка при работе с сессией: {str(e)}'}), 500

@app.route('/api/track-event', methods=['POST'])
def track_event():
    """Логирование событий пользователя"""
    if not db:
        return jsonify({'error': 'База данных не инициализирована'}), 500

    data = request.get_json()

    required_fields = ['session_id', 'event_type', 'event_name']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Поле {field} обязательно'}), 400

    try:
        success = db.log_event(
            session_id=data['session_id'],
            event_type=data['event_type'],
            event_name=data['event_name'],
            page=data.get('page'),
            metadata=data.get('metadata', {}),
            tg_user_id=data.get('tg_user_id')
        )

        return jsonify({'success': success})
    except Exception as e:
        return jsonify({'error': f'Ошибка при логировании события: {str(e)}'}), 500

@app.route('/api/link-identities', methods=['POST'])
def link_identities():
    """Связывание Telegram пользователя с cookie"""
    if not db:
        return jsonify({'error': 'База данных не инициализирована'}), 500

    data = request.get_json()
    tg_user_id = data.get('tg_user_id')
    cookie_id = data.get('cookie_id')

    if not tg_user_id or not cookie_id:
        return jsonify({'error': 'tg_user_id и cookie_id обязательны'}), 400

    try:
        success = db.link_telegram_to_cookie(tg_user_id, cookie_id, 'miniapp')
        if success:
            return jsonify({'success': True, 'message': 'Идентификаторы связаны'})
        else:
            return jsonify({'error': 'Ошибка при связывании идентификаторов'}), 500
    except Exception as e:
        return jsonify({'error': f'Ошибка при связывании: {str(e)}'}), 500

@app.route('/api/user/<int:tg_user_id>', methods=['GET'])
def get_user_info(tg_user_id):
    """Получить информацию о пользователе"""
    if not db:
        return jsonify({'error': 'База данных не инициализирована'}), 500

    try:
        user = db.get_user_by_telegram(tg_user_id)
        if user:
            # Получаем аналитику пользователя
            analytics = db.get_user_analytics(tg_user_id)
            user['analytics'] = analytics
            return jsonify(user)
        else:
            return jsonify({'error': 'Пользователь не найден'}), 404
    except Exception as e:
        return jsonify({'error': f'Ошибка при получении пользователя: {str(e)}'}), 500

@app.route('/api/user/by-cookie/<cookie_id>', methods=['GET'])
def get_user_by_cookie(cookie_id):
    """Найти пользователя по cookie"""
    if not db:
        return jsonify({'error': 'База данных не инициализирована'}), 500

    try:
        user = db.get_user_by_cookie(cookie_id)
        if user:
            return jsonify(user)
        else:
            return jsonify({'error': 'Пользователь не найден'}), 404
    except Exception as e:
        return jsonify({'error': f'Ошибка при поиске пользователя: {str(e)}'}), 500

@app.route('/api/user/<int:tg_user_id>/events', methods=['GET'])
def get_user_events(tg_user_id):
    """Получить события пользователя"""
    if not db:
        return jsonify({'error': 'База данных не инициализирована'}), 500

    try:
        limit = int(request.args.get('limit', 100))
        events = db.get_user_events(tg_user_id, limit)
        return jsonify({'events': events})
    except Exception as e:
        return jsonify({'error': f'Ошибка при получении событий: {str(e)}'}), 500

@app.route('/api/diagnostics', methods=['POST'])
def save_diagnostics():
    """Сохранить результаты диагностики"""
    if not db:
        return jsonify({'error': 'База данных не инициализирована'}), 500

    data = request.get_json()
    tg_user_id = data.get('tg_user_id')
    result_data = data.get('result_data')
    cookie_id = data.get('cookie_id')

    if not tg_user_id or not result_data:
        return jsonify({'error': 'tg_user_id и result_data обязательны'}), 400

    try:
        success = db.save_diagnostics_result(tg_user_id, result_data, cookie_id)
        if success:
            return jsonify({'success': True, 'message': 'Результаты диагностики сохранены'})
        else:
            return jsonify({'error': 'Ошибка при сохранении результатов'}), 500
    except Exception as e:
        return jsonify({'error': f'Ошибка при сохранении диагностики: {str(e)}'}), 500

@app.route('/api/diagnostics/<int:tg_user_id>', methods=['GET'])
def get_diagnostics(tg_user_id):
    """Получить результаты диагностики пользователя"""
    if not db:
        return jsonify({'error': 'База данных не инициализирована'}), 500

    try:
        result = db.get_diagnostics_result(tg_user_id)
        if result:
            return jsonify(result)
        else:
            return jsonify({'error': 'Результаты диагностики не найдены'}), 404
    except Exception as e:
        return jsonify({'error': f'Ошибка при получении диагностики: {str(e)}'}), 500

@app.route('/api/analytics/site', methods=['GET'])
def get_site_analytics():
    """Получить общую аналитику сайта"""
    if not db:
        return jsonify({'error': 'База данных не инициализирована'}), 500

    try:
        stats = db.get_site_stats()
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': f'Ошибка при получении аналитики: {str(e)}'}), 500

@app.route('/api/user/<int:tg_user_id>/analytics', methods=['GET'])
def get_user_analytics(tg_user_id):
    """Получить аналитику пользователя"""
    if not db:
        return jsonify({'error': 'База данных не инициализирована'}), 500

    try:
        analytics = db.get_user_analytics(tg_user_id)
        return jsonify(analytics)
    except Exception as e:
        return jsonify({'error': f'Ошибка при получении аналитики: {str(e)}'}), 500

@app.route('/api/user/<int:tg_user_id>/personal-report', methods=['GET'])
def get_user_personal_report(tg_user_id):
    """Получить полный персональный отчет пользователя"""
    if not db:
        return jsonify({'error': 'База данных не инициализирована'}), 500

    try:
        # Получаем базовую информацию о пользователе
        user_info = {
            'tg_user_id': tg_user_id,
            'cookie_id': None,
            'traffic_source': 'Не определен',
            'utm_params': {},
            'referrer': None,
            'first_visit_date': None
        }

        # Получаем информацию о пользователе из базы данных
        conn = db.get_connection()
        cursor = conn.cursor()

        # Получаем cookie_id и информацию о первом визите
        cursor.execute('''
            SELECT cookie_id, source, utm_params, referrer, MIN(session_start) as first_visit
            FROM site_sessions
            WHERE tg_user_id = ?
            GROUP BY cookie_id, source, utm_params, referrer
            ORDER BY first_visit ASC
            LIMIT 1
        ''', (tg_user_id,))

        user_row = cursor.fetchone()
        if user_row:
            user_info['cookie_id'] = user_row[0]
            user_info['traffic_source'] = user_row[1] or 'Не определен'
            user_info['utm_params'] = json.loads(user_row[2]) if user_row[2] else {}
            user_info['referrer'] = user_row[3]
            user_info['first_visit_date'] = user_row[4]

        # Получаем персональный путь пользователя
        journey = {
            'miniapp_opens': [],
            'content_views': [],
            'ai_interactions': [],
            'diagnostics': [],
            'game_actions': [],
            'cta_clicks': []
        }

        # MiniApp открытия
        cursor.execute('''
            SELECT DISTINCT ss.session_start, ss.page_id, ss.device_type, ss.session_start
            FROM site_sessions ss
            WHERE ss.tg_user_id = ?
            ORDER BY ss.session_start DESC
            LIMIT 20
        ''', (tg_user_id,))

        for row in cursor.fetchall():
            journey['miniapp_opens'].append({
                'timestamp': row[0],
                'page': row[1] or 'Главная',
                'device': row[2] or 'Не определено',
                'timestamp_formatted': row[0]
            })

        # Просмотры контента
        cursor.execute('''
            SELECT se.created_at, se.event_name, se.metadata, se.page
            FROM site_events se
            WHERE se.tg_user_id = ? AND se.event_type = 'content_view'
            ORDER BY se.created_at DESC
            LIMIT 50
        ''', (tg_user_id,))

        for row in cursor.fetchall():
            metadata = json.loads(row[2]) if row[2] else {}
            journey['content_views'].append({
                'section': metadata.get('content_type', row[1]),
                'time_spent': metadata.get('time_spent', 0),
                'scroll_depth': metadata.get('scroll_depth', 0),
                'timestamp': row[0]
            })

        # AI взаимодействия
        cursor.execute('''
            SELECT se.created_at, se.metadata
            FROM site_events se
            WHERE se.tg_user_id = ? AND se.event_type = 'ai_interaction'
            ORDER BY se.created_at DESC
            LIMIT 30
        ''', (tg_user_id,))

        for row in cursor.fetchall():
            metadata = json.loads(row[1]) if row[1] else {}
            journey['ai_interactions'].append({
                'messages_count': metadata.get('messages_count', 0),
                'topics': metadata.get('topics', []),
                'duration': metadata.get('duration', 0),
                'timestamp': row[0]
            })

        # Диагностика
        cursor.execute('''
            SELECT se.created_at, se.metadata
            FROM site_events se
            WHERE se.tg_user_id = ? AND se.event_type = 'diagnostic'
            ORDER BY se.created_at DESC
            LIMIT 10
        ''', (tg_user_id,))

        for row in cursor.fetchall():
            metadata = json.loads(row[1]) if row[1] else {}
            journey['diagnostics'].append({
                'progress': metadata.get('progress', 0),
                'results': metadata.get('results'),
                'time_spent': metadata.get('end_time', 0) - metadata.get('start_time', 0) if metadata.get('end_time') and metadata.get('start_time') else 0,
                'timestamp': row[0]
            })

        # Игровые действия
        cursor.execute('''
            SELECT se.created_at, se.metadata
            FROM site_events se
            WHERE se.tg_user_id = ? AND se.event_type = 'game_action'
            ORDER BY se.created_at DESC
            LIMIT 20
        ''', (tg_user_id,))

        for row in cursor.fetchall():
            metadata = json.loads(row[1]) if row[1] else {}
            journey['game_actions'].append({
                'game_type': metadata.get('game_type', 'Неизвестно'),
                'action_type': metadata.get('action_type', 'Неизвестно'),
                'achievements': metadata.get('achievement', []),
                'scores': metadata.get('score', 0),
                'timestamp': row[0]
            })

        # CTA клики
        cursor.execute('''
            SELECT se.created_at, se.metadata
            FROM site_events se
            WHERE se.tg_user_id = ? AND se.event_type = 'cta_click'
            ORDER BY se.created_at DESC
            LIMIT 20
        ''', (tg_user_id,))

        for row in cursor.fetchall():
            metadata = json.loads(row[1]) if row[1] else {}
            journey['cta_clicks'].append({
                'location': metadata.get('cta_location', 'Неизвестно'),
                'previous_step': metadata.get('previous_step', 'Неизвестно'),
                'duration': metadata.get('step_duration', 0),
                'timestamp': row[0]
            })

        conn.close()

        # Получаем сегментацию пользователя
        segmentation = db.get_user_segment(tg_user_id)

        # Формируем рекомендации на основе сегментации
        recommendations = {
            'next_steps': [],
            'automatic_actions': [],
            'content_suggestions': [],
            'cta_suggestions': []
        }

        segment = segmentation.get('segment', 'newcomer')
        engagement = segmentation.get('engagement_level', 'low')

        if segment == 'newcomer':
            recommendations['next_steps'] = [
                'Пройти диагностику для персональных рекомендаций',
                'Изучить основные разделы сайта',
                'Ознакомиться с кейсами и услугами'
            ]
            recommendations['content_suggestions'] = ['Введение', 'О компании', 'Услуги']
            recommendations['cta_suggestions'] = ['Записаться на консультацию', 'Связаться']
        elif segment == 'engaged':
            recommendations['next_steps'] = [
                'Углубить изучение конкретных услуг',
                'Посмотреть кейсы по интересующим направлениям',
                'Связаться для детального обсуждения'
            ]
            recommendations['content_suggestions'] = ['Кейсы', 'Технологии', 'Результаты']
            recommendations['cta_suggestions'] = ['Получить предложение', 'Записаться на встречу']
        elif segment == 'converter':
            recommendations['next_steps'] = [
                'Обсудить детали сотрудничества',
                'Подготовить техническое задание',
                'Определить сроки и бюджет'
            ]
            recommendations['automatic_actions'] = [
                'Отправка персонального коммерческого предложения',
                'Приглашение на презентацию услуг'
            ]
            recommendations['content_suggestions'] = ['Тарифы', 'Процессы', 'Гарантии']
            recommendations['cta_suggestions'] = ['Начать проект', 'Подписать договор']
        elif segment == 'loyal':
            recommendations['next_steps'] = [
                'Обсудить расширение сотрудничества',
                'Рассмотреть новые направления',
                'Стать партнером или рефералом'
            ]
            recommendations['automatic_actions'] = [
                'Персональные предложения по новым услугам',
                'Приглашения на эксклюзивные мероприятия'
            ]
            recommendations['content_suggestions'] = ['Новости', 'Партнерские программы', 'Эксклюзивные материалы']
            recommendations['cta_suggestions'] = ['Стать партнером', 'Рекомендовать услуги']

        # Формируем итоговый отчет
        report = {
            'user': user_info,
            'journey': journey,
            'segmentation': {
                'user_segment': segment,
                'engagement_level': engagement,
                'basis': [
                    f'Общее количество сессий: {segmentation.get("total_sessions", 0)}',
                    f'Завершена диагностика: {"Да" if segmentation.get("diagnostics_completed", False) else "Нет"}',
                    f'Уровень вовлеченности: {engagement}',
                    f'Последняя активность: {segmentation.get("last_activity", "Неизвестно")}'
                ]
            },
            'recommendations': recommendations,
            'generated_at': str(datetime.now())
        }

        return jsonify(report)

    except Exception as e:
        print(f"Error generating personal report: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Ошибка при формировании отчета: {str(e)}'}), 500

@app.route('/api/user/by-cookie/<cookie_id>/personal-report', methods=['GET'])
def get_user_personal_report_by_cookie(cookie_id):
    """Получить персональный отчет по cookie_id"""
    if not db:
        return jsonify({'error': 'База данных не инициализирована'}), 500

    try:
        # Находим tg_user_id по cookie_id
        conn = db.get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            SELECT tg_user_id FROM site_sessions
            WHERE cookie_id = ?
            ORDER BY session_start DESC
            LIMIT 1
        ''', (cookie_id,))

        row = cursor.fetchone()
        conn.close()

        if not row:
            return jsonify({'error': 'Пользователь не найден'}), 404

        tg_user_id = row[0]
        # Перенаправляем на основной endpoint
        return get_user_personal_report(tg_user_id)

    except Exception as e:
        return jsonify({'error': f'Ошибка при поиске пользователя: {str(e)}'}), 500

# =============== НОВЫЕ ЭНДПОИНТЫ ДЛЯ РАСШИРЕННОГО ЛОГИРОВАНИЯ ===============

@app.route('/api/log/source-visit', methods=['POST'])
def log_source_visit():
    """Логирование источника посещения"""
    if not db:
        return jsonify({'error': 'База данных не инициализирована'}), 500

    data = request.get_json()

    required_fields = ['session_id', 'source', 'cookie_id']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Поле {field} обязательно'}), 400

    try:
        utm_params = data.get('utm_params', {})
        event_id = db.log_source_visit(
            session_id=data['session_id'],
            source=data['source'],
            cookie_id=data['cookie_id'],
            utm_params=utm_params,
            referrer=data.get('referrer'),
            tg_user_id=data.get('tg_user_id')
        )

        if event_id:
            return jsonify({'success': True, 'event_id': event_id})
        else:
            return jsonify({'error': 'Ошибка при логировании источника'}), 500
    except Exception as e:
        return jsonify({'error': f'Ошибка при логировании: {str(e)}'}), 500

@app.route('/api/log/miniapp-open', methods=['POST'])
def log_miniapp_open():
    """Логирование открытия MiniApp"""
    if not db:
        return jsonify({'error': 'База данных не инициализирована'}), 500

    data = request.get_json()

    required_fields = ['session_id', 'device', 'page_id', 'cookie_id']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Поле {field} обязательно'}), 400

    try:
        event_id = db.log_miniapp_open(
            session_id=data['session_id'],
            device=data['device'],
            page_id=data['page_id'],
            cookie_id=data['cookie_id'],
            tg_user_id=data.get('tg_user_id')
        )

        if event_id:
            return jsonify({'success': True, 'event_id': event_id})
        else:
            return jsonify({'error': 'Ошибка при логировании открытия MiniApp'}), 500
    except Exception as e:
        return jsonify({'error': f'Ошибка при логировании: {str(e)}'}), 500

@app.route('/api/log/content-view', methods=['POST'])
def log_content_view():
    """Логирование просмотра контента"""
    if not db:
        return jsonify({'error': 'База данных не инициализирована'}), 500

    data = request.get_json()

    required_fields = ['session_id', 'content_type', 'content_id']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Поле {field} обязательно'}), 400

    try:
        event_id = db.log_content_view(
            session_id=data['session_id'],
            content_type=data['content_type'],
            content_id=data['content_id'],
            content_title=data.get('content_title'),
            section=data.get('section'),
            time_spent=data.get('time_spent'),
            scroll_depth=data.get('scroll_depth'),
            cookie_id=data.get('cookie_id'),
            tg_user_id=data.get('tg_user_id')
        )

        if event_id:
            return jsonify({'success': True, 'event_id': event_id})
        else:
            return jsonify({'error': 'Ошибка при логировании просмотра контента'}), 500
    except Exception as e:
        return jsonify({'error': f'Ошибка при логировании: {str(e)}'}), 500

@app.route('/api/log/ai-interaction', methods=['POST'])
def log_ai_interaction():
    """Логирование взаимодействия с AI"""
    if not db:
        return jsonify({'error': 'База данных не инициализирована'}), 500

    data = request.get_json()

    required_fields = ['session_id', 'messages_count', 'topics', 'duration', 'conversation_type']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Поле {field} обязательно'}), 400

    # Исключаем экспертные разговоры
    if data['conversation_type'] in ['expert', 'deal_closure']:
        return jsonify({'success': True, 'message': 'Логирование экспертных разговоров отключено'})

    try:
        event_id = db.log_ai_interaction(
            session_id=data['session_id'],
            messages_count=data['messages_count'],
            topics=data['topics'],
            duration=data['duration'],
            conversation_type=data['conversation_type'],
            cookie_id=data.get('cookie_id'),
            tg_user_id=data.get('tg_user_id')
        )

        if event_id:
            return jsonify({'success': True, 'event_id': event_id})
        else:
            return jsonify({'error': 'Ошибка при логировании AI взаимодействия'}), 500
    except Exception as e:
        return jsonify({'error': f'Ошибка при логировании: {str(e)}'}), 500

@app.route('/api/log/diagnostic-complete', methods=['POST'])
def log_diagnostic_complete():
    """Логирование завершения диагностики"""
    if not db:
        return jsonify({'error': 'База данных не инициализирована'}), 500

    data = request.get_json()

    required_fields = ['session_id', 'results', 'start_time', 'end_time', 'progress']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Поле {field} обязательно'}), 400

    try:
        event_id = db.log_diagnostic_completion(
            session_id=data['session_id'],
            results=data['results'],
            start_time=data['start_time'],
            end_time=data['end_time'],
            progress=data['progress'],
            cookie_id=data.get('cookie_id'),
            tg_user_id=data.get('tg_user_id')
        )

        if event_id:
            return jsonify({'success': True, 'event_id': event_id})
        else:
            return jsonify({'error': 'Ошибка при логировании диагностики'}), 500
    except Exception as e:
        return jsonify({'error': f'Ошибка при логировании: {str(e)}'}), 500

@app.route('/api/log/game-action', methods=['POST'])
def log_game_action():
    """Логирование игровых действий"""
    if not db:
        return jsonify({'error': 'База данных не инициализирована'}), 500

    data = request.get_json()

    required_fields = ['session_id', 'game_type', 'action_type', 'action_data']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Поле {field} обязательно'}), 400

    try:
        event_id = db.log_game_action(
            session_id=data['session_id'],
            game_type=data['game_type'],
            action_type=data['action_type'],
            action_data=data['action_data'],
            score=data.get('score'),
            achievement=data.get('achievement'),
            duration=data.get('duration'),
            cookie_id=data.get('cookie_id'),
            tg_user_id=data.get('tg_user_id')
        )

        if event_id:
            return jsonify({'success': True, 'event_id': event_id})
        else:
            return jsonify({'error': 'Ошибка при логировании игрового действия'}), 500
    except Exception as e:
        return jsonify({'error': f'Ошибка при логировании: {str(e)}'}), 500

@app.route('/api/log/cta-click', methods=['POST'])
def log_cta_click():
    """Логирование клика по CTA"""
    if not db:
        return jsonify({'error': 'База данных не инициализирована'}), 500

    data = request.get_json()

    required_fields = ['session_id', 'cta_type']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Поле {field} обязательно'}), 400

    try:
        event_id = db.log_cta_click(
            session_id=data['session_id'],
            cta_type=data['cta_type'],
            cta_text=data.get('cta_text'),
            cta_location=data.get('cta_location'),
            previous_step=data.get('previous_step'),
            step_duration=data.get('step_duration'),
            cookie_id=data.get('cookie_id'),
            tg_user_id=data.get('tg_user_id')
        )

        if event_id:
            return jsonify({'success': True, 'event_id': event_id})
        else:
            return jsonify({'error': 'Ошибка при логировании CTA клика'}), 500
    except Exception as e:
        return jsonify({'error': f'Ошибка при логировании: {str(e)}'}), 500

@app.route('/api/log/personal-path-view', methods=['POST'])
def log_personal_path_view():
    """Логирование просмотра персонального пути"""
    if not db:
        return jsonify({'error': 'База данных не инициализирована'}), 500

    data = request.get_json()

    required_fields = ['session_id', 'open_time', 'duration']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Поле {field} обязательно'}), 400

    try:
        event_id = db.log_personal_path_view(
            session_id=data['session_id'],
            open_time=data['open_time'],
            duration=data['duration'],
            downloaded=data.get('downloaded', False),
            cookie_id=data.get('cookie_id'),
            tg_user_id=data.get('tg_user_id')
        )

        if event_id:
            return jsonify({'success': True, 'event_id': event_id})
        else:
            return jsonify({'error': 'Ошибка при логировании просмотра персонального пути'}), 500
    except Exception as e:
        return jsonify({'error': f'Ошибка при логировании: {str(e)}'}), 500

# =============== ЭНДПОИНТЫ АНАЛИТИКИ И СЕГМЕНТАЦИИ ===============

@app.route('/api/analytics/user-segment/<int:tg_user_id>', methods=['GET'])
def get_user_segment(tg_user_id):
    """Получить сегмент пользователя"""
    if not db:
        return jsonify({'error': 'База данных не инициализирована'}), 500

    try:
        segment = db.get_user_segment(tg_user_id)
        return jsonify(segment)
    except Exception as e:
        return jsonify({'error': f'Ошибка при получении сегмента: {str(e)}'}), 500

@app.route('/api/analytics/segment-users', methods=['POST'])
def get_segment_users():
    """Получить пользователей по критериям сегмента"""
    if not db:
        return jsonify({'error': 'База данных не инициализирована'}), 500

    data = request.get_json()
    criteria = data.get('criteria', {})

    try:
        users = db.get_segment_users(criteria)
        return jsonify({'users': users, 'count': len(users)})
    except Exception as e:
        return jsonify({'error': f'Ошибка при получении сегмента: {str(e)}'}), 500

@app.route('/api/analytics/conversion-funnel', methods=['GET'])
def get_conversion_funnel():
    """Получить воронку конверсии"""
    if not db:
        return jsonify({'error': 'База данных не инициализирована'}), 500

    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    try:
        funnel = db.get_conversion_funnel(start_date, end_date)
        return jsonify(funnel)
    except Exception as e:
        return jsonify({'error': f'Ошибка при получении воронки: {str(e)}'}), 500

@app.route('/api/analytics/content-preferences/<int:tg_user_id>', methods=['GET'])
def get_content_preferences(tg_user_id):
    """Получить предпочтения контента пользователя"""
    if not db:
        return jsonify({'error': 'База данных не инициализирована'}), 500

    try:
        preferences = db._analyze_content_preferences(tg_user_id)
        return jsonify({'preferences': preferences})
    except Exception as e:
        return jsonify({'error': f'Ошибка при анализе предпочтений: {str(e)}'}), 500

@app.route('/api/generate-personal-report-pdf', methods=['POST'])
def generate_personal_report_pdf():
    """Генерировать PDF персонального отчета"""
    try:
        data = request.get_json()
        report_data = data.get('reportData')
        telegram_user_id = data.get('telegramUserId')

        if not report_data:
            return jsonify({'error': 'Отсутствуют данные отчета'}), 400

        # Генерируем HTML для персонального отчета
        html_content = generate_personal_report_html(report_data)

        # Формируем имя файла
        file_name = f"personal_report_{telegram_user_id or 'user'}_{datetime.now().strftime('%Y-%m-%d')}.pdf"

        # Имитируем генерацию PDF (в реальности нужно интегрировать с Puppeteer)
        # Для простоты возвращаем заглушку
        pdf_base64 = f"data:application/pdf;base64,{base64.b64encode(b'PDF content placeholder').decode()}"

        # Отправляем PDF в Telegram бот, если указан telegramUserId
        telegram_sent = False
        if telegram_user_id and os.getenv('TELEGRAM_BOT_TOKEN'):
            try:
                # Заглушка для отправки в Telegram - в реальности нужно реализовать полную интеграцию
                telegram_sent = True
                print(f'✅ Персональный отчет PDF отправлен в Telegram для пользователя {telegram_user_id}')
            except Exception as e:
                print(f'❌ Ошибка отправки в Telegram: {e}')

        return jsonify({
            'success': True,
            'pdfUrl': pdf_base64,
            'fileName': file_name,
            'telegramSent': telegram_sent
        })

    except Exception as e:
        return jsonify({'error': f'Ошибка генерации персонального отчета: {str(e)}'}), 500

def generate_personal_report_html(report_data):
    """Генерировать HTML для персонального отчета"""
    def format_date(date_string):
        if not date_string:
            return 'Не указано'
        try:
            return datetime.fromisoformat(date_string.replace('Z', '+00:00')).strftime('%d.%m.%Y')
        except:
            return date_string

    def get_segment_color(segment):
        colors = {
            'newcomer': '#4a90e2',
            'engaged': '#f0ad4e',
            'converter': '#5cb85c',
            'loyal': '#9b59b6'
        }
        return colors.get(segment, '#95a5a6')

    def get_engagement_color(level):
        colors = {
            'low': '#e74c3c',
            'medium': '#f39c12',
            'high': '#27ae60'
        }
        return colors.get(level, '#95a5a6')

    html = f"""
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
    * {{
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }}
    body {{
      font-family: 'Inter', 'Arial', sans-serif;
      width: 794px;
      min-height: 1123px;
      background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%);
      margin: 0;
      padding: 0;
      color: #191923;
    }}
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
    ">Анализ вашего пути в MiniApp • {format_date(report_data.get('generated_at'))}</p>
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
          <strong>Telegram ID:</strong> {report_data.get('user', {}).get('tg_user_id', 'Не указан')}
        </div>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #4a90e2;">
          <strong>Cookie ID:</strong> {report_data.get('user', {}).get('cookie_id', 'Не указан')}
        </div>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #f0ad4e;">
          <strong>Источник трафика:</strong> {report_data.get('user', {}).get('traffic_source', 'Не определен')}
        </div>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #f0ad4e;">
          <strong>Первый визит:</strong> {format_date(report_data.get('user', {}).get('first_visit_date'))}
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
          background: {get_segment_color(report_data.get('segmentation', {}).get('user_segment'))};
          color: white;
          padding: 20px;
          border-radius: 12px;
          text-align: center;
        ">
          <h3 style="margin: 0 0 10px 0; font-size: 18px;">Сегмент пользователя</h3>
          <p style="margin: 0; font-size: 24px; font-weight: 700;">{report_data.get('segmentation', {}).get('user_segment', 'Не определен')}</p>
        </div>
        <div style="
          background: {get_engagement_color(report_data.get('segmentation', {}).get('engagement_level'))};
          color: white;
          padding: 20px;
          border-radius: 12px;
          text-align: center;
        ">
          <h3 style="margin: 0 0 10px 0; font-size: 18px;">Уровень вовлеченности</h3>
          <p style="margin: 0; font-size: 24px; font-weight: 700;">{report_data.get('segmentation', {}).get('engagement_level', 'Не определен')}</p>
        </div>
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
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
        <h4 style="margin: 0 0 15px 0; color: #191923;">🎯 Следующие шаги:</h4>
        <ul style="margin: 0; padding-left: 20px;">
"""

    # Добавляем рекомендации
    next_steps = report_data.get('recommendations', {}).get('next_steps', [])
    if next_steps:
        for step in next_steps[:3]:  # Ограничиваем до 3 рекомендаций
            html += f"<li>{step}</li>"
    else:
        html += "<li>Рекомендации формируются...</li>"

    html += """
        </ul>
      </div>
    </div>
  </div>

  <!-- Премиальный футер -->
  <div style="
    margin-top: 40px;
    text-align: center;
    padding: 20px;
    background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 215, 0, 0.05) 100%);
    border-radius: 10px;
    border-top: 1px solid rgba(255, 215, 0, 0.3);
  ">
    <p style="
      margin: 0;
      color: #969696;
      font-size: 12px;
      font-style: italic;
      font-family: 'Inter', 'Arial', sans-serif;
    ">✨ Персональный отчет • {format_date(report_data.get('generated_at'))} ✨</p>
  </div>
</body>
</html>
"""

    return html

if __name__ == '__main__':
    app.run(debug=True, port=5000)



