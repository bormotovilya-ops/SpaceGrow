import sqlite3
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class DatabaseMigrations:
    """Класс для управления миграциями базы данных"""

    def __init__(self, db_path: str = "bot_users.db"):
        self.db_path = db_path

    def get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def run_migrations(self):
        """Запустить все миграции"""
        logger.info("Запуск миграций базы данных...")

        # Миграция 1: Создание таблицы идентификации пользователей
        self.create_user_identities_table()

        # Миграция 2: Создание таблицы сессий сайта
        self.create_site_sessions_table()

        # Миграция 3: Создание таблицы событий
        self.create_site_events_table()

        # Миграция 4: Создание таблицы результатов диагностики
        self.create_diagnostics_results_table()

        # Миграция 5: Обновление схемы для расширенного логирования
        self.update_schema_for_advanced_logging()

        # Миграция 6: Миграция существующих данных
        self.migrate_existing_data()

        # Миграция 7: Добавление индексов для производительности
        self.create_indexes()

        # Миграция 8: Добавление поля diagnostics_completed_at
        self.add_diagnostics_completed_at_column()

        logger.info("Все миграции выполнены успешно!")

    def create_user_identities_table(self):
        """Таблица связей различных идентификаторов пользователя"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_identities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tg_user_id INTEGER,  -- Ссылка на users.user_id
                cookie_id TEXT,      -- Cookie ID с сайта
                source TEXT CHECK(source IN ('telegram', 'site', 'miniapp')) NOT NULL,
                linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                -- Ограничения
                FOREIGN KEY (tg_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                UNIQUE(tg_user_id, cookie_id)  -- Один пользователь не может иметь дублирующие связи
            )
        ''')

        # Добавляем комментарий к таблице (SQLite поддерживает это начиная с 3.38.0)
        try:
            cursor.execute('''
                COMMENT ON TABLE user_identities IS
                'Таблица связей идентификаторов пользователя из разных источников (Telegram, сайт, MiniApp)'
            ''')
        except sqlite3.OperationalError:
            pass  # Игнорируем если версия SQLite не поддерживает

        conn.commit()
        conn.close()
        logger.info("Таблица user_identities создана")

    def create_site_sessions_table(self):
        """Таблица сессий сайта"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS site_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cookie_id TEXT NOT NULL,
                tg_user_id INTEGER,  -- Может быть NULL если пользователь не из Telegram
                session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                session_end TIMESTAMP,
                user_agent TEXT,
                ip TEXT,

                -- Ограничения
                FOREIGN KEY (tg_user_id) REFERENCES users(user_id) ON DELETE SET NULL
            )
        ''')

        conn.commit()
        conn.close()
        logger.info("Таблица site_sessions создана")

    def create_site_events_table(self):
        """Таблица событий пользователя для аналитики"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS site_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER NOT NULL,
                tg_user_id INTEGER,  -- Может быть NULL
                event_type TEXT NOT NULL,  -- click, scroll, page_view, cta_click, etc.
                event_name TEXT NOT NULL,  -- конкретное название события
                page TEXT,                 -- страница где произошло событие
                metadata TEXT,             -- JSON с дополнительными данными
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                -- Ограничения
                FOREIGN KEY (session_id) REFERENCES site_sessions(id) ON DELETE CASCADE,
                FOREIGN KEY (tg_user_id) REFERENCES users(user_id) ON DELETE SET NULL
            )
        ''')

        conn.commit()
        conn.close()
        logger.info("Таблица site_events создана")

    def create_diagnostics_results_table(self):
        """Таблица результатов диагностики"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS diagnostics_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tg_user_id INTEGER NOT NULL,
                cookie_id TEXT,
                result_json TEXT NOT NULL,  -- JSON с результатами диагностики
                completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                -- Ограничения
                FOREIGN KEY (tg_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                UNIQUE(tg_user_id, cookie_id)  -- Один пользователь - одни результаты
            )
        ''')

        conn.commit()
        conn.close()
        logger.info("Таблица diagnostics_results создана")

    def update_schema_for_advanced_logging(self):
        """Обновление схемы для расширенного логирования пользовательских действий"""
        conn = self.get_connection()
        cursor = conn.cursor()

        try:
            # Обновляем таблицу site_sessions - добавляем новые поля
            cursor.execute("PRAGMA table_info(site_sessions)")
            columns = [row[1] for row in cursor.fetchall()]

            new_columns = {
                'source': 'TEXT',  # Источник посещения (telegram, vk, direct, search, landing)
                'utm_params': 'TEXT',  # JSON с UTM параметрами
                'utm_source': 'TEXT',
                'utm_medium': 'TEXT',
                'utm_campaign': 'TEXT',
                'utm_term': 'TEXT',
                'utm_content': 'TEXT',
                'referrer': 'TEXT',  # HTTP referrer
                'device_type': 'TEXT',  # desktop, mobile, tablet
                'device_model': 'TEXT',
                'browser': 'TEXT',
                'os': 'TEXT',
                'screen_resolution': 'TEXT',
                'geo_country': 'TEXT',
                'geo_city': 'TEXT',
                'geo_region': 'TEXT',
                'page_id': 'TEXT',  # ID страницы MiniApp
                'entry_page': 'TEXT',  # Первая страница сессии
                'exit_page': 'TEXT',  # Последняя страница сессии
                'session_duration': 'INTEGER',  # Длительность в секундах
                'page_views': 'INTEGER DEFAULT 0',  # Количество просмотров страниц
                'events_count': 'INTEGER DEFAULT 0'  # Количество событий в сессии
            }

            for col_name, col_type in new_columns.items():
                if col_name not in columns:
                    try:
                        cursor.execute(f'ALTER TABLE site_sessions ADD COLUMN {col_name} {col_type}')
                        logger.info(f"Добавлена колонка {col_name} в site_sessions")
                    except sqlite3.OperationalError as e:
                        logger.warning(f"Не удалось добавить колонку {col_name}: {e}")

            # Обновляем таблицу site_events - добавляем новые поля
            cursor.execute("PRAGMA table_info(site_events)")
            event_columns = [row[1] for row in cursor.fetchall()]

            new_event_columns = {
                'event_category': 'TEXT',  # Категория события (navigation, interaction, conversion, etc.)
                'event_subtype': 'TEXT',  # Подтип события
                'element_id': 'TEXT',  # ID элемента на странице
                'element_type': 'TEXT',  # Тип элемента (button, link, form, etc.)
                'section': 'TEXT',  # Секция страницы
                'scroll_depth': 'INTEGER',  # Глубина прокрутки в %
                'time_spent': 'INTEGER',  # Время на странице/элементе в секундах
                'interaction_count': 'INTEGER',  # Количество взаимодействий
                'previous_event_id': 'INTEGER',  # ID предыдущего события
                'step_number': 'INTEGER',  # Номер шага (для последовательных действий)
                'completion_rate': 'REAL',  # Процент завершения (0-100)
                'error_message': 'TEXT',  # Сообщение об ошибке если есть
                'custom_data': 'TEXT'  # Дополнительные кастомные данные в JSON
            }

            for col_name, col_type in new_event_columns.items():
                if col_name not in event_columns:
                    try:
                        cursor.execute(f'ALTER TABLE site_events ADD COLUMN {col_name} {col_type}')
                        logger.info(f"Добавлена колонка {col_name} в site_events")
                    except sqlite3.OperationalError as e:
                        logger.warning(f"Не удалось добавить колонку {col_name}: {e}")

            # Обновляем таблицу user_identities - добавляем miniapp_id
            cursor.execute("PRAGMA table_info(user_identities)")
            identity_columns = [row[1] for row in cursor.fetchall()]

            if 'miniapp_id' not in identity_columns:
                try:
                    cursor.execute('ALTER TABLE user_identities ADD COLUMN miniapp_id TEXT')
                    logger.info("Добавлена колонка miniapp_id в user_identities")
                except sqlite3.OperationalError as e:
                    logger.warning(f"Не удалось добавить колонку miniapp_id: {e}")

            # Создаем таблицу для AI взаимодействий
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS ai_interactions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id INTEGER NOT NULL,
                    tg_user_id INTEGER,
                    cookie_id TEXT,
                    messages_count INTEGER DEFAULT 0,
                    topics TEXT,  -- JSON array of topics/tags
                    interaction_duration INTEGER,  -- в секундах
                    conversation_type TEXT,  -- 'expert', 'general', 'diagnostic'
                    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    ended_at TIMESTAMP,

                    FOREIGN KEY (session_id) REFERENCES site_sessions(id) ON DELETE CASCADE,
                    FOREIGN KEY (tg_user_id) REFERENCES users(user_id) ON DELETE SET NULL
                )
            ''')

            # Создаем таблицу для CTA кликов
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS cta_clicks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id INTEGER NOT NULL,
                    tg_user_id INTEGER,
                    cookie_id TEXT,
                    cta_type TEXT NOT NULL,  -- 'call', 'telegram', 'whatsapp', 'email', etc.
                    cta_text TEXT,  -- Текст кнопки
                    cta_location TEXT,  -- Где расположена кнопка (header, footer, content, etc.)
                    previous_step TEXT,  -- Предыдущий шаг пользователя
                    step_duration INTEGER,  -- Время от предыдущего шага в секундах
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                    FOREIGN KEY (session_id) REFERENCES site_sessions(id) ON DELETE CASCADE,
                    FOREIGN KEY (tg_user_id) REFERENCES users(user_id) ON DELETE SET NULL
                )
            ''')

            # Создаем таблицу для просмотров контента
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS content_views (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id INTEGER NOT NULL,
                    tg_user_id INTEGER,
                    cookie_id TEXT,
                    content_type TEXT NOT NULL,  -- 'section', 'article', 'video', 'pdf'
                    content_id TEXT NOT NULL,  -- ID контента
                    content_title TEXT,
                    section TEXT,  -- Раздел сайта
                    time_spent INTEGER,  -- Время просмотра в секундах
                    scroll_depth INTEGER,  -- Глубина прокрутки в %
                    completion_rate REAL,  -- Процент прочтения/просмотра
                    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                    FOREIGN KEY (session_id) REFERENCES site_sessions(id) ON DELETE CASCADE,
                    FOREIGN KEY (tg_user_id) REFERENCES users(user_id) ON DELETE SET NULL
                )
            ''')

            # Создаем таблицу для игровых действий
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS game_actions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id INTEGER NOT NULL,
                    tg_user_id INTEGER,
                    cookie_id TEXT,
                    game_type TEXT NOT NULL,  -- 'calculator', 'quiz', 'assessment'
                    action_type TEXT NOT NULL,  -- 'start', 'complete', 'achievement', 'fail'
                    action_data TEXT,  -- JSON с данными действия
                    score INTEGER,
                    achievement TEXT,
                    duration INTEGER,  -- Время действия в секундах
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                    FOREIGN KEY (session_id) REFERENCES site_sessions(id) ON DELETE CASCADE,
                    FOREIGN KEY (tg_user_id) REFERENCES users(user_id) ON DELETE SET NULL
                )
            ''')

            conn.commit()
            logger.info("Расширенная схема для логирования создана")

        except Exception as e:
            logger.error(f"Ошибка при обновлении схемы: {e}")
            conn.rollback()
        finally:
            conn.close()

    def migrate_existing_data(self):
        """Миграция существующих данных из users в новые таблицы"""
        conn = self.get_connection()
        cursor = conn.cursor()

        try:
            # Проверяем есть ли уже данные в user_identities
            cursor.execute("SELECT COUNT(*) FROM user_identities")
            if cursor.fetchone()[0] == 0:
                # Миграция существующих пользователей в user_identities
                cursor.execute('''
                    INSERT INTO user_identities (tg_user_id, source, linked_at)
                    SELECT user_id, 'telegram', created_at
                    FROM users
                    WHERE user_id IS NOT NULL
                ''')
                logger.info(f"Мигрировано {cursor.rowcount} пользователей в user_identities")

            # Проверяем есть ли данные в diagnostics_results
            cursor.execute("SELECT COUNT(*) FROM diagnostics_results")
            if cursor.fetchone()[0] == 0:
                # Миграция существующих результатов диагностики
                cursor.execute('''
                    INSERT INTO diagnostics_results (tg_user_id, result_json, completed_at)
                    SELECT
                        user_id,
                        '{"migrated": true, "has_started_diagnostics": ' || has_started_diagnostics || '}',
                        diagnostics_started_at
                    FROM users
                    WHERE has_started_diagnostics = 1 AND diagnostics_started_at IS NOT NULL
                ''')
                logger.info(f"Мигрировано {cursor.rowcount} результатов диагностики")

            conn.commit()
            logger.info("Миграция данных завершена")

        except Exception as e:
            logger.error(f"Ошибка при миграции данных: {e}")
            conn.rollback()
        finally:
            conn.close()

    def create_indexes(self):
        """Создание индексов для производительности"""
        conn = self.get_connection()
        cursor = conn.cursor()

        indexes = [
            # Индексы для user_identities
            "CREATE INDEX IF NOT EXISTS idx_user_identities_tg_user ON user_identities(tg_user_id)",
            "CREATE INDEX IF NOT EXISTS idx_user_identities_cookie ON user_identities(cookie_id)",
            "CREATE INDEX IF NOT EXISTS idx_user_identities_miniapp ON user_identities(miniapp_id)",

            # Индексы для site_sessions
            "CREATE INDEX IF NOT EXISTS idx_site_sessions_cookie ON site_sessions(cookie_id)",
            "CREATE INDEX IF NOT EXISTS idx_site_sessions_tg_user ON site_sessions(tg_user_id)",
            "CREATE INDEX IF NOT EXISTS idx_site_sessions_start ON site_sessions(session_start)",
            "CREATE INDEX IF NOT EXISTS idx_site_sessions_source ON site_sessions(source)",
            "CREATE INDEX IF NOT EXISTS idx_site_sessions_device ON site_sessions(device_type)",

            # Индексы для site_events
            "CREATE INDEX IF NOT EXISTS idx_site_events_session ON site_events(session_id)",
            "CREATE INDEX IF NOT EXISTS idx_site_events_tg_user ON site_events(tg_user_id)",
            "CREATE INDEX IF NOT EXISTS idx_site_events_type ON site_events(event_type)",
            "CREATE INDEX IF NOT EXISTS idx_site_events_category ON site_events(event_category)",
            "CREATE INDEX IF NOT EXISTS idx_site_events_created ON site_events(created_at)",

            # Индексы для диагностики
            "CREATE INDEX IF NOT EXISTS idx_diagnostics_tg_user ON diagnostics_results(tg_user_id)",
            "CREATE INDEX IF NOT EXISTS idx_diagnostics_cookie ON diagnostics_results(cookie_id)",

            # Индексы для AI взаимодействий
            "CREATE INDEX IF NOT EXISTS idx_ai_session ON ai_interactions(session_id)",
            "CREATE INDEX IF NOT EXISTS idx_ai_tg_user ON ai_interactions(tg_user_id)",
            "CREATE INDEX IF NOT EXISTS idx_ai_type ON ai_interactions(conversation_type)",

            # Индексы для CTA кликов
            "CREATE INDEX IF NOT EXISTS idx_cta_session ON cta_clicks(session_id)",
            "CREATE INDEX IF NOT EXISTS idx_cta_tg_user ON cta_clicks(tg_user_id)",
            "CREATE INDEX IF NOT EXISTS idx_cta_type ON cta_clicks(cta_type)",

            # Индексы для просмотров контента
            "CREATE INDEX IF NOT EXISTS idx_content_session ON content_views(session_id)",
            "CREATE INDEX IF NOT EXISTS idx_content_tg_user ON content_views(tg_user_id)",
            "CREATE INDEX IF NOT EXISTS idx_content_type ON content_views(content_type)",

            # Индексы для игровых действий
            "CREATE INDEX IF NOT EXISTS idx_game_session ON game_actions(session_id)",
            "CREATE INDEX IF NOT EXISTS idx_game_tg_user ON game_actions(tg_user_id)",
            "CREATE INDEX IF NOT EXISTS idx_game_type ON game_actions(game_type)"
        ]

        for index_sql in indexes:
            try:
                cursor.execute(index_sql)
            except sqlite3.OperationalError as e:
                logger.warning(f"Не удалось создать индекс: {e}")

        conn.commit()
        conn.close()
        logger.info("Индексы созданы")

    def add_diagnostics_completed_at_column(self):
        """Добавление поля diagnostics_completed_at в таблицу users"""
        conn = self.get_connection()
        cursor = conn.cursor()

        try:
            # Проверяем, существует ли уже столбец
            cursor.execute("PRAGMA table_info(users)")
            columns = [column[1] for column in cursor.fetchall()]

            if 'diagnostics_completed_at' not in columns:
                cursor.execute('''
                    ALTER TABLE users ADD COLUMN diagnostics_completed_at TIMESTAMP
                ''')
                conn.commit()
                logger.info("Добавлен столбец diagnostics_completed_at в таблицу users")
            else:
                logger.info("Столбец diagnostics_completed_at уже существует")

        except Exception as e:
            logger.error(f"Ошибка при добавлении столбца diagnostics_completed_at: {e}")

        conn.close()

# Функция для запуска миграций
def run_database_migrations(db_path: str = "bot_users.db"):
    """Запуск всех миграций базы данных"""
    migrator = DatabaseMigrations(db_path)
    migrator.run_migrations()

if __name__ == "__main__":
    # Запуск миграций при выполнении файла напрямую
    run_database_migrations()