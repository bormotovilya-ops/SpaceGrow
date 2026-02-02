import json
import logging
from datetime import datetime
from telegram import InlineKeyboardButton, InlineKeyboardMarkup
from telegram.error import Forbidden, BadRequest
from db import Database
from settings_manager import BotSettingKeys

logger = logging.getLogger(__name__)


def _build_keyboard_from_buttons_path(buttons_data):
    """Строит клавиатуру из JSON-массива с полями text и path (path используется как url)."""
    if not buttons_data:
        return []
    if isinstance(buttons_data, str):
        buttons_data = json.loads(buttons_data)
    keyboard = []
    for btn in buttons_data:
        text = btn.get("text") or "Кнопка"
        path = btn.get("path")
        if path:
            keyboard.append([InlineKeyboardButton(text, url=path)])
    return keyboard


def _build_keyboard_from_buttons(buttons_data):
    """Строит список рядов InlineKeyboardButton из JSON-массива buttons (поля text, url, callback_data)."""
    if not buttons_data:
        return []
    if isinstance(buttons_data, str):
        buttons_data = json.loads(buttons_data)
    keyboard = []
    for btn in buttons_data:
        text = btn.get("text") or "Кнопка"
        url = btn.get("url")
        callback_data = btn.get("callback_data")
        if url:
            keyboard.append([InlineKeyboardButton(text, url=url)])
        elif callback_data:
            keyboard.append([InlineKeyboardButton(text, callback_data=callback_data)])
    return keyboard


def _get_content_and_send(bot, db, user_id):
    """
    Вызывает get_user_marketing_content(p_user_id). Если контент есть — возвращает (message_text, keyboard).
    Если база ничего не вернула — логирует предупреждение и возвращает (None, None).
    """
    content = db.rpc("get_user_marketing_content", {"p_user_id": user_id})
    if not content or not content.get("message_text"):
        logger.warning("Пользователь %s не сегментирован или контент пуст, сообщение не отправляется", user_id)
        return None, None
    message_text = content.get("message_text", "")
    buttons_data = content.get("buttons", [])
    keyboard = _build_keyboard_from_buttons(buttons_data)
    return message_text, keyboard


class NotificationService:
    def __init__(self, bot, db: Database, miniapp_url: str, settings_manager=None):
        self.bot = bot
        self.db = db
        self.miniapp_url = miniapp_url
        self.settings_manager = settings_manager

    async def send_diagnostics_completion_notification(self, user_id: int, username: str = None, first_name: str = None):
        """Отправить уведомление о завершении диагностики (контент из get_user_marketing_content)."""
        try:
            message_text, keyboard = _get_content_and_send(self.bot, self.db, user_id)
            if message_text is None:
                return
            reply_markup = InlineKeyboardMarkup(keyboard) if keyboard else None
            await self.bot.send_message(
                chat_id=user_id,
                text=message_text,
                reply_markup=reply_markup,
                parse_mode="HTML",
            )
            logger.info("Уведомление о завершении диагностики отправлено пользователю %s", user_id)
        except Exception as e:
            logger.error(
                "Ошибка при отправке уведомления о завершении диагностики пользователю %s: %s", user_id, e
            )

    async def check_and_send_marketing(self, context=None):
        """
        Единственная периодическая задача рассылки: список всех tg_user_id из user_segments,
        для каждого вызов get_user_marketing_content(p_user_id). База сама решает по таблице
        истории, кому и когда пора слать сообщение; при наличии данных — отправка message_text
        и кнопок (path как url). Лог отправки ведёт БД.
        """
        if self.settings_manager:
            if not await self.settings_manager.get_setting_bool_async(BotSettingKeys.MARKETING_ACTIVE):
                logger.info("Маркетинговая рассылка отключена через БД")
                return
        db = self.db
        try:
            users = db.get_active_marketing_users()
            logger.info("Маркетинг: проверка для %s пользователей", len(users))
            sent = 0
            for user_row in users:
                tg_user_id = user_row.get("tg_user_id")
                if tg_user_id is None:
                    continue
                raw = db.rpc("get_user_marketing_content", {"p_user_id": tg_user_id})
                # RPC может вернуть одну строку как список из одного элемента или как объект
                content = None
                if isinstance(raw, list) and len(raw) > 0:
                    content = raw[0]
                elif isinstance(raw, dict) and raw.get("message_text"):
                    content = raw
                if not content or not content.get("message_text"):
                    continue
                message_text = content.get("message_text", "")
                buttons_data = content.get("buttons", [])
                keyboard = _build_keyboard_from_buttons_path(buttons_data)
                reply_markup = InlineKeyboardMarkup(keyboard) if keyboard else None
                try:
                    await self.bot.send_message(
                        chat_id=tg_user_id,
                        text=message_text,
                        reply_markup=reply_markup,
                        parse_mode="HTML",
                    )
                    sent += 1
                    logger.info("Маркетинг: отправлено пользователю %s", tg_user_id)
                except Forbidden as e:
                    logger.warning("Маркетинг: пользователь %s заблокировал бота или чат: %s", tg_user_id, e)
                except BadRequest as e:
                    logger.warning("Маркетинг: ошибка запроса к пользователю %s: %s", tg_user_id, e)
            if sent:
                logger.info("Маркетинг: доставлено %s сообщений", sent)
        except Exception as e:
            logger.error("Маркетинг: ошибка check_and_send_marketing: %s", e)

    async def check_and_send_marketing_nudges(self, context=None):
        """Проверить и отправить маркетинговые дожимы (очередь user_message_delivery)."""
        if not self.db.supabase:
            logger.debug("Маркетинговые дожимы: Supabase недоступен, пропуск")
            return

        db = self.db
        now_iso = datetime.utcnow().isoformat()

        try:
            logger.info("Маркетинговые дожимы: вызов fill_delivery_queue")
            db.call_rpc_fill_delivery_queue()

            pending = db.get_pending_deliveries(now_iso)
            logger.info("Маркетинговые дожимы: найдено %s записей для отправки", len(pending))

            for row in pending:
                delivery_id = row.get("id")
                user_id = row.get("user_id") or row.get("tg_user_id")
                message_id = row.get("message_id")
                if not user_id or not message_id:
                    logger.warning("Маркетинговые дожимы: пропуск записи %s — нет user_id или message_id", delivery_id)
                    db.update_delivery_status(delivery_id, "failed")
                    continue

                try:
                    msg = db.get_marketing_message(message_id)
                    if not msg:
                        logger.warning("Маркетинговые дожимы: сообщение %s не найдено", message_id)
                        db.update_delivery_status(delivery_id, "failed")
                        continue

                    text = msg.get("message_text") or msg.get("text") or msg.get("body") or ""
                    parse_mode = msg.get("parse_mode") or "HTML"

                    btn_rows = db.get_message_buttons(message_id)
                    keyboard = []
                    for b in btn_rows:
                        label = b.get("button_text") or b.get("label") or "Открыть"
                        url = b.get("button_url") or b.get("url") or b.get("link")
                        if url:
                            keyboard.append([InlineKeyboardButton(label, url=url)])
                    reply_markup = InlineKeyboardMarkup(keyboard) if keyboard else None

                    send_kw = {"chat_id": user_id, "text": text, "parse_mode": parse_mode}
                    if reply_markup:
                        send_kw["reply_markup"] = reply_markup
                    await self.bot.send_message(**send_kw)

                    db.update_delivery_status(delivery_id, "sent")
                    logger.info("Маркетинговые дожимы: отправлено пользователю %s, delivery_id=%s", user_id, delivery_id)

                except Exception as e:
                    logger.error("Маркетинговые дожимы: ошибка отправки пользователю %s: %s", user_id, e)
                    db.update_delivery_status(delivery_id, "failed")

        except Exception as e:
            logger.error("Маркетинговые дожимы: ошибка check_and_send_marketing_nudges: %s", e)
