import logging
from telegram import InlineKeyboardButton, InlineKeyboardMarkup
from db import Database

logger = logging.getLogger(__name__)

class NotificationService:
    def __init__(self, bot, db: Database, miniapp_url: str):
        self.bot = bot
        self.db = db
        self.miniapp_url = miniapp_url
    
    async def send_first_reminder(self, user_id: int, username: str = None, first_name: str = None):
        """Отправить первое напоминание через 10 минут"""
        try:
            # Проверяем, не начал ли пользователь диагностику
            user_status = self.db.get_user_status(user_id)
            if not user_status or user_status['has_started_diagnostics']:
                logger.info(f"Пользователь {user_id} уже начал диагностику, пропускаем напоминание")
                return
            
            # Проверяем, не было ли уже отправлено
            if user_status['first_reminder_sent']:
                logger.info(f"Первое напоминание пользователю {user_id} уже отправлено")
                return
            
            diagnostics_url = f"{self.miniapp_url}#diagnostics"
            
            keyboard = [
                [InlineKeyboardButton(
                    "🛠 Пройти бесплатную диагностику",
                    url=diagnostics_url
                )]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            message_text = (
                "Ваша система готова к анализу 🔍\n\n"
                "Напоминаю, что это бесплатный этап, который занимает всего 5 минут. "
                "За это время вы обнаружите «протечки» прибыли и поймете, как вырасти до 1-2 млн ₽.\n\n"
                "Начните сейчас!"
            )
            
            await self.bot.send_message(
                chat_id=user_id,
                text=message_text,
                reply_markup=reply_markup
            )
            
            # Отмечаем в БД
            self.db.mark_reminder_sent(user_id, "first")
            logger.info(f"Первое напоминание отправлено пользователю {user_id}")
            
        except Exception as e:
            logger.error(f"Ошибка при отправке первого напоминания пользователю {user_id}: {e}")
    
    async def send_second_reminder(self, user_id: int, username: str = None, first_name: str = None):
        """Отправить второе напоминание через 24 часа"""
        try:
            # Проверяем, не начал ли пользователь диагностику
            user_status = self.db.get_user_status(user_id)
            if not user_status or user_status['has_started_diagnostics']:
                logger.info(f"Пользователь {user_id} уже начал диагностику, пропускаем напоминание")
                return
            
            # Проверяем, не было ли уже отправлено
            if user_status['second_reminder_sent']:
                logger.info(f"Второе напоминание пользователю {user_id} уже отправлено")
                return
            
            diagnostics_url = f"{self.miniapp_url}#diagnostics"
            
            keyboard = [
                [InlineKeyboardButton(
                    "🚀 Запустить SpaceGrowth",
                    url=diagnostics_url
                )]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            message_text = (
                "Вопрос архитектуры ⚙️\n\n"
                "Оставить всё как есть — это тоже стратегия. Но если цель — масштаб, "
                "систему нужно пересобрать. Бесплатная диагностика еще доступна по ссылке:"
            )
            
            await self.bot.send_message(
                chat_id=user_id,
                text=message_text,
                reply_markup=reply_markup
            )

            # Отмечаем в БД
            self.db.mark_reminder_sent(user_id, "second")
            logger.info(f"Второе напоминание отправлено пользователю {user_id}")

        except Exception as e:
            logger.error(f"Ошибка при отправке второго напоминания пользователю {user_id}: {e}")

    async def send_diagnostics_completion_notification(self, user_id: int, username: str = None, first_name: str = None):
        """Отправить уведомление о завершении диагностики с ссылкой на персональный отчет"""
        try:
            person_report_url = f"{self.miniapp_url}#personreport"

            keyboard = [
                [InlineKeyboardButton(
                    "📊 Посмотреть мой персональный отчет",
                    url=person_report_url
                )]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)

            message_text = (
                "🎉 Поздравляем! Вы успешно прошли диагностику!\n\n"
                "Теперь у вас есть возможность посмотреть полный анализ вашего пути в MiniApp. "
                "Ваш персональный отчет покажет:\n\n"
                "• 📊 Вашу сегментацию и уровень вовлеченности\n"
                "• 🗺️ Полную историю взаимодействия с приложением\n"
                "• 💡 Персональные рекомендации по дальнейшим шагам\n"
                "• 📈 Визуализацию вашего прогресса\n\n"
                "Отчет можно скачать в PDF формате прямо в приложении!"
            )

            await self.bot.send_message(
                chat_id=user_id,
                text=message_text,
                reply_markup=reply_markup
            )

            logger.info(f"Уведомление о завершении диагностики отправлено пользователю {user_id}")

        except Exception as e:
            logger.error(f"Ошибка при отправке уведомления о завершении диагностики пользователю {user_id}: {e}")
    
    async def check_and_send_reminders(self):
        """Проверить и отправить напоминания (вызывается планировщиком)"""
        logger.info("Проверка напоминаний запущена")
        
        # Первое напоминание
        users_first = self.db.get_users_for_reminder("first")
        logger.info(f"Найдено пользователей для первого напоминания: {len(users_first)}")
        for user in users_first:
            logger.info(f"Отправка первого напоминания пользователю {user['user_id']}")
            await self.send_first_reminder(
                user['user_id'],
                user['username'],
                user['first_name']
            )
        
        # Второе напоминание
        users_second = self.db.get_users_for_reminder("second")
        logger.info(f"Найдено пользователей для второго напоминания: {len(users_second)}")
        for user in users_second:
            logger.info(f"Отправка второго напоминания пользователю {user['user_id']}")
            await self.send_second_reminder(
                user['user_id'],
                user['username'],
                user['first_name']
            )
