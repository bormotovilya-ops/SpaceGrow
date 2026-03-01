"""
Отправка событий в Яндекс.Метрику через Measurement Protocol (mc.yandex.ru/collect).
Используется для фиксации запуска бота с start-параметром (utm_source) без браузера.
"""
import os
import logging
import time
import urllib.parse
import requests

logger = logging.getLogger(__name__)

COLLECT_URL = "https://mc.yandex.ru/collect"


def send_bot_start(user_id: int, utm_source: str = None, page_url_base: str = None) -> bool:
    """
    Отправить в Метрику визит «запуск бота» с utm_source (start-параметр).
    Создаёт pageview с URL, содержащим utm_source, чтобы в отчётах был источник.

    Требует в .env: YANDEX_METRIKA_COUNTER_ID (tid), YANDEX_METRIKA_MP_TOKEN (ms).
    Если переменных нет — запрос не отправляется.

    :param user_id: Telegram user id (используется как cid = tg_{user_id})
    :param utm_source: значение utm_source, напр. "blog_launch"
    :param page_url_base: базовый URL «страницы» (по умолчанию MINIAPP_URL или https://t.me/SpaceGrowthBot)
    """
    counter_id = (os.getenv("YANDEX_METRIKA_COUNTER_ID") or "").strip()
    token = (os.getenv("YANDEX_METRIKA_MP_TOKEN") or "").strip()
    if not counter_id or not token:
        logger.debug("Yandex Metrika: пропуск (нет YANDEX_METRIKA_COUNTER_ID или YANDEX_METRIKA_MP_TOKEN)")
        return False

    base = (page_url_base or os.getenv("MINIAPP_URL") or "https://t.me/SpaceGrowthBot").rstrip("/")
    if utm_source:
        sep = "&" if "?" in base else "?"
        page_url = f"{base}{sep}utm_source={urllib.parse.quote(utm_source)}"
    else:
        page_url = base

    cid = f"tg_{user_id}"
    et = int(time.time())
    params = {
        "tid": counter_id,
        "cid": cid,
        "t": "pageview",
        "dl": page_url,
        "dt": "Telegram Bot Start",
        "dr": "https://t.me/SpaceGrowthBot",
        "et": et,
        "ms": token,
    }
    try:
        resp = requests.get(COLLECT_URL, params=params, timeout=5)
        if resp.status_code != 200:
            logger.warning("Yandex Metrika collect вернул %s: %s", resp.status_code, resp.text[:200])
            return False
        logger.info("Yandex Metrika: отправлен bot_start user_id=%s utm_source=%s", user_id, utm_source)
        return True
    except Exception as e:
        logger.warning("Yandex Metrika: ошибка отправки %s", e)
        return False
