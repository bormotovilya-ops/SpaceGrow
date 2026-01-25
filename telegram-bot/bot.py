import os
import logging
from dotenv import load_dotenv
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
from db import Database
from notifications import NotificationService

# Загружаем переменные окружения
load_dotenv()

# Настройка логирования (вывод в консоль и файл)
log_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
logging.basicConfig(
    format=log_format,
    level=logging.INFO,
    handlers=[
        logging.FileHandler('bot.log', encoding='utf-8'),
        logging.StreamHandler()  # Также выводить в консоль
    ]
)
logger = logging.getLogger(__name__)
logger.info("Логирование настроено. Логи сохраняются в bot.log")

# URL вашего сайта (MiniApp)
MINIAPP_URL = os.getenv('MINIAPP_URL', 'https://spacegrow.vercel.app/')

# Инициализация БД и сервиса уведомлений
db = Database()
notification_service = None  # Инициализируется после создания бота

# Команда /start
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработчик команды /start"""
    user = update.effective_user
    
    # Создаем/обновляем пользователя в БД
    db.create_or_update_user(
        user_id=user.id,
        username=user.username,
        first_name=user.first_name,
        last_name=user.last_name
    )
    logger.info(f"Пользователь {user.id} запустил /start. Таймер напоминания установлен на 1 минуту")
    
    # Создаем кнопку с WebApp
    keyboard = [
        [InlineKeyboardButton(
            "🚀 Открыть SpaceGrowth",
            web_app=WebAppInfo(url=MINIAPP_URL)
        )]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    welcome_text = (
        f"Добро пожаловать в <b>SpaceGrowth</b>.\n\n"
        "Здесь смыслы обретают структуру, а онлайн-школы — новый финансовый двигатель. "
        "Я помогаю найти «протечки» в ваших процессах и внедряю <b>ИИ-архитектуру</b> для роста прибыли до <b>1-2 млн ₽</b> и выше.\n\n"
        "<b>Внутри приложения:</b>\n"
        "🔍 <b>Аудит:</b> найдем, где вы теряете деньги прямо сейчас.\n"
        "🛠 <b>Инструменты:</b> настроим автоматизацию нового поколения.\n"
        "📈 <b>Модель Success Fee:</b> я работаю на ваш результат.\n\n"
        "Нажмите кнопку ниже, чтобы войти в <b>Пространство:</b>"
    )
    
    await update.message.reply_text(
        welcome_text,
        reply_markup=reply_markup,
        parse_mode='HTML'
    )

# Обработка данных от MiniApp (web_app_data)
async def handle_web_app_data(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработчик данных от MiniApp - когда пользователь взаимодействует с приложением"""
    user = update.effective_user
    global notification_service

    # Получаем данные от MiniApp
    web_app_data = update.message.web_app_data

    if web_app_data:
        data = web_app_data.data
        logger.info(f"Получены данные от MiniApp пользователя {user.id}: {data}")

        # Если в данных есть информация о завершении диагностики
        if 'diagnostics' in data.lower() and ('completed' in data.lower() or 'finished' in data.lower() or 'завершена' in data.lower()):
            # Отмечаем завершение диагностики
            db.mark_diagnostics_completed(user.id)
            logger.info(f"Пользователь {user.id} завершил диагностику через MiniApp")

            # Отправляем уведомление с ссылкой на персональный отчет
            if notification_service:
                await notification_service.send_diagnostics_completion_notification(
                    user.id,
                    user.username,
                    user.first_name
                )
        # Если в данных есть информация о начале диагностики
        elif 'diagnostics' in data.lower() or 'started' in data.lower():
            db.mark_diagnostics_started(user.id)
            logger.info(f"Пользователь {user.id} начал диагностику через MiniApp")
        else:
            # Просто открытие MiniApp тоже считаем началом
            db.mark_diagnostics_started(user.id)
            logger.info(f"Пользователь {user.id} открыл MiniApp")

# Команда /diagnostics
async def diagnostics_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Открыть диагностику"""
    user = update.effective_user
    
    # Отмечаем, что пользователь начал диагностику
    db.mark_diagnostics_started(user.id)
    
    diagnostics_url = f"{MINIAPP_URL}#diagnostics"
    keyboard = [
        [InlineKeyboardButton(
            "📊 Пройти диагностику",
            web_app=WebAppInfo(url=diagnostics_url)
        )]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        "Пройди бесплатную диагностику воронки продаж (21 вопрос) и получи наглядную картину:\n"
        "• Где деньги теряются\n"
        "• Где система уже работает хорошо\n\n"
        "Нажми на кнопку, чтобы начать:",
        reply_markup=reply_markup
    )

# Команда /stats
async def stats_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Показать статистику из базы данных (только для владельца)"""
    user = update.effective_user
    
    # Проверяем, что команда доступна только для @ilyaborm
    if user.username != 'ilyaborm':
        await update.message.reply_text(
            "❌ Эта команда доступна только администратору."
        )
        logger.warning(f"Пользователь {user.id} (@{user.username}) попытался использовать /stats")
        return
    
    try:
        # Получаем статистику из БД
        conn = db.get_connection()
        cursor = conn.cursor()
        
        # Общая статистика
        cursor.execute('SELECT COUNT(*) as total FROM users')
        total = cursor.fetchone()['total']
        
        cursor.execute('SELECT COUNT(*) as started FROM users WHERE has_started_diagnostics = 1')
        started = cursor.fetchone()['started']
        
        cursor.execute('SELECT COUNT(*) as first_sent FROM users WHERE first_reminder_sent = 1')
        first_sent = cursor.fetchone()['first_sent']
        
        cursor.execute('SELECT COUNT(*) as second_sent FROM users WHERE second_reminder_sent = 1')
        second_sent = cursor.fetchone()['second_sent']
        
        # Пользователи ожидающие первого напоминания
        cursor.execute('''
            SELECT COUNT(*) as pending 
            FROM users 
            WHERE has_started_diagnostics = 0 
            AND first_reminder_sent = 0
            AND started_at IS NOT NULL
            AND datetime(started_at, '+10 minutes') <= datetime('now')
        ''')
        pending_first = cursor.fetchone()['pending']
        
        # Последние 5 пользователей
        cursor.execute('''
            SELECT user_id, first_name, username, has_started_diagnostics, 
                   first_reminder_sent, started_at
            FROM users
            ORDER BY created_at DESC
            LIMIT 5
        ''')
        recent_users = cursor.fetchall()
        
        conn.close()
        
        # Формируем сообщение
        stats_text = (
            f"📊 <b>Статистика бота</b>\n\n"
            f"👥 Всего пользователей: <b>{total}</b>\n"
            f"✅ Начали диагностику: <b>{started}</b>\n"
            f"📨 Первое напоминание отправлено: <b>{first_sent}</b>\n"
            f"📨 Второе напоминание отправлено: <b>{second_sent}</b>\n"
            f"⏰ Ожидают первого напоминания (прошла 10+ мин): <b>{pending_first}</b>\n\n"
        )
        
        if recent_users:
            stats_text += "<b>Последние пользователи:</b>\n"
            for idx, u in enumerate(recent_users, 1):
                name = u['first_name'] or u['username'] or f"ID:{u['user_id']}"
                status = "✅ Диагностика" if u['has_started_diagnostics'] else "⏳ Ожидает"
                reminder = "📨" if u['first_reminder_sent'] else ""
                stats_text += f"{idx}. {name} - {status} {reminder}\n"
        
        await update.message.reply_text(
            stats_text,
            parse_mode='HTML'
        )
        logger.info(f"Пользователь {user.id} запросил статистику")
        
    except Exception as e:
        logger.error(f"Ошибка при получении статистики: {e}")
        await update.message.reply_text(
            f"❌ Ошибка при получении статистики: {str(e)}"
        )

# Команда /help
async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработчик команды /help"""
    help_text = (
        "📋 Доступные команды:\n\n"
        "/start - Начать работу с ботом\n"
        "/help - Показать эту справку\n"
        "/site - Открыть сайт SpaceGrowth\n"
        "/diagnostics - Пройти диагностику воронки\n"
        "/stats - Показать статистику бота\n\n"
        "💬 Контакты:\n"
        "Telegram: @ilyaborm\n"
        "Канал: @SoulGuideIT\n"
        "Email: bormotovilya@gmail.com"
    )
    
    keyboard = [
        [InlineKeyboardButton(
            "🚀 Открыть SpaceGrowth",
            web_app=WebAppInfo(url=MINIAPP_URL)
        )]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        help_text,
        reply_markup=reply_markup
    )

# Команда /site
async def site_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Открыть сайт"""
    keyboard = [
        [InlineKeyboardButton(
            "🚀 Открыть SpaceGrowth",
            web_app=WebAppInfo(url=MINIAPP_URL)
        )]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        "Нажми на кнопку, чтобы открыть SpaceGrowth IT-Service:",
        reply_markup=reply_markup
    )

# Обработка текстовых сообщений
async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработчик текстовых сообщений"""
    text = update.message.text.lower()
    
    # Простые ответы на частые вопросы
    if any(word in text for word in ['привет', 'здравствуй', 'добрый день', 'добрый вечер']):
        keyboard = [
            [InlineKeyboardButton(
                "🚀 Открыть SpaceGrowth",
                web_app=WebAppInfo(url=MINIAPP_URL)
            )]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await update.message.reply_text(
            "Привет! 👋\n\n"
            "Используй команду /start, чтобы открыть мой сайт и узнать больше о моих услугах.",
            reply_markup=reply_markup
        )
    elif any(word in text for word in ['услуги', 'что делаешь', 'чем занимаешься']):
        keyboard = [
            [InlineKeyboardButton(
                "🚀 Открыть SpaceGrowth",
                web_app=WebAppInfo(url=MINIAPP_URL)
            )]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await update.message.reply_text(
            "Я создаю автоматизированные интеллектуальные цепочки продаж для онлайн-школ.\n\n"
            "Открой сайт, чтобы узнать подробнее:",
            reply_markup=reply_markup
        )
    elif any(word in text for word in ['контакт', 'связаться', 'написать']):
        await update.message.reply_text(
            "📞 Контакты:\n\n"
            "Telegram: @ilyaborm\n"
            "Канал: @SoulGuideIT\n"
            "Email: bormotovilya@gmail.com\n"
            "Телефон: +7 (999) 123-77-88"
        )
    else:
        keyboard = [
            [InlineKeyboardButton(
                "🚀 Открыть SpaceGrowth",
                web_app=WebAppInfo(url=MINIAPP_URL)
            )]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await update.message.reply_text(
            "Не совсем понял вопрос. Открой мой сайт, там есть вся информация и чат-бот, который ответит на вопросы!",
            reply_markup=reply_markup
        )

# Обработка ошибок
async def error_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработчик ошибок"""
    logger.error(f"Exception while handling an update: {context.error}")

def main() -> None:
    """Запуск бота"""
    global notification_service
    
    # Получаем токен из переменных окружения
    token = os.getenv('TELEGRAM_BOT_TOKEN')
    
    if not token:
        raise ValueError("TELEGRAM_BOT_TOKEN не найден в переменных окружения!")
    
    # Создаем приложение
    application = Application.builder().token(token).build()
    
    # Инициализируем сервис уведомлений
    notification_service = NotificationService(application.bot, db, MINIAPP_URL)
    
    # Настраиваем планировщик задач через JobQueue
    job_queue = application.job_queue
    
    # Проверяем напоминания каждую минуту
    if job_queue:
        job_queue.run_repeating(
            notification_service.check_and_send_reminders,
            interval=60,  # 60 секунд = 1 минута
            first=60,  # Первый запуск через 60 секунд
            name='check_reminders'
        )
        logger.info("Планировщик задач запущен. Проверка напоминаний каждую минуту")
    else:
        logger.error("JobQueue не доступен!")
    
    # Регистрируем обработчики
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("site", site_command))
    application.add_handler(CommandHandler("diagnostics", diagnostics_command))
    application.add_handler(CommandHandler("stats", stats_command))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    application.add_handler(MessageHandler(filters.StatusUpdate.WEB_APP_DATA, handle_web_app_data))
    
    # Обработчик ошибок
    application.add_error_handler(error_handler)
    
    # Запускаем бота
    logger.info("Бот запущен!")
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == '__main__':
    main()
