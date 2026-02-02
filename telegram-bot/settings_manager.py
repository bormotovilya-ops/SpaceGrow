"""
Централизованное управление настройками бота через таблицу bot_settings и RPC get_bot_setting.
Кэш в памяти: не чаще одного запроса в БД в 5 минут на ключ.
"""
import asyncio
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)

# TTL кэша в секундах (5 минут)
CACHE_TTL_SECONDS = 300


class BotSettingKeys:
    """Ключи настроек в bot_settings (избегаем опечаток)."""
    MARKETING_ACTIVE = "marketing_active"
    APP_MAINTENANCE = "app_maintenance"
    SUPPORT_CONTACT = "support_contact"
    MARKETING_INTERVAL = "marketing_interval_minutes"


def _parse_setting_value(raw: Any) -> Any:
    """Приводит ответ RPC get_bot_setting к значению (одна строка или объект с полем value)."""
    if raw is None:
        return None
    if isinstance(raw, list):
        raw = raw[0] if len(raw) > 0 else None
    if raw is None:
        return None
    if isinstance(raw, dict):
        return raw.get("value")
    return raw


def _is_truthy(value: Any) -> bool:
    """Проверка «включено» для булевых настроек (true, "true", 1, "1", "yes")."""
    if value is None:
        return False
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in ("true", "1", "yes", "on")
    if isinstance(value, (int, float)):
        return value != 0
    return bool(value)


class SettingsManager:
    """
    Менеджер настроек через db.rpc('get_bot_setting', {'p_key': key}).
    Кэширование: не чаще одного запроса в БД в 5 минут для одного ключа.
    """

    def __init__(self, db):
        self.db = db
        self._cache: dict[str, tuple[Any, float]] = {}  # key -> (value, timestamp)
        self._lock = asyncio.Lock()

    async def get_setting(self, key: str) -> Optional[Any]:
        """
        Получить значение настройки по ключу. Асинхронно, с кэшем 5 минут.
        """
        import time
        now = time.monotonic()
        async with self._lock:
            if key in self._cache:
                cached_val, cached_at = self._cache[key]
                if (now - cached_at) < CACHE_TTL_SECONDS:
                    return cached_val
            raw = await asyncio.to_thread(
                self.db.rpc, "get_bot_setting", {"p_key": key}
            )
            value = _parse_setting_value(raw)
            self._cache[key] = (value, now)
            return value

    async def get_setting_bool_async(self, key: str) -> bool:
        """Асинхронно получить булево значение настройки."""
        value = await self.get_setting(key)
        return _is_truthy(value)

    def invalidate_cache(self, key: Optional[str] = None) -> None:
        """Сбросить кэш для ключа или для всех ключей."""
        if key is None:
            self._cache.clear()
        elif key in self._cache:
            del self._cache[key]
