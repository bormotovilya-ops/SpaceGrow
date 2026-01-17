import os
import logging
from dotenv import load_dotenv
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

# Загружаем переменные окружения
load_dotenv()

# Настройка логирования
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# URL вашего сайта (MiniApp)
MINIAPP_URL = os.getenv('MINIAPP_URL', 'https://spacegrow.vercel.app/')

# Команда /start
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработчик команды /start"""
    user = update.effective_user
    
    # Создаем кнопку с WebApp
    keyboard = [
        [InlineKeyboardButton(
            "🚀 Открыть SpaceGrow",
            web_app=WebAppInfo(url=MINIAPP_URL)
        )]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    welcome_text = (
        f"Привет, {user.first_name}! 👋\n\n"
        "Я — Илья Бормотов, IT-интегратор и архитектор автоматизированных интеллектуальных цепочек продаж.\n\n"
        "Нажми на кнопку ниже, чтобы открыть мой сайт и узнать больше о моих услугах:\n"
        "• Диагностика воронки продаж\n"
        "• Создание автоматизированных систем\n"
        "• Интеграция всех элементов в единую экосистему\n\n"
        "Или напиши мне в личку: @ilyaborm"
    )
    
    await update.message.reply_text(
        welcome_text,
        reply_markup=reply_markup
    )

# Команда /help
async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработчик команды /help"""
    help_text = (
        "📋 Доступные команды:\n\n"
        "/start - Начать работу с ботом\n"
        "/help - Показать эту справку\n"
        "/site - Открыть сайт SpaceGrow\n"
        "/diagnostics - Пройти диагностику воронки\n\n"
        "💬 Контакты:\n"
        "Telegram: @ilyaborm\n"
        "Канал: @SoulGuideIT\n"
        "Email: bormotovilya@gmail.com"
    )
    
    keyboard = [
        [InlineKeyboardButton(
            "🚀 Открыть SpaceGrow",
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
            "🚀 Открыть SpaceGrow",
            web_app=WebAppInfo(url=MINIAPP_URL)
        )]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        "Нажми на кнопку, чтобы открыть SpaceGrow IT-Service:",
        reply_markup=reply_markup
    )

# Команда /diagnostics
async def diagnostics_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Открыть диагностику"""
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

# Обработка текстовых сообщений
async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработчик текстовых сообщений"""
    text = update.message.text.lower()
    
    # Простые ответы на частые вопросы
    if any(word in text for word in ['привет', 'здравствуй', 'добрый день', 'добрый вечер']):
        keyboard = [
            [InlineKeyboardButton(
                "🚀 Открыть SpaceGrow",
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
                "🚀 Открыть SpaceGrow",
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
                "🚀 Открыть SpaceGrow",
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
    # Получаем токен из переменных окружения
    token = os.getenv('TELEGRAM_BOT_TOKEN')
    
    if not token:
        raise ValueError("TELEGRAM_BOT_TOKEN не найден в переменных окружения!")
    
    # Создаем приложение
    application = Application.builder().token(token).build()
    
    # Регистрируем обработчики
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("site", site_command))
    application.add_handler(CommandHandler("diagnostics", diagnostics_command))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    
    # Обработчик ошибок
    application.add_error_handler(error_handler)
    
    # Запускаем бота
    logger.info("Бот запущен!")
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == '__main__':
    main()
