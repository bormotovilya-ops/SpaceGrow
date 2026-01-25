import sqlite3
import logging
import json
import uuid
from datetime import datetime
from typing import Optional, Tuple, Dict, List, Any

logger = logging.getLogger(__name__)

class Database:
    def __init__(self, db_path: str = "bot_users.db"):
        self.db_path = db_path
        # Импортируем и запускаем миграции при инициализации
        try:
            from migrations import run_database_migrations
            run_database_migrations(self.db_path)
        except ImportError:
            logger.warning("Модуль migrations не найден. Убедитесь что migrations.py существует.")
    
    def get_connection(self):
        """Получить соединение с БД"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def init_db(self):
        """Инициализация таблиц БД"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                user_id INTEGER PRIMARY KEY,
                username TEXT,
                first_name TEXT,
                last_name TEXT,
                has_started_diagnostics BOOLEAN DEFAULT 0,
                first_reminder_sent BOOLEAN DEFAULT 0,
                second_reminder_sent BOOLEAN DEFAULT 0,
                started_at TIMESTAMP,
                diagnostics_started_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
        logger.info("База данных инициализирована")
    
    def create_or_update_user(self, user_id: int, username: str = None, 
                             first_name: str = None, last_name: str = None) -> None:
        """Создать или обновить пользователя при /start"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Проверяем, существует ли пользователь
        cursor.execute('SELECT * FROM users WHERE user_id = ?', (user_id,))
        user = cursor.fetchone()
        
        if user:
            # Обновляем только если статус диагностики еще false
            if not user['has_started_diagnostics']:
                cursor.execute('''
                    UPDATE users 
                    SET username = ?, first_name = ?, last_name = ?,
                        started_at = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = ?
                ''', (username, first_name, last_name, user_id))
                logger.info(f"Пользователь {user_id} обновлен. started_at установлен на CURRENT_TIMESTAMP")
            else:
                logger.info(f"Пользователь {user_id} уже начал диагностику, started_at не обновляется")
        else:
            # Создаем нового пользователя
            cursor.execute('''
                INSERT INTO users (user_id, username, first_name, last_name, 
                                 has_started_diagnostics, started_at)
                VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
            ''', (user_id, username, first_name, last_name))
            logger.info(f"Новый пользователь {user_id} создан. started_at установлен на CURRENT_TIMESTAMP")
        
        conn.commit()
        conn.close()
        logger.info(f"Пользователь {user_id} создан/обновлен в БД")
    
    def mark_diagnostics_started(self, user_id: int) -> None:
        """Отметить, что пользователь начал диагностику"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            UPDATE users
            SET has_started_diagnostics = 1,
                diagnostics_started_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        ''', (user_id,))

        conn.commit()
        conn.close()

    def mark_diagnostics_completed(self, user_id: int) -> None:
        """Отметить, что пользователь завершил диагностику"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            UPDATE users
            SET diagnostics_completed_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        ''', (user_id,))

        conn.commit()
        conn.close()
        logger.info(f"Пользователь {user_id} начал диагностику")
    
    def get_users_for_reminder(self, reminder_type: str) -> list:
        """Получить пользователей для отправки напоминания"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        if reminder_type == "first":
            # Первое напоминание через 10 минут
            cursor.execute('''
                SELECT user_id, username, first_name 
                FROM users 
                WHERE has_started_diagnostics = 0 
                AND first_reminder_sent = 0
                AND started_at IS NOT NULL
                AND datetime(started_at, '+10 minutes') <= datetime('now')
            ''')
            logger.info(f"Запрос первого напоминания выполнен. Текущее время: {datetime.now()}")
        elif reminder_type == "second":
            # Второе напоминание через 24 часа
            cursor.execute('''
                SELECT user_id, username, first_name 
                FROM users 
                WHERE has_started_diagnostics = 0 
                AND second_reminder_sent = 0
                AND started_at IS NOT NULL
                AND datetime(started_at, '+24 hours') <= datetime('now')
            ''')
        
        users = cursor.fetchall()
        logger.info(f"Найдено пользователей для напоминания '{reminder_type}': {len(users)}")
        if users:
            for user in users:
                logger.info(f"  - Пользователь {user['user_id']} ({user['username'] or user['first_name']})")
        conn.close()
        return users
    
    def mark_reminder_sent(self, user_id: int, reminder_type: str) -> None:
        """Отметить, что напоминание отправлено"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        if reminder_type == "first":
            cursor.execute('''
                UPDATE users 
                SET first_reminder_sent = 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            ''', (user_id,))
        elif reminder_type == "second":
            cursor.execute('''
                UPDATE users 
                SET second_reminder_sent = 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            ''', (user_id,))
        
        conn.commit()
        conn.close()
        logger.info(f"Напоминание {reminder_type} отправлено пользователю {user_id}")
    
    def get_user_status(self, user_id: int) -> Optional[dict]:
        """Получить статус пользователя"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute('SELECT * FROM users WHERE user_id = ?', (user_id,))
        user = cursor.fetchone()
        conn.close()

        if user:
            return dict(user)
        return None

    # =============== МЕТОДЫ ДЛЯ РАБОТЫ С ИДЕНТИФИКАЦИЕЙ ===============

    def link_telegram_to_cookie(self, tg_user_id: int, cookie_id: str, source: str = 'miniapp') -> bool:
        """Связать Telegram пользователя с cookie ID"""
        conn = self.get_connection()
        cursor = conn.cursor()

        try:
            cursor.execute('''
                INSERT OR REPLACE INTO user_identities (tg_user_id, cookie_id, source, linked_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ''', (tg_user_id, cookie_id, source))

            conn.commit()
            logger.info(f"Связан tg_user_id {tg_user_id} с cookie_id {cookie_id}")
            return True
        except Exception as e:
            logger.error(f"Ошибка при связывании идентификаторов: {e}")
            conn.rollback()
            return False
        finally:
            conn.close()

    def get_user_by_cookie(self, cookie_id: str) -> Optional[dict]:
        """Найти пользователя по cookie_id"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            SELECT u.*, ui.cookie_id, ui.source, ui.linked_at
            FROM users u
            JOIN user_identities ui ON u.user_id = ui.tg_user_id
            WHERE ui.cookie_id = ?
            ORDER BY ui.linked_at DESC
            LIMIT 1
        ''', (cookie_id,))

        result = cursor.fetchone()
        conn.close()

        return dict(result) if result else None

    def get_user_by_telegram(self, tg_user_id: int) -> Optional[dict]:
        """Найти пользователя по telegram user_id"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            SELECT u.*, ui.cookie_id, ui.source, ui.linked_at
            FROM users u
            LEFT JOIN user_identities ui ON u.user_id = ui.tg_user_id
            WHERE u.user_id = ?
        ''', (tg_user_id,))

        result = cursor.fetchone()
        conn.close()

        return dict(result) if result else None

    def get_all_user_identities(self, tg_user_id: int) -> List[dict]:
        """Получить все идентификаторы пользователя"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            SELECT * FROM user_identities
            WHERE tg_user_id = ?
            ORDER BY linked_at DESC
        ''', (tg_user_id,))

        results = cursor.fetchall()
        conn.close()

        return [dict(row) for row in results]

    # =============== МЕТОДЫ ДЛЯ РАБОТЫ С СЕССИЯМИ ===============

    def create_site_session(self, cookie_id: str, tg_user_id: Optional[int] = None,
                           user_agent: str = None, ip: str = None) -> int:
        """Создать новую сессию сайта"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            INSERT INTO site_sessions (cookie_id, tg_user_id, user_agent, ip)
            VALUES (?, ?, ?, ?)
        ''', (cookie_id, tg_user_id, user_agent, ip))

        session_id = cursor.lastrowid
        conn.commit()
        conn.close()

        logger.info(f"Создана сессия {session_id} для cookie_id {cookie_id}")
        return session_id

    def end_site_session(self, session_id: int) -> bool:
        """Завершить сессию сайта"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            UPDATE site_sessions
            SET session_end = CURRENT_TIMESTAMP
            WHERE id = ? AND session_end IS NULL
        ''', (session_id,))

        success = cursor.rowcount > 0
        conn.commit()
        conn.close()

        if success:
            logger.info(f"Завершена сессия {session_id}")

        return success

    def get_active_sessions(self, cookie_id: str) -> List[dict]:
        """Получить активные сессии для cookie_id"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            SELECT * FROM site_sessions
            WHERE cookie_id = ? AND session_end IS NULL
            ORDER BY session_start DESC
        ''', (cookie_id,))

        results = cursor.fetchall()
        conn.close()

        return [dict(row) for row in results]

    def update_session_info(self, session_id: int, **kwargs) -> bool:
        """Обновить информацию о сессии"""
        conn = self.get_connection()
        cursor = conn.cursor()

        try:
            # Строим динамический UPDATE запрос
            update_fields = []
            values = []

            allowed_fields = [
                'source', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
                'referrer', 'device_type', 'device_model', 'browser', 'os', 'screen_resolution',
                'geo_country', 'geo_city', 'geo_region', 'page_id', 'entry_page', 'exit_page',
                'session_duration', 'page_views', 'events_count'
            ]

            for key, value in kwargs.items():
                if key in allowed_fields:
                    update_fields.append(f"{key} = ?")
                    values.append(value)

            if not update_fields:
                return False

            update_fields.append("updated_at = CURRENT_TIMESTAMP")
            values.append(session_id)

            sql = f"UPDATE site_sessions SET {', '.join(update_fields)} WHERE id = ?"
            cursor.execute(sql, values)

            success = cursor.rowcount > 0
            conn.commit()

            if success:
                logger.info(f"Обновлена информация сессии {session_id}")

            return success
        except Exception as e:
            logger.error(f"Ошибка при обновлении сессии {session_id}: {e}")
            conn.rollback()
            return False
        finally:
            conn.close()

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
        conn = self.get_connection()
        cursor = conn.cursor()

        try:
            metadata_json = json.dumps(metadata) if metadata else None
            custom_data_json = json.dumps(custom_data) if custom_data else None

            cursor.execute('''
                INSERT INTO site_events (
                    session_id, tg_user_id, event_type, event_name, page, metadata,
                    event_category, event_subtype, element_id, element_type, section,
                    scroll_depth, time_spent, interaction_count, previous_event_id,
                    step_number, completion_rate, error_message, custom_data
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (session_id, tg_user_id, event_type, event_name, page, metadata_json,
                  event_category, event_subtype, element_id, element_type, section,
                  scroll_depth, time_spent, interaction_count, previous_event_id,
                  step_number, completion_rate, error_message, custom_data_json))

            event_id = cursor.lastrowid
            conn.commit()

            # Обновляем счетчик событий в сессии
            cursor.execute('''
                UPDATE site_sessions
                SET events_count = events_count + 1
                WHERE id = ?
            ''', (session_id,))

            conn.commit()
            logger.debug(f"Залогировано событие ID {event_id}: {event_type}.{event_name} в сессии {session_id}")
            return event_id
        except Exception as e:
            logger.error(f"Ошибка при логировании события: {e}")
            conn.rollback()
            return 0
        finally:
            conn.close()

    def get_user_events(self, tg_user_id: int, limit: int = 100) -> List[dict]:
        """Получить события пользователя"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            SELECT se.*, ss.cookie_id, ss.session_start
            FROM site_events se
            JOIN site_sessions ss ON se.session_id = ss.id
            WHERE se.tg_user_id = ?
            ORDER BY se.created_at DESC
            LIMIT ?
        ''', (tg_user_id, limit))

        results = cursor.fetchall()
        conn.close()

        # Преобразуем JSON metadata обратно в dict
        events = []
        for row in results:
            event = dict(row)
            if event.get('metadata'):
                try:
                    event['metadata'] = json.loads(event['metadata'])
                except:
                    pass
            events.append(event)

        return events

    def get_session_events(self, session_id: int) -> List[dict]:
        """Получить события сессии"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            SELECT * FROM site_events
            WHERE session_id = ?
            ORDER BY created_at ASC
        ''', (session_id,))

        results = cursor.fetchall()
        conn.close()

        events = []
        for row in results:
            event = dict(row)
            if event.get('metadata'):
                try:
                    event['metadata'] = json.loads(event['metadata'])
                except:
                    pass
            events.append(event)

        return events

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
        conn = self.get_connection()
        cursor = conn.cursor()

        try:
            cursor.execute('''
                INSERT INTO content_views (
                    session_id, tg_user_id, cookie_id, content_type, content_id,
                    content_title, section, time_spent, scroll_depth
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (session_id, tg_user_id, cookie_id, content_type, content_id,
                  content_title, section, time_spent, scroll_depth))

            conn.commit()
            return True
        except Exception as e:
            logger.error(f"Ошибка при сохранении просмотра контента: {e}")
            conn.rollback()
            return False
        finally:
            conn.close()

    def _save_ai_interaction(self, session_id: int, messages_count: int, topics: list,
                            duration: int, conversation_type: str, cookie_id: str = None,
                            tg_user_id: Optional[int] = None) -> bool:
        """Сохранение AI взаимодействия в специализированную таблицу"""
        conn = self.get_connection()
        cursor = conn.cursor()

        try:
            topics_json = json.dumps(topics) if topics else None

            cursor.execute('''
                INSERT INTO ai_interactions (
                    session_id, tg_user_id, cookie_id, messages_count, topics,
                    interaction_duration, conversation_type
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (session_id, tg_user_id, cookie_id, messages_count, topics_json,
                  duration, conversation_type))

            conn.commit()
            return True
        except Exception as e:
            logger.error(f"Ошибка при сохранении AI взаимодействия: {e}")
            conn.rollback()
            return False
        finally:
            conn.close()

    def _save_game_action(self, session_id: int, game_type: str, action_type: str,
                         action_data: dict, score: int = None, achievement: str = None,
                         duration: int = None, cookie_id: str = None,
                         tg_user_id: Optional[int] = None) -> bool:
        """Сохранение игрового действия в специализированную таблицу"""
        conn = self.get_connection()
        cursor = conn.cursor()

        try:
            action_data_json = json.dumps(action_data) if action_data else None

            cursor.execute('''
                INSERT INTO game_actions (
                    session_id, tg_user_id, cookie_id, game_type, action_type,
                    action_data, score, achievement, duration
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (session_id, tg_user_id, cookie_id, game_type, action_type,
                  action_data_json, score, achievement, duration))

            conn.commit()
            return True
        except Exception as e:
            logger.error(f"Ошибка при сохранении игрового действия: {e}")
            conn.rollback()
            return False
        finally:
            conn.close()

    def _save_cta_click(self, session_id: int, cta_type: str, cta_text: str = None,
                       cta_location: str = None, previous_step: str = None,
                       step_duration: int = None, cookie_id: str = None,
                       tg_user_id: Optional[int] = None) -> bool:
        """Сохранение CTA клика в специализированную таблицу"""
        conn = self.get_connection()
        cursor = conn.cursor()

        try:
            cursor.execute('''
                INSERT INTO cta_clicks (
                    session_id, tg_user_id, cookie_id, cta_type, cta_text,
                    cta_location, previous_step, step_duration
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (session_id, tg_user_id, cookie_id, cta_type, cta_text,
                  cta_location, previous_step, step_duration))

            conn.commit()
            return True
        except Exception as e:
            logger.error(f"Ошибка при сохранении CTA клика: {e}")
            conn.rollback()
            return False
        finally:
            conn.close()

    # =============== МЕТОДЫ ДЛЯ РАБОТЫ С ДИАГНОСТИКОЙ ===============

    def save_diagnostics_result(self, tg_user_id: int, result_data: dict, cookie_id: Optional[str] = None) -> bool:
        """Сохранить результаты диагностики"""
        conn = self.get_connection()
        cursor = conn.cursor()

        try:
            result_json = json.dumps(result_data, ensure_ascii=False)

            cursor.execute('''
                INSERT OR REPLACE INTO diagnostics_results (tg_user_id, cookie_id, result_json, completed_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ''', (tg_user_id, cookie_id, result_json))

            conn.commit()
            logger.info(f"Сохранены результаты диагностики для пользователя {tg_user_id}")
            return True
        except Exception as e:
            logger.error(f"Ошибка при сохранении результатов диагностики: {e}")
            conn.rollback()
            return False
        finally:
            conn.close()

    def get_diagnostics_result(self, tg_user_id: int) -> Optional[dict]:
        """Получить результаты диагностики пользователя"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            SELECT * FROM diagnostics_results
            WHERE tg_user_id = ?
            ORDER BY completed_at DESC
            LIMIT 1
        ''', (tg_user_id,))

        result = cursor.fetchone()
        conn.close()

        if result:
            data = dict(result)
            try:
                data['result_data'] = json.loads(data['result_json'])
            except:
                data['result_data'] = {}
            return data

        return None

    # =============== АНАЛИТИЧЕСКИЕ МЕТОДЫ ===============

    def get_user_analytics(self, tg_user_id: int) -> dict:
        """Получить аналитику по пользователю"""
        conn = self.get_connection()
        cursor = conn.cursor()

        analytics = {
            'total_sessions': 0,
            'total_events': 0,
            'last_session': None,
            'diagnostics_completed': False,
            'identities_count': 0
        }

        # Количество сессий
        cursor.execute('SELECT COUNT(*) FROM site_sessions WHERE tg_user_id = ?', (tg_user_id,))
        analytics['total_sessions'] = cursor.fetchone()[0]

        # Количество событий
        cursor.execute('SELECT COUNT(*) FROM site_events WHERE tg_user_id = ?', (tg_user_id,))
        analytics['total_events'] = cursor.fetchone()[0]

        # Последняя сессия
        cursor.execute('''
            SELECT session_start FROM site_sessions
            WHERE tg_user_id = ?
            ORDER BY session_start DESC
            LIMIT 1
        ''', (tg_user_id,))
        last_session = cursor.fetchone()
        analytics['last_session'] = last_session[0] if last_session else None

        # Статус диагностики
        cursor.execute('SELECT COUNT(*) FROM diagnostics_results WHERE tg_user_id = ?', (tg_user_id,))
        analytics['diagnostics_completed'] = cursor.fetchone()[0] > 0

        # Количество идентификаторов
        cursor.execute('SELECT COUNT(*) FROM user_identities WHERE tg_user_id = ?', (tg_user_id,))
        analytics['identities_count'] = cursor.fetchone()[0]

        conn.close()
        return analytics

    def get_site_stats(self) -> dict:
        """Получить общую статистику сайта"""
        conn = self.get_connection()
        cursor = conn.cursor()

        stats = {
            'total_users': 0,
            'total_sessions': 0,
            'total_events': 0,
            'diagnostics_completed': 0,
            'active_sessions': 0
        }

        # Общее количество пользователей
        cursor.execute('SELECT COUNT(DISTINCT tg_user_id) FROM user_identities WHERE tg_user_id IS NOT NULL')
        stats['total_users'] = cursor.fetchone()[0]

        # Общее количество сессий
        cursor.execute('SELECT COUNT(*) FROM site_sessions')
        stats['total_sessions'] = cursor.fetchone()[0]

        # Общее количество событий
        cursor.execute('SELECT COUNT(*) FROM site_events')
        stats['total_events'] = cursor.fetchone()[0]

        # Количество завершенных диагностик
        cursor.execute('SELECT COUNT(*) FROM diagnostics_results')
        stats['diagnostics_completed'] = cursor.fetchone()[0]

        # Активные сессии (без session_end)
        cursor.execute('SELECT COUNT(*) FROM site_sessions WHERE session_end IS NULL')
        stats['active_sessions'] = cursor.fetchone()[0]

        conn.close()
        return stats

    # =============== МЕТОДЫ СЕГМЕНТАЦИИ ПОЛЬЗОВАТЕЛЕЙ ===============

    def get_user_segment(self, tg_user_id: int) -> dict:
        """Определить сегмент пользователя на основе его действий"""
        analytics = self.get_user_analytics(tg_user_id)

        segment = {
            'segment': 'newcomer',  # newcomer, engaged, converter, loyal
            'engagement_level': 'low',  # low, medium, high
            'conversion_potential': 'unknown',  # low, medium, high, converted
            'content_preference': [],  # список предпочитаемых типов контента
            'behavior_patterns': [],  # паттерны поведения
            'last_activity': analytics.get('last_session'),
            'total_sessions': analytics.get('total_sessions', 0),
            'diagnostics_completed': analytics.get('diagnostics_completed', False)
        }

        # Логика сегментации
        sessions = analytics.get('total_sessions', 0)
        events = analytics.get('total_events', 0)
        has_diagnostic = analytics.get('diagnostics_completed', False)

        # Определение уровня вовлеченности
        if sessions >= 10 and events >= 50:
            segment['engagement_level'] = 'high'
            segment['segment'] = 'loyal'
        elif sessions >= 3 and events >= 15:
            segment['engagement_level'] = 'medium'
            segment['segment'] = 'engaged'
        elif sessions >= 1:
            segment['engagement_level'] = 'low'
            if has_diagnostic:
                segment['segment'] = 'converter'

        # Определение потенциала конверсии
        if has_diagnostic:
            segment['conversion_potential'] = 'converted'
        elif events >= 10 and sessions >= 2:
            segment['conversion_potential'] = 'high'
        elif events >= 5:
            segment['conversion_potential'] = 'medium'
        else:
            segment['conversion_potential'] = 'low'

        # Анализ предпочтений контента
        content_prefs = self._analyze_content_preferences(tg_user_id)
        segment['content_preference'] = content_prefs

        # Анализ паттернов поведения
        patterns = self._analyze_behavior_patterns(tg_user_id)
        segment['behavior_patterns'] = patterns

        return segment

    def _analyze_content_preferences(self, tg_user_id: int) -> list:
        """Анализ предпочтений контента пользователя"""
        conn = self.get_connection()
        cursor = conn.cursor()

        preferences = []

        try:
            # Анализ просмотров контента
            cursor.execute('''
                SELECT content_type, COUNT(*) as views
                FROM content_views
                WHERE tg_user_id = ?
                GROUP BY content_type
                ORDER BY views DESC
                LIMIT 3
            ''', (tg_user_id,))

            content_types = [row[0] for row in cursor.fetchall()]
            if content_types:
                preferences.extend([f"likes_{ctype}" for ctype in content_types])

            # Анализ AI взаимодействий
            cursor.execute('''
                SELECT conversation_type, COUNT(*) as interactions
                FROM ai_interactions
                WHERE tg_user_id = ?
                GROUP BY conversation_type
                ORDER BY interactions DESC
                LIMIT 2
            ''', (tg_user_id,))

            ai_types = [row[0] for row in cursor.fetchall()]
            if ai_types:
                preferences.extend([f"ai_{ai_type}" for ai_type in ai_types])

        except Exception as e:
            logger.error(f"Ошибка при анализе предпочтений контента: {e}")
        finally:
            conn.close()

        return preferences

    def _analyze_behavior_patterns(self, tg_user_id: int) -> list:
        """Анализ паттернов поведения пользователя"""
        conn = self.get_connection()
        cursor = conn.cursor()

        patterns = []

        try:
            # Анализ источников трафика
            cursor.execute('''
                SELECT custom_data
                FROM site_events
                WHERE tg_user_id = ? AND event_type = 'visit' AND event_name = 'source_visit'
                ORDER BY created_at DESC
                LIMIT 5
            ''', (tg_user_id,))

            sources = []
            for row in cursor.fetchall():
                try:
                    data = json.loads(row[0])
                    source = data.get('source')
                    if source:
                        sources.append(source)
                except:
                    pass

            if sources:
                # Определяем основной источник
                main_source = max(set(sources), key=sources.count)
                patterns.append(f"source_{main_source}")

            # Анализ времени активности
            cursor.execute('''
                SELECT strftime('%H', created_at) as hour, COUNT(*) as events
                FROM site_events
                WHERE tg_user_id = ?
                GROUP BY hour
                ORDER BY events DESC
                LIMIT 1
            ''', (tg_user_id,))

            time_pattern = cursor.fetchone()
            if time_pattern:
                hour = int(time_pattern[0])
                if 6 <= hour <= 12:
                    patterns.append("active_morning")
                elif 12 <= hour <= 18:
                    patterns.append("active_afternoon")
                elif 18 <= hour <= 22:
                    patterns.append("active_evening")
                else:
                    patterns.append("active_night")

            # Анализ частоты сессий
            cursor.execute('''
                SELECT COUNT(*) as sessions,
                       julianday('now') - julianday(MIN(session_start)) as days_active
                FROM site_sessions
                WHERE tg_user_id = ? AND session_start IS NOT NULL
            ''', (tg_user_id,))

            frequency_data = cursor.fetchone()
            if frequency_data and frequency_data[1] > 0:
                sessions = frequency_data[0]
                days = frequency_data[1]
                session_frequency = sessions / days

                if session_frequency >= 1:
                    patterns.append("frequent_visitor")
                elif session_frequency >= 0.3:
                    patterns.append("regular_visitor")
                else:
                    patterns.append("occasional_visitor")

        except Exception as e:
            logger.error(f"Ошибка при анализе паттернов поведения: {e}")
        finally:
            conn.close()

        return patterns

    def get_segment_users(self, segment_criteria: dict) -> List[int]:
        """Получить пользователей по критериям сегмента"""
        conn = self.get_connection()
        cursor = conn.cursor()

        users = []

        try:
            # Базовый запрос для получения всех пользователей с аналитикой
            cursor.execute('''
                SELECT DISTINCT u.user_id
                FROM users u
                LEFT JOIN site_sessions ss ON u.user_id = ss.tg_user_id
                LEFT JOIN site_events se ON u.user_id = se.tg_user_id
                LEFT JOIN diagnostics_results dr ON u.user_id = dr.tg_user_id
                GROUP BY u.user_id
            ''')

            all_users = [row[0] for row in cursor.fetchall()]

            # Фильтруем пользователей по критериям
            for user_id in all_users:
                user_segment = self.get_user_segment(user_id)

                # Проверяем соответствие критериям
                matches = True
                for key, value in segment_criteria.items():
                    if key not in user_segment or user_segment[key] != value:
                        matches = False
                        break

                if matches:
                    users.append(user_id)

        except Exception as e:
            logger.error(f"Ошибка при получении сегмента пользователей: {e}")
        finally:
            conn.close()

        return users

    def get_conversion_funnel(self, start_date: str = None, end_date: str = None) -> dict:
        """Получить данные воронки конверсии"""
        conn = self.get_connection()
        cursor = conn.cursor()

        funnel = {
            'visitors': 0,  # Уникальные посетители
            'engaged': 0,   # Вовлеченные (более 1 сессии или 5+ событий)
            'diagnosed': 0, # Прошли диагностику
            'converted': 0  # Конвертированные (CTA клики)
        }

        try:
            date_filter = ""
            params = []
            if start_date and end_date:
                date_filter = "AND created_at BETWEEN ? AND ?"
                params = [start_date, end_date]

            # Уникальные посетители
            cursor.execute(f'''
                SELECT COUNT(DISTINCT tg_user_id)
                FROM site_sessions
                WHERE tg_user_id IS NOT NULL {date_filter}
            ''', params)
            funnel['visitors'] = cursor.fetchone()[0]

            # Вовлеченные пользователи
            cursor.execute(f'''
                SELECT COUNT(DISTINCT tg_user_id)
                FROM (
                    SELECT tg_user_id
                    FROM site_sessions
                    WHERE tg_user_id IS NOT NULL {date_filter}
                    GROUP BY tg_user_id
                    HAVING COUNT(*) > 1
                    UNION
                    SELECT tg_user_id
                    FROM site_events
                    WHERE tg_user_id IS NOT NULL {date_filter}
                    GROUP BY tg_user_id
                    HAVING COUNT(*) >= 5
                )
            ''', params * 2)
            funnel['engaged'] = cursor.fetchone()[0]

            # Прошли диагностику
            cursor.execute(f'''
                SELECT COUNT(DISTINCT tg_user_id)
                FROM diagnostics_results
                WHERE tg_user_id IS NOT NULL
                AND completed_at BETWEEN ? AND ?
            ''', [start_date or '2020-01-01', end_date or '2030-01-01'])
            funnel['diagnosed'] = cursor.fetchone()[0]

            # Конвертированные (CTA клики)
            cursor.execute(f'''
                SELECT COUNT(DISTINCT tg_user_id)
                FROM cta_clicks
                WHERE tg_user_id IS NOT NULL {date_filter}
            ''', params)
            funnel['converted'] = cursor.fetchone()[0]

        except Exception as e:
            logger.error(f"Ошибка при получении воронки конверсии: {e}")
        finally:
            conn.close()

        return funnel
