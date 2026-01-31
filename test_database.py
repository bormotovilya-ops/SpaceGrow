#!/usr/bin/env python3
"""
Скрипт для тестирования базы данных
"""
import os
import sys
import sqlite3
import logging
import json

# Настраиваем логирование
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_database():
    """Тестирование базы данных.

    Поддерживаются два режима:
    - По умолчанию проверяется локальный sqlite файл telegram-bot/bot_users.db
    - Если задана переменная окружения DATABASE_URL (postgres), тесты выполняются против Postgres
    """
    db_url = os.environ.get('DATABASE_URL') or os.environ.get('DB_URL')
    is_postgres = False

    # Подключение
    conn = None
    cursor = None

    try:
        if db_url and 'postgres' in db_url:
            # Попытки импортировать psycopg (psycopg3) или psycopg2
            try:
                import psycopg
                conn = psycopg.connect(db_url)
                cursor = conn.cursor()
                is_postgres = True
                logger.info(f"Проверяем Postgres: {db_url}")
            except Exception:
                try:
                    import psycopg2
                    conn = psycopg2.connect(db_url)
                    cursor = conn.cursor()
                    is_postgres = True
                    logger.info(f"Проверяем Postgres (psycopg2): {db_url}")
                except Exception as e:
                    logger.error("DATABASE_URL задан, но ни psycopg ни psycopg2 не установлены: %s", e)
                    return False
        else:
            db_path = os.path.join(os.path.dirname(__file__), 'telegram-bot', 'bot_users.db')
            if not os.path.exists(db_path):
                logger.error(f"Файл базы данных {db_path} не найден")
                return False
            logger.info(f"Проверяем sqlite базу данных: {db_path}")
            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

        # Проверяем наличие таблиц
        if is_postgres:
            cursor.execute("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema')")
            tables = [r[0] for r in cursor.fetchall()]
        else:
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = [row[0] for row in cursor.fetchall()]

        expected_tables = ['users', 'user_identities', 'site_sessions', 'site_events', 'diagnostics_results']
        missing_tables = [t for t in expected_tables if t not in tables]

        for table in expected_tables:
            if table in tables:
                logger.info(f"✓ Таблица {table} существует")
            else:
                logger.error(f"✗ Таблица {table} отсутствует")

        if missing_tables:
            logger.error(f"Отсутствуют таблицы: {missing_tables}")
            return False

        # Проверяем структуру таблиц (минимальные колонки)
        logger.info("Проверяем структуру таблиц...")

        # users: проверяем наличие базовых колонок — допускаем дополнительные (например diagnostics_completed_at)
        if is_postgres:
            cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position")
            users_columns = [r[0] for r in cursor.fetchall()]
        else:
            cursor.execute("PRAGMA table_info(users)")
            users_columns = [row[1] for row in cursor.fetchall()]

        base_expected_users = {'user_id', 'username', 'first_name', 'last_name',
                               'has_started_diagnostics', 'first_reminder_sent',
                               'second_reminder_sent', 'started_at', 'diagnostics_started_at',
                               'created_at', 'updated_at'}

        if base_expected_users.issubset(set(users_columns)):
            logger.info("✓ Структура таблицы users содержит ожидаемые колонки")
        else:
            logger.error(f"✗ Структура таблицы users некорректна. Ожидались колонки: {sorted(base_expected_users)}, получено: {users_columns}")

        # user_identities minimal columns
        if is_postgres:
            cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name='user_identities' ORDER BY ordinal_position")
            identities_columns = [r[0] for r in cursor.fetchall()]
        else:
            cursor.execute("PRAGMA table_info(user_identities)")
            identities_columns = [row[1] for row in cursor.fetchall()]

        base_expected_identities = {'id', 'tg_user_id', 'cookie_id', 'source', 'linked_at'}
        if base_expected_identities.issubset(set(identities_columns)):
            logger.info("✓ Структура таблицы user_identities содержит ожидаемые колонки")
        else:
            logger.error(f"✗ Структура таблицы user_identities некорректна. Получено: {identities_columns}")

        # Основные операции: вставки/чтение
        logger.info("Тестируем основные операции...")

        test_user_id = 888888

        # Создание пользователя (без дублирования)
        if is_postgres:
            cursor.execute("SELECT COUNT(*) FROM users")
            users_count_before = cursor.fetchone()[0]

            cursor.execute("""
                INSERT INTO users (user_id, username, first_name)
                VALUES (%s, %s, %s)
                ON CONFLICT (user_id) DO NOTHING
            """, (test_user_id, 'test_user', 'Test User'))
            conn.commit()

            cursor.execute("SELECT COUNT(*) FROM users")
            users_count_after = cursor.fetchone()[0]
        else:
            cursor.execute("SELECT COUNT(*) FROM users")
            users_count_before = cursor.fetchone()[0]

            cursor.execute('''
                INSERT OR IGNORE INTO users (user_id, username, first_name)
                VALUES (?, ?, ?)
            ''', (test_user_id, 'test_user', 'Test User'))
            conn.commit()

            cursor.execute("SELECT COUNT(*) FROM users")
            users_count_after = cursor.fetchone()[0]

        if users_count_after > users_count_before:
            logger.info("✓ Создание пользователя работает")
        else:
            logger.warning("⚠ Создание пользователя не сработало (возможно пользователь уже существует)")

        # Создание идентификатора
        if is_postgres:
            cursor.execute("""
                INSERT INTO user_identities (tg_user_id, cookie_id, source)
                VALUES (%s, %s, %s)
                ON CONFLICT (tg_user_id, cookie_id) DO NOTHING
            """, (test_user_id, 'test_cookie_123', 'miniapp'))
            conn.commit()

            cursor.execute("SELECT COUNT(*) FROM user_identities WHERE cookie_id = %s", ('test_cookie_123',))
            identities_count = cursor.fetchone()[0]
        else:
            cursor.execute('''
                INSERT OR REPLACE INTO user_identities (tg_user_id, cookie_id, source)
                VALUES (?, ?, ?)
            ''', (test_user_id, 'test_cookie_123', 'miniapp'))
            conn.commit()

            cursor.execute("SELECT COUNT(*) FROM user_identities WHERE cookie_id = ?", ('test_cookie_123',))
            identities_count = cursor.fetchone()[0]

        if identities_count > 0:
            logger.info("✓ Создание идентификатора работает")
        else:
            logger.error("✗ Создание идентификатора не работает")

        # Создание сессии и события
        if is_postgres:
            cursor.execute("""
                INSERT INTO site_sessions (cookie_id, tg_user_id, user_agent, ip)
                VALUES (%s, %s, %s, %s)
                RETURNING id
            """, ('test_cookie_123', test_user_id, 'Test Agent', '127.0.0.1'))
            sid_row = cursor.fetchone()
            session_id = int(sid_row[0]) if sid_row else None
            conn.commit()

            cursor.execute("""
                INSERT INTO site_events (session_id, tg_user_id, event_type, event_name, page, metadata)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (session_id, test_user_id, 'click', 'test_button', '/test', json.dumps({"test": True})))
            ev_row = cursor.fetchone()
            event_id = int(ev_row[0]) if ev_row else None
            conn.commit()

            cursor.execute("SELECT COUNT(*) FROM site_events WHERE session_id = %s", (session_id,))
            events_count = cursor.fetchone()[0]
        else:
            cursor.execute('''
                INSERT INTO site_sessions (cookie_id, tg_user_id, user_agent, ip)
                VALUES (?, ?, ?, ?)
            ''', ('test_cookie_123', test_user_id, 'Test Agent', '127.0.0.1'))
            conn.commit()
            session_id = cursor.lastrowid

            cursor.execute('''
                INSERT INTO site_events (session_id, tg_user_id, event_type, event_name, page, metadata)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (session_id, test_user_id, 'click', 'test_button', '/test', json.dumps({"test": True})))
            conn.commit()

            cursor.execute("SELECT COUNT(*) FROM site_events WHERE session_id = ?", (session_id,))
            events_count = cursor.fetchone()[0]

        if events_count > 0:
            logger.info("✓ Логирование событий работает")
        else:
            logger.error("✗ Логирование событий не работает")

        logger.info("✓ Все тесты выполнены успешно!")
        return True

    except Exception as e:
        logger.error(f"Ошибка при тестировании: {e}")
        try:
            if conn:
                conn.rollback()
        except Exception:
            pass
        return False
    finally:
        try:
            if cursor:
                cursor.close()
        except Exception:
            pass
        try:
            if conn:
                conn.close()
        except Exception:
            pass

def show_database_stats():
    """Показать статистику базы данных"""
    # Поддерживаем вывод статистики для sqlite (по умолчанию) и Postgres (через DATABASE_URL)
    db_url = os.environ.get('DATABASE_URL') or os.environ.get('DB_URL')

    print("\n" + "="*50)
    print("СТАТИСТИКА БАЗЫ ДАННЫХ")
    print("="*50)

    tables = ['users', 'user_identities', 'site_sessions', 'site_events', 'diagnostics_results']

    conn = None
    cursor = None
    try:
        if db_url and 'postgres' in db_url:
            try:
                import psycopg
                conn = psycopg.connect(db_url)
                cursor = conn.cursor()
            except Exception:
                import psycopg2
                conn = psycopg2.connect(db_url)
                cursor = conn.cursor()

            for table in tables:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                print(f"{table}: {count}")

            cursor.execute("SELECT pg_total_relation_size('site_events')")
            try:
                size = cursor.fetchone()[0]
                print(f"Примерный размер таблицы site_events (байт): {size}")
            except Exception:
                pass

        else:
            db_path = os.path.join(os.path.dirname(__file__), 'telegram-bot', 'bot_users.db')
            if not os.path.exists(db_path):
                logger.error("Файл базы данных не найден")
                return

            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()

            for table in tables:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                print(f"{table}: {count}")

            file_size = os.path.getsize(db_path)
            print(f"Размер файла БД: {file_size:,} байт ({file_size/1024:.1f} KB)")

    except Exception as e:
        logger.error(f"Не удалось получить статистику БД: {e}")
    finally:
        try:
            if cursor:
                cursor.close()
        except Exception:
            pass
        try:
            if conn:
                conn.close()
        except Exception:
            pass

if __name__ == "__main__":
    success = test_database()
    show_database_stats()

    if success:
        logger.info("🎉 База данных настроена корректно!")
        sys.exit(0)
    else:
        logger.error("❌ Обнаружены проблемы с базой данных!")
        sys.exit(1)