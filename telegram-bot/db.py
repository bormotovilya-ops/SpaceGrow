import logging
import json
import uuid
import os
import requests
from datetime import datetime
from typing import Optional, Tuple, Dict, List, Any

logger = logging.getLogger(__name__)


def _parse_count_from_content_range(content_range: Optional[str]) -> int:
    """Извлечь total из заголовка Content-Range (формат start-end/total)."""
    if not content_range or "/" not in content_range:
        return 0
    try:
        return int(content_range.strip().split("/")[-1])
    except (ValueError, IndexError):
        return 0


class Database:
    """База данных только через Supabase REST API (requests). При неверных ключах или недоступности — падение при запуске."""

    def __init__(self):
        supabase_url = (os.getenv("SUPABASE_URL") or "").rstrip("/")
        key = os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_KEY")
        if not supabase_url or not key:
            raise RuntimeError(
                "Supabase обязателен. Задайте SUPABASE_URL и SUPABASE_ANON_KEY (или SUPABASE_KEY) в .env"
            )
        self._base_url = f"{supabase_url}/rest/v1"
        self._headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }
        # Проверка доступности API (запрос к таблице users)
        r = requests.get(
            f"{self._base_url}/users",
            headers=self._headers,
            params={"select": "user_id", "limit": "0"},
            timeout=10,
        )
        if r.status_code not in (200, 201, 204):
            logger.error("Supabase API недоступен: status=%s, body=%s", r.status_code, (r.text or "")[:200])
            raise RuntimeError(f"Не удалось подключиться к Supabase: HTTP {r.status_code}")
        logger.info("✓ Подключение к Supabase установлено (REST API, public.users, user_segments)")

    def _check_response(self, r: requests.Response, context: str = "") -> None:
        """Логировать ошибку, если статус не 200, 201 или 204."""
        if r.status_code not in (200, 201, 204):
            logger.error(
                "%s: HTTP %s, body=%s",
                context or "Supabase API",
                r.status_code,
                (r.text or "")[:500],
            )

    def _get(self, table: str, params: Optional[Dict[str, str]] = None, headers_extra: Optional[Dict[str, str]] = None) -> requests.Response:
        url = f"{self._base_url}/{table}"
        h = dict(self._headers)
        if headers_extra:
            h.update(headers_extra)
        return requests.get(url, headers=h, params=params or {}, timeout=30)

    def _patch(self, table: str, params: Dict[str, str], payload: dict) -> requests.Response:
        url = f"{self._base_url}/{table}"
        return requests.patch(url, headers=self._headers, params=params, json=payload, timeout=30)

    def _post(self, table: str, payload: dict, headers_extra: Optional[Dict[str, str]] = None) -> requests.Response:
        logger.debug(f"FULL PAYLOAD: {payload}")
        url = f"{self._base_url}/{table}"
        h = dict(self._headers)
        if headers_extra:
            h.update(headers_extra)
        return requests.post(url, headers=h, json=payload, timeout=30)

    def get_bot_stats(self) -> Optional[dict]:
        """Получить статистику бота для /stats."""
        try:
            from datetime import timedelta
            prefer_count = {"Prefer": "count=exact"}
            # Всего
            r_total = self._get("users", params={"select": "user_id"}, headers_extra=prefer_count)
            self._check_response(r_total, "get_bot_stats total")
            total = _parse_count_from_content_range(r_total.headers.get("Content-Range"))
            # Начали диагностику
            r_started = self._get("users", params={"select": "user_id", "has_started_diagnostics": "eq.true"}, headers_extra=prefer_count)
            self._check_response(r_started, "get_bot_stats started")
            started = _parse_count_from_content_range(r_started.headers.get("Content-Range"))
            # Первое/второе напоминание
            r_first = self._get("users", params={"select": "user_id", "first_reminder_sent": "eq.true"}, headers_extra=prefer_count)
            self._check_response(r_first, "get_bot_stats first_sent")
            first_sent = _parse_count_from_content_range(r_first.headers.get("Content-Range"))
            r_second = self._get("users", params={"select": "user_id", "second_reminder_sent": "eq.true"}, headers_extra=prefer_count)
            self._check_response(r_second, "get_bot_stats second_sent")
            second_sent = _parse_count_from_content_range(r_second.headers.get("Content-Range"))
            # Ожидают первого (started_at + 10 min <= now)
            cutoff = (datetime.utcnow() - timedelta(minutes=10)).isoformat()
            r_pending = self._get("users", params={
                "select": "user_id",
                "has_started_diagnostics": "eq.false",
                "first_reminder_sent": "eq.false",
                "started_at": f"lte.{cutoff}",
            }, headers_extra=prefer_count)
            self._check_response(r_pending, "get_bot_stats pending")
            pending_first = _parse_count_from_content_range(r_pending.headers.get("Content-Range"))
            # Последние 5
            r_recent = self._get("users", params={
                "select": "user_id,first_name,username,has_started_diagnostics,first_reminder_sent,started_at",
                "order": "created_at.desc",
                "limit": "5",
            })
            self._check_response(r_recent, "get_bot_stats recent")
            recent_users = r_recent.json() if r_recent.status_code in (200, 201) else []
            return {
                "total": total,
                "started": started,
                "first_sent": first_sent,
                "second_sent": second_sent,
                "pending_first": pending_first,
                "recent_users": [{"user_id": u.get("user_id"), "first_name": u.get("first_name"), "username": u.get("username"), "has_started_diagnostics": u.get("has_started_diagnostics"), "first_reminder_sent": u.get("first_reminder_sent"), "started_at": u.get("started_at")} for u in recent_users],
            }
        except Exception as e:
            logger.error("Ошибка get_bot_stats: %s", e)
            return None

    def create_or_update_user(self, user_id: int, username: str = None,
                             first_name: str = None, last_name: str = None) -> None:
        """Создать или обновить пользователя при /start через RPC register_user (users, user_segments, user_identities)."""
        r = self._post(
            "rpc/register_user",
            payload={
                "p_user_id": user_id,
                "p_username": username,
                "p_first_name": first_name,
                "p_last_name": last_name,
            },
        )
        self._check_response(r, "create_or_update_user register_user")
        logger.info("Пользователь %s зарегистрирован (RPC register_user)", user_id)

    def mark_diagnostics_started(self, user_id: int) -> None:
        """Отметить, что пользователь начал диагностику"""
        from datetime import datetime as dt
        now = dt.utcnow().isoformat()
        r = self._patch("users", params={"user_id": f"eq.{user_id}"}, payload={
            "has_started_diagnostics": True,
            "diagnostics_started_at": now,
            "updated_at": now,
        })
        self._check_response(r, "mark_diagnostics_started")

    def mark_diagnostics_completed(self, user_id: int) -> None:
        """Отметить, что пользователь завершил диагностику"""
        from datetime import datetime as dt
        now = dt.utcnow().isoformat()
        r = self._patch("users", params={"user_id": f"eq.{user_id}"}, payload={
            "diagnostics_completed_at": now,
            "updated_at": now,
        })
        self._check_response(r, "mark_diagnostics_completed")
        logger.info("Пользователь %s отмечен как завершивший диагностику", user_id)
    
    def get_users_for_reminder(self, reminder_type: str) -> list:
        """Получить пользователей для отправки напоминания"""
        from datetime import timedelta
        dt = datetime.utcnow()
        if reminder_type == "first":
            cutoff = (dt - timedelta(minutes=1)).isoformat()
        else:
            cutoff = (dt - timedelta(hours=24)).isoformat()
        params = {
            "select": "user_id,username,first_name",
            "has_started_diagnostics": "eq.false",
            "started_at": f"lte.{cutoff}",
        }
        if reminder_type == "first":
            params["first_reminder_sent"] = "eq.false"
        else:
            params["second_reminder_sent"] = "eq.false"
        r = self._get("users", params=params)
        self._check_response(r, f"get_users_for_reminder {reminder_type}")
        rows = r.json() if r.status_code in (200, 201) else []
        users = [{"user_id": row["user_id"], "username": row.get("username"), "first_name": row.get("first_name")} for row in rows]
        logger.info("Найдено пользователей для напоминания '%s': %s", reminder_type, len(users))
        return users
    
    def mark_reminder_sent(self, user_id: int, reminder_type: str) -> None:
        """Отметить, что напоминание отправлено"""
        from datetime import datetime as dt
        now = dt.utcnow().isoformat()
        data = {"updated_at": now}
        if reminder_type == "first":
            data["first_reminder_sent"] = True
        else:
            data["second_reminder_sent"] = True
        r = self._patch("users", params={"user_id": f"eq.{user_id}"}, payload=data)
        self._check_response(r, "mark_reminder_sent")
        logger.info("Напоминание %s отправлено пользователю %s", reminder_type, user_id)

    def get_user_status(self, user_id: int) -> Optional[dict]:
        """Получить статус пользователя"""
        r = self._get("users", params={"user_id": f"eq.{user_id}", "limit": "1"})
        self._check_response(r, "get_user_status")
        rows = r.json() if r.status_code in (200, 201) else []
        if not rows:
            return None
        row = rows[0]
        out = dict(row)
        out["user_id"] = row.get("user_id")
        return out

    # --------------- RPC (обход кэша схемы PostgREST для user_segments) ---------------
    def _rpc_upsert_user_segment_on_start(
        self,
        tg_user_id: int,
        segment_hunt_level: int = 0,
        segment_temperature: str = "Нужна реанимация",
        updated_at: str = None,
        last_update: str = None,
    ) -> requests.Response:
        """Вставка/обновление user_segments через RPC (избегаем PGRST204 по таблице)."""
        from datetime import datetime as dt
        now = dt.utcnow().isoformat()
        updated_at = updated_at or now
        last_update = last_update or now
        url = f"{self._base_url}/rpc/upsert_user_segment_on_start"
        payload = {
            "p_tg_user_id": tg_user_id,
            "p_segment_hunt_level": segment_hunt_level,
            "p_segment_temperature": segment_temperature,
            "p_updated_at": updated_at,
            "p_last_update": last_update,
        }
        return requests.post(url, headers=self._headers, json=payload, timeout=30)

    # --------------- Универсальный RPC-вызов ---------------
    def rpc(self, function_name: str, params: dict = None) -> dict:
        """Универсальный вызов RPC-функции в Supabase."""
        r = self._post(f"rpc/{function_name}", payload=params or {})
        self._check_response(r, f"rpc {function_name}")
        if r.status_code in (200, 201):
            return r.json() if r.text else {}
        return {}

    # --------------- Маркетинговые дожимы (для notifications) ---------------
    def call_rpc_fill_delivery_queue(self) -> None:
        """RPC: заполнить очередь доставки."""
        url = f"{self._base_url}/rpc/fill_delivery_queue"
        r = requests.post(url, headers=self._headers, json={}, timeout=30)
        self._check_response(r, "rpc fill_delivery_queue")

    def get_active_marketing_users(self) -> List[dict]:
        """Список активных пользователей для маркетинговой рассылки: user_segments с tg_user_id not null."""
        r = self._get(
            "user_segments",
            params={
                "select": "tg_user_id",
                "tg_user_id": "not.is.null",
            },
        )
        self._check_response(r, "get_active_marketing_users")
        rows = r.json() if r.status_code in (200, 201) else []
        # Уникальные tg_user_id (на случай дублей по сегментам)
        seen = set()
        out = []
        for row in rows:
            uid = row.get("tg_user_id")
            if uid is not None and uid not in seen:
                seen.add(uid)
                out.append({"tg_user_id": uid})
        return out

    def get_pending_deliveries(self, now_iso: str) -> List[dict]:
        """Получить pending записи user_message_delivery с scheduled_at <= now_iso."""
        r = self._get("user_message_delivery", params={
            "status": "eq.pending",
            "scheduled_at": f"lte.{now_iso}",
        })
        self._check_response(r, "get_pending_deliveries")
        return r.json() if r.status_code in (200, 201) else []

    def get_marketing_message(self, message_id: int) -> Optional[dict]:
        """Получить сообщение из bot_marketing_messages по id."""
        r = self._get("bot_marketing_messages", params={"id": f"eq.{message_id}", "limit": "1"})
        self._check_response(r, "get_marketing_message")
        rows = r.json() if r.status_code in (200, 201) else []
        return rows[0] if rows else None

    def get_message_buttons(self, message_id: int) -> List[dict]:
        """Получить кнопки из bot_message_buttons по message_id, по sort_order."""
        r = self._get("bot_message_buttons", params={
            "message_id": f"eq.{message_id}",
            "order": "sort_order",
        })
        self._check_response(r, "get_message_buttons")
        return r.json() if r.status_code in (200, 201) else []

    def update_delivery_status(self, delivery_id: int, status: str) -> None:
        """Обновить статус в user_message_delivery. При успехе: status='sent', sent_at=now."""
        from datetime import datetime as dt
        payload = {"status": status}
        if status == "sent":
            payload["sent_at"] = dt.utcnow().isoformat()
        r = self._patch("user_message_delivery", params={"id": f"eq.{delivery_id}"}, payload=payload)
        self._check_response(r, "update_delivery_status")

    @property
    def supabase(self) -> "Database":
        """Для совместимости с кодом, проверяющим db.supabase (всегда доступен при инициализации)."""
        return self

    # =============== МЕТОДЫ ДЛЯ РАБОТЫ С ИДЕНТИФИКАЦИЕЙ ===============

    def _ensure_telegram_identity(self, tg_user_id: int, linked_at: str = None) -> None:
        """При /start добавить запись в user_identities (источник — бот), если её ещё нет."""
        from datetime import datetime as dt
        linked_at = linked_at or dt.utcnow().isoformat()
        r = self._get("user_identities", params={
            "tg_user_id": f"eq.{tg_user_id}",
            "source": "eq.telegram",
            "limit": "1",
        })
        self._check_response(r, "_ensure_telegram_identity select")
        rows = r.json() if r.status_code in (200, 201) else []
        if rows:
            return
        payload = {
            "tg_user_id": tg_user_id,
            "cookie_id": f"tg_{tg_user_id}",
            "source": "telegram",
            "linked_at": linked_at,
            "miniapp_id": None,
        }
        r2 = self._post("user_identities", payload=payload, headers_extra={"Prefer": "resolution=merge-duplicates"})
        self._check_response(r2, "_ensure_telegram_identity insert")
        logger.info("Пользователь %s добавлен в user_identities (source=telegram)", tg_user_id)

    def link_telegram_to_cookie(self, tg_user_id: int, cookie_id: str, source: str = 'miniapp') -> bool:
        """Связать Telegram пользователя с cookie ID (при открытии MiniApp и т.п.)."""
        from datetime import datetime as dt
        linked_at = dt.utcnow().isoformat()
        r = self._get("user_identities", params={
            "tg_user_id": f"eq.{tg_user_id}",
            "cookie_id": f"eq.{cookie_id}",
            "limit": "1",
        })
        self._check_response(r, "link_telegram_to_cookie select")
        rows = r.json() if r.status_code in (200, 201) else []
        if rows:
            return True
        payload = {
            "tg_user_id": tg_user_id,
            "cookie_id": cookie_id,
            "source": source,
            "linked_at": linked_at,
            "miniapp_id": None,
        }
        r2 = self._post("user_identities", payload=payload, headers_extra={"Prefer": "resolution=merge-duplicates"})
        self._check_response(r2, "link_telegram_to_cookie insert")
        logger.info("Связан tg_user_id=%s с cookie_id=%s (source=%s)", tg_user_id, cookie_id, source)
        return r2.status_code in (200, 201)

    def get_user_by_cookie(self, cookie_id: str) -> Optional[dict]:
        """Найти пользователя по cookie_id"""
        raise NotImplementedError("Только Supabase: метод не реализован для облачной БД")

    def get_user_by_telegram(self, tg_user_id: int) -> Optional[dict]:
        """Найти пользователя по telegram user_id"""
        raise NotImplementedError("Только Supabase: метод не реализован для облачной БД")

    def get_all_user_identities(self, tg_user_id: int) -> List[dict]:
        """Получить все идентификаторы пользователя"""
        raise NotImplementedError("Только Supabase: метод не реализован для облачной БД")

    # =============== МЕТОДЫ ДЛЯ РАБОТЫ С СЕССИЯМИ ===============

    def create_site_session(self, cookie_id: str, tg_user_id: Optional[int] = None,
                           user_agent: str = None, ip: str = None) -> int:
        """Создать новую сессию сайта"""
        raise NotImplementedError("Только Supabase: метод не реализован для облачной БД")

    def end_site_session(self, session_id: int) -> bool:
        """Завершить сессию сайта"""
        raise NotImplementedError("Только Supabase: метод не реализован для облачной БД")

    def get_active_sessions(self, cookie_id: str) -> List[dict]:
        """Получить активные сессии для cookie_id"""
        raise NotImplementedError("Только Supabase: метод не реализован для облачной БД")

    def update_session_info(self, session_id: int, **kwargs) -> bool:
        """Обновить информацию о сессии"""
        allowed_fields = [
            'source', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
            'referrer', 'device_type', 'device_model', 'browser', 'os', 'screen_resolution',
            'geo_country', 'geo_city', 'geo_region', 'page_id', 'entry_page', 'exit_page',
            'session_duration', 'page_views', 'events_count'
        ]
        update_items = {k: v for k, v in kwargs.items() if k in allowed_fields}
        if not update_items:
            return False
        raise NotImplementedError("Только Supabase: метод не реализован для облачной БД")

    # =============== МЕТОДЫ ДЛЯ РАБОТЫ С СОБЫТИЯМИ ===============

    def log_event(self, session_id: int, event_type: str, event_name: str,
                  page: str = None, metadata: dict = None, tg_user_id: Optional[int] = None,
                  event_category: str = None, event_subtype: str = None, element_id: str = None,
                  element_type: str = None, section: str = None, scroll_depth: int = None,
                  time_spent: int = None, interaction_count: int = None,
                  previous_event_id: Optional[int] = None, step_number: int = None,
                  completion_rate: float = None, error_message: str = None,
                  custom_data: dict = None) -> int:
        """Логировать расширенное событие пользователя"""
        raise NotImplementedError("Только Supabase: метод не реализован для облачной БД")

    def get_user_events(self, tg_user_id: int, limit: int = 100) -> List[dict]:
        """Получить события пользователя"""
        raise NotImplementedError("Только Supabase: метод не реализован для облачной БД")

    def get_session_events(self, session_id: int) -> List[dict]:
        """Получить события сессии"""
        raise NotImplementedError("Только Supabase: метод не реализован для облачной БД")

    # =============== СПЕЦИАЛИЗИРОВАННЫЕ МЕТОДЫ ЛОГИРОВАНИЯ ===============

    def log_source_visit(self, session_id: int, source: str, cookie_id: str,
                        utm_params: dict = None, referrer: str = None,
                        tg_user_id: Optional[int] = None) -> int:
        """Логирование источника посещения"""
        utm_params = utm_params or {}

        return self.log_event(
            session_id=session_id,
            event_type='visit',
            event_name='source_visit',
            event_category='acquisition',
            tg_user_id=tg_user_id,
            custom_data={
                'source': source,
                'cookie_id': cookie_id,
                'utm_source': utm_params.get('utm_source'),
                'utm_medium': utm_params.get('utm_medium'),
                'utm_campaign': utm_params.get('utm_campaign'),
                'utm_term': utm_params.get('utm_term'),
                'utm_content': utm_params.get('utm_content'),
                'referrer': referrer
            }
        )

    def log_miniapp_open(self, session_id: int, device: str, page_id: str,
                        cookie_id: str, tg_user_id: Optional[int] = None) -> int:
        """Логирование открытия MiniApp"""
        return self.log_event(
            session_id=session_id,
            event_type='app',
            event_name='miniapp_open',
            event_category='engagement',
            tg_user_id=tg_user_id,
            custom_data={
                'device': device,
                'page_id': page_id,
                'cookie_id': cookie_id
            }
        )

    def log_content_view(self, session_id: int, content_type: str, content_id: str,
                        content_title: str = None, section: str = None, time_spent: int = None,
                        scroll_depth: int = None, cookie_id: str = None,
                        tg_user_id: Optional[int] = None) -> int:
        """Логирование просмотра контента"""
        # Также сохраняем в специализированную таблицу content_views
        self._save_content_view(session_id, content_type, content_id, content_title,
                               section, time_spent, scroll_depth, cookie_id, tg_user_id)

        return self.log_event(
            session_id=session_id,
            event_type='content',
            event_name='content_view',
            event_category='engagement',
            tg_user_id=tg_user_id,
            section=section,
            time_spent=time_spent,
            scroll_depth=scroll_depth,
            custom_data={
                'content_type': content_type,
                'content_id': content_id,
                'content_title': content_title,
                'cookie_id': cookie_id
            }
        )

    def log_ai_interaction(self, session_id: int, messages_count: int, topics: list,
                          duration: int, conversation_type: str, cookie_id: str = None,
                          tg_user_id: Optional[int] = None) -> int:
        """Логирование взаимодействия с AI"""
        # Исключаем логирование экспертных разговоров и закрытия сделок
        if conversation_type in ['expert', 'deal_closure']:
            logger.info(f"Пропущено логирование {conversation_type} разговора")
            return 0

        # Сохраняем в специализированную таблицу ai_interactions
        self._save_ai_interaction(session_id, messages_count, topics, duration,
                                 conversation_type, cookie_id, tg_user_id)

        return self.log_event(
            session_id=session_id,
            event_type='ai',
            event_name='ai_interaction',
            event_category='engagement',
            tg_user_id=tg_user_id,
            time_spent=duration,
            interaction_count=messages_count,
            custom_data={
                'messages_count': messages_count,
                'topics': topics,
                'conversation_type': conversation_type,
                'cookie_id': cookie_id
            }
        )

    def log_diagnostic_completion(self, session_id: int, results: dict, start_time: str,
                                 end_time: str, progress: dict, cookie_id: str = None,
                                 tg_user_id: Optional[int] = None) -> int:
        """Логирование завершения диагностики/теста"""
        # Сохраняем расширенные результаты диагностики
        self.save_diagnostics_result(
            tg_user_id=tg_user_id,
            result_data={
                'results': results,
                'start_time': start_time,
                'end_time': end_time,
                'progress': progress,
                'session_id': session_id,
                'cookie_id': cookie_id
            }
        )

        return self.log_event(
            session_id=session_id,
            event_type='diagnostic',
            event_name='diagnostic_completed',
            event_category='conversion',
            tg_user_id=tg_user_id,
            completion_rate=progress.get('completion_rate', 100.0),
            custom_data={
                'results': results,
                'start_time': start_time,
                'end_time': end_time,
                'progress': progress,
                'cookie_id': cookie_id
            }
        )

    def log_game_action(self, session_id: int, game_type: str, action_type: str,
                       action_data: dict, score: int = None, achievement: str = None,
                       duration: int = None, cookie_id: str = None,
                       tg_user_id: Optional[int] = None) -> int:
        """Логирование игровых действий"""
        # Сохраняем в специализированную таблицу game_actions
        self._save_game_action(session_id, game_type, action_type, action_data,
                              score, achievement, duration, cookie_id, tg_user_id)

        return self.log_event(
            session_id=session_id,
            event_type='game',
            event_name=f'{game_type}_{action_type}',
            event_category='engagement',
            tg_user_id=tg_user_id,
            time_spent=duration,
            custom_data={
                'game_type': game_type,
                'action_type': action_type,
                'action_data': action_data,
                'score': score,
                'achievement': achievement,
                'cookie_id': cookie_id
            }
        )

    def log_cta_click(self, session_id: int, cta_type: str, cta_text: str = None,
                     cta_location: str = None, previous_step: str = None,
                     step_duration: int = None, cookie_id: str = None,
                     tg_user_id: Optional[int] = None) -> int:
        """Логирование клика по CTA"""
        # Сохраняем в специализированную таблицу cta_clicks
        self._save_cta_click(session_id, cta_type, cta_text, cta_location,
                           previous_step, step_duration, cookie_id, tg_user_id)

        return self.log_event(
            session_id=session_id,
            event_type='cta',
            event_name='cta_click',
            event_category='conversion',
            tg_user_id=tg_user_id,
            time_spent=step_duration,
            element_type='button',
            custom_data={
                'cta_type': cta_type,
                'cta_text': cta_text,
                'cta_location': cta_location,
                'previous_step': previous_step,
                'cookie_id': cookie_id
            }
        )

    def log_personal_path_view(self, session_id: int, open_time: str, duration: int,
                              downloaded: bool = False, cookie_id: str = None,
                              tg_user_id: Optional[int] = None) -> int:
        """Логирование просмотра персонального пути/PDF"""
        return self.log_event(
            session_id=session_id,
            event_type='content',
            event_name='personal_path_view',
            event_category='engagement',
            tg_user_id=tg_user_id,
            time_spent=duration,
            custom_data={
                'open_time': open_time,
                'duration': duration,
                'downloaded': downloaded,
                'cookie_id': cookie_id
            }
        )

    # =============== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ДЛЯ СПЕЦИАЛИЗИРОВАННЫХ ТАБЛИЦ ===============

    def _save_content_view(self, session_id: int, content_type: str, content_id: str,
                          content_title: str = None, section: str = None, time_spent: int = None,
                          scroll_depth: int = None, cookie_id: str = None,
                          tg_user_id: Optional[int] = None) -> bool:
        """Сохранение просмотра контента в специализированную таблицу"""
        raise NotImplementedError("Только Supabase: метод не реализован для облачной БД")

    def _save_ai_interaction(self, session_id: int, messages_count: int, topics: list,
                            duration: int, conversation_type: str, cookie_id: str = None,
                            tg_user_id: Optional[int] = None) -> bool:
        """Сохранение AI взаимодействия в специализированную таблицу"""
        raise NotImplementedError("Только Supabase: метод не реализован для облачной БД")

    def _save_game_action(self, session_id: int, game_type: str, action_type: str,
                         action_data: dict, score: int = None, achievement: str = None,
                         duration: int = None, cookie_id: str = None,
                         tg_user_id: Optional[int] = None) -> bool:
        """Сохранение игрового действия в специализированную таблицу"""
        raise NotImplementedError("Только Supabase: метод не реализован для облачной БД")

    def _save_cta_click(self, session_id: int, cta_type: str, cta_text: str = None,
                       cta_location: str = None, previous_step: str = None,
                       step_duration: int = None, cookie_id: str = None,
                       tg_user_id: Optional[int] = None) -> bool:
        """Сохранение CTA клика в специализированную таблицу"""
        raise NotImplementedError("Только Supabase: метод не реализован для облачной БД")

    # =============== МЕТОДЫ ДЛЯ РАБОТЫ С ДИАГНОСТИКОЙ ===============

    def save_diagnostics_result(self, tg_user_id: int, result_data: dict, cookie_id: Optional[str] = None) -> bool:
        """Сохранить результаты диагностики (public.users)."""
        from datetime import datetime as dt
        now = dt.utcnow().isoformat()
        r = self._patch("users", params={"user_id": f"eq.{tg_user_id}"}, payload={
            "diagnostics_completed_at": now,
            "updated_at": now,
        })
        self._check_response(r, "save_diagnostics_result")
        logger.info("Сохранены результаты диагностики для пользователя %s", tg_user_id)
        return True

    def get_diagnostics_result(self, tg_user_id: int) -> Optional[dict]:
        """Получить результаты диагностики пользователя"""
        raise NotImplementedError("Только Supabase: метод не реализован для облачной БД")

    # =============== АНАЛИТИЧЕСКИЕ МЕТОДЫ ===============

    def get_user_analytics(self, tg_user_id: int) -> dict:
        """Получить аналитику по пользователю"""
        raise NotImplementedError("Только Supabase: метод не реализован для облачной БД")

    def get_site_stats(self) -> dict:
        """Получить общую статистику сайта"""
        raise NotImplementedError("Только Supabase: метод не реализован для облачной БД")

    # =============== МЕТОДЫ СЕГМЕНТАЦИИ ПОЛЬЗОВАТЕЛЕЙ ===============

    def get_user_segment(self, tg_user_id: int) -> dict:
        """Определить сегмент пользователя на основе его действий"""
        raise NotImplementedError("Только Supabase: метод не реализован для облачной БД")

    def get_user_segment_data(self, tg_user_id: int) -> dict:
        """Получить данные сегмента пользователя (hunt_level, temperature, niche) из user_segments."""
        r = self._get("user_segments", params={"tg_user_id": f"eq.{tg_user_id}", "limit": "1"})
        self._check_response(r, "get_user_segment_data")
        rows = r.json() if r.status_code in (200, 201) else []
        if rows:
            seg = rows[0]
            return {
                "hunt_level": seg.get("segment_hunt_level", 0),
                "temperature": seg.get("segment_temperature", "Нужна реанимация"),
                "niche": seg.get("niche", "default"),
            }
        return {"hunt_level": 0, "temperature": "Нужна реанимация", "niche": "default"}

    def _analyze_content_preferences(self, tg_user_id: int) -> list:
        """Анализ предпочтений контента пользователя"""
        raise NotImplementedError("Только Supabase: метод не реализован для облачной БД")

    def _analyze_behavior_patterns(self, tg_user_id: int) -> list:
        """Анализ паттернов поведения пользователя"""
        raise NotImplementedError("Только Supabase: метод не реализован для облачной БД")

    def get_segment_users(self, segment_criteria: dict) -> List[int]:
        """Получить пользователей по критериям сегмента"""
        raise NotImplementedError("Только Supabase: метод не реализован для облачной БД")

    def get_conversion_funnel(self, start_date: str = None, end_date: str = None) -> dict:
        """Получить данные воронки конверсии"""
        raise NotImplementedError("Только Supabase: метод не реализован для облачной БД")
