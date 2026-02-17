import os
import logging
import asyncio
from dotenv import load_dotenv
from aiohttp import web
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes, ApplicationHandlerStop
from db import Database
from notifications import NotificationService
from settings_manager import SettingsManager, BotSettingKeys

# Загружаем переменные окружения
load_dotenv()

# Админ для обхода режима техработ
ADMIN_USERNAME = "ilyaborm"

# Контакт поддержки по умолчанию (если в БД пусто)
DEFAULT_SUPPORT_CONTACT = (
    "Telegram: @ilyaborm\n"
    "Канал: @SoulGuideIT\n"
    "Email: bormotovilya@gmail.com"
)
DEFAULT_SUPPORT_CONTACT_WITH_PHONE = DEFAULT_SUPPORT_CONTACT + "\nТелефон: +7 (999) 123-77-88"

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


async def _cron_marketing_handler(request: web.Request) -> web.Response:
    """Эндпоинт для внешнего cron: проверка токена и запуск маркетинга + дожимов."""
    token = request.headers.get("Authorization") or request.query.get("token") or ""
    if token.startswith("Bearer "):
        token = token[7:].strip()
    secret = os.getenv("CRON_SECRET")
    if not secret or token != secret:
        return web.Response(status=403, text="Forbidden")
    global notification_service
    if notification_service is None:
        return web.Response(status=503, text="Service not ready")
    try:
        await notification_service.check_and_send_marketing(None)
        await notification_service.check_and_send_marketing_nudges(None)
        return web.Response(text="OK")
    except Exception as e:
        logger.exception("Cron marketing error: %s", e)
        return web.Response(status=500, text=str(e))


async def _run_cron_server() -> None:
    """Запуск HTTP-сервера для вызова маркетинга по cron (порт из PORT для Railway)."""
    if not os.getenv("CRON_SECRET"):
        logger.info("CRON_SECRET не задан — HTTP cron-сервер не запускается")
        return
    port = int(os.getenv("PORT", "8080"))
    app = web.Application()
    app.router.add_get("/internal/run-marketing", _cron_marketing_handler)
    app.router.add_post("/internal/run-marketing", _cron_marketing_handler)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", port)
    await site.start()
    logger.info("Cron HTTP-сервер слушает порт %s, путь /internal/run-marketing", port)


# URL вашего сайта (MiniApp)
MINIAPP_URL = os.getenv('MINIAPP_URL', 'https://spacegrow.vercel.app/')

# Инициализация БД и сервиса уведомлений
db = Database()
notification_service = None  # Инициализируется после создания бота
settings_manager = None  # Инициализируется в main() после создания приложения

async def maintenance_check_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Обработчик группы -1: проверка режима техработ до любых других команд.
    Если APP_MAINTENANCE включён и пользователь не админ — отправляет сообщение
    и останавливает цепочку обработчиков (ApplicationHandlerStop).
    """
    user = update.effective_user
    name = (user.first_name or user.username or user.id) if user else "неизвестный"
    logger.info("Проверяю техработы для юзера: %s", name)

    sm = context.application.bot_data.get("settings_manager") if context and context.application else None
    if not sm:
        return
    raw = await sm.get_setting(BotSettingKeys.APP_MAINTENANCE)
    logger.info("Статус техработ в базе сейчас: %s", raw)

    is_on = raw in (True, "true", "1", "yes", "on") or (isinstance(raw, str) and raw.strip().lower() in ("true", "1", "yes", "on"))
    if not is_on:
        return
    if user and getattr(user, "username", None) == ADMIN_USERNAME:
        return
    msg = update.effective_message
    if msg:
        await msg.reply_text("🛠 Ведутся технические работы. Бот временно недоступен.")
    raise ApplicationHandlerStop

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

    # Проверяем, что команда доступна только для админа
    if user.username != ADMIN_USERNAME:
        await update.message.reply_text(
            "❌ Эта команда доступна только администратору."
        )
        logger.warning(f"Пользователь {user.id} (@{user.username}) попытался использовать /stats")
        return
    
    try:
        stats = db.get_bot_stats()
        if not stats:
            raise ValueError("Не удалось получить статистику из Supabase")
        total = stats['total']
        started = stats['started']
        first_sent = stats['first_sent']
        second_sent = stats['second_sent']
        pending_first = stats['pending_first']
        recent_users = stats['recent_users']

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
    sm = context.application.bot_data.get("settings_manager")
    support = (await sm.get_setting(BotSettingKeys.SUPPORT_CONTACT)) if sm else None
    support_contact = (support.strip() if support else None) or DEFAULT_SUPPORT_CONTACT
    help_text = (
        "📋 Доступные команды:\n\n"
        "/start - Начать работу с ботом\n"
        "/help - Показать эту справку\n"
        "/site - Открыть сайт SpaceGrowth\n"
        "/diagnostics - Пройти диагностику воронки\n"
        "/stats - Показать статистику бота\n\n"
        "💬 Контакты:\n"
        f"{support_contact}"
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

# Обработка текстовых сообщений (каждое входящее сохраняем в БД)
async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработчик текстовых сообщений — сохраняет переписку в user_chat_messages."""
    user = update.effective_user
    text = (update.message.text or "").strip()
    try:
        db.save_incoming_message(user_id=user.id, text=text)
    except Exception as e:
        logger.exception("Не удалось сохранить входящее сообщение в user_chat_messages: %s", e)
    text_lower = text.lower()

    sm = context.application.bot_data.get("settings_manager")
    support_contact = (await sm.get_setting(BotSettingKeys.SUPPORT_CONTACT)) if sm else None
    support_contact = (support_contact.strip() if support_contact else None) or DEFAULT_SUPPORT_CONTACT_WITH_PHONE

    # Простые ответы на частые вопросы
    if any(word in text_lower for word in ['привет', 'здравствуй', 'добрый день', 'добрый вечер']):
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
    elif any(word in text_lower for word in ['услуги', 'что делаешь', 'чем занимаешься']):
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
    elif any(word in text_lower for word in ['контакт', 'связаться', 'написать']):
        await update.message.reply_text(f"📞 Контакты:\n\n{support_contact}")
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

    # Менеджер настроек из bot_settings (RPC get_bot_setting), кэш 5 мин
    settings_manager = SettingsManager(db)
    application.bot_data["settings_manager"] = settings_manager

    # Инициализируем сервис уведомлений (с доступом к настройкам для MARKETING_ACTIVE)
    notification_service = NotificationService(application.bot, db, MINIAPP_URL, settings_manager)
    
    # Настраиваем планировщик задач через JobQueue
    job_queue = application.job_queue
    
    # Периодическая проверка маркетинга: запуск каждые 5 мин; интервал рассылки по пользователю — из БД (marketing_interval_minutes)
    if job_queue:
        job_queue.run_repeating(
            notification_service.check_and_send_marketing,
            interval=300,  # 5 минут — как часто проверять очередь
            first=300,
            name="check_marketing",
        )
        logger.info("Планировщик: проверка маркетинговых сообщений каждые 5 мин (интервал рассылки из bot_settings)")
    else:
        logger.error("JobQueue не доступен!")

    async def _post_init(app: Application) -> None:
        asyncio.create_task(_run_cron_server())

    application.post_init = _post_init

    # Регистрируем обработчики: сначала проверка техработ (group=-1), затем остальные (group=0)
    application.add_handler(
        MessageHandler(filters.ALL, maintenance_check_handler),
        group=-1,
    )
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
