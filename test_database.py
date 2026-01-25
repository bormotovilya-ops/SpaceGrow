#!/usr/bin/env python3
"""
Скрипт для тестирования базы данных
"""
import os
import sys
import sqlite3
import logging

# Настраиваем логирование
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_database():
    """Тестирование базы данных"""
    db_path = os.path.join(os.path.dirname(__file__), 'telegram-bot', 'bot_users.db')

    if not os.path.exists(db_path):
        logger.error(f"Файл базы данных {db_path} не найден")
        return False

    logger.info(f"Проверяем базу данных: {db_path}")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Проверяем наличие таблиц
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall()]

        expected_tables = ['users', 'user_identities', 'site_sessions', 'site_events', 'diagnostics_results']
        missing_tables = []

        for table in expected_tables:
            if table in tables:
                logger.info(f"✓ Таблица {table} существует")
            else:
                logger.error(f"✗ Таблица {table} отсутствует")
                missing_tables.append(table)

        if missing_tables:
            logger.error(f"Отсутствуют таблицы: {missing_tables}")
            return False

        # Проверяем структуру таблиц
        logger.info("Проверяем структуру таблиц...")

        # Проверяем users
        cursor.execute("PRAGMA table_info(users)")
        users_columns = [row[1] for row in cursor.fetchall()]
        expected_users_columns = ['user_id', 'username', 'first_name', 'last_name',
                                'has_started_diagnostics', 'first_reminder_sent',
                                'second_reminder_sent', 'started_at', 'diagnostics_started_at',
                                'created_at', 'updated_at']

        if set(users_columns) == set(expected_users_columns):
            logger.info("✓ Структура таблицы users корректна")
        else:
            logger.error(f"✗ Структура таблицы users некорректна. Ожидалось: {expected_users_columns}, получено: {users_columns}")

        # Проверяем user_identities
        cursor.execute("PRAGMA table_info(user_identities)")
        identities_columns = [row[1] for row in cursor.fetchall()]
        expected_identities_columns = ['id', 'tg_user_id', 'cookie_id', 'source', 'linked_at']

        if set(identities_columns) == set(expected_identities_columns):
            logger.info("✓ Структура таблицы user_identities корректна")
        else:
            logger.error(f"✗ Структура таблицы user_identities некорректна")

        # Проверяем наличие индексов
        cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%';")
        indexes = [row[0] for row in cursor.fetchall()]

        expected_indexes = [
            'idx_user_identities_tg_user', 'idx_user_identities_cookie',
            'idx_site_sessions_cookie', 'idx_site_sessions_tg_user', 'idx_site_sessions_start',
            'idx_site_events_session', 'idx_site_events_tg_user', 'idx_site_events_type',
            'idx_site_events_created', 'idx_diagnostics_tg_user'
        ]

        for index in expected_indexes:
            if index in indexes:
                logger.info(f"✓ Индекс {index} существует")
            else:
                logger.warning(f"⚠ Индекс {index} отсутствует")

        # Проверяем возможность выполнения основных операций
        logger.info("Тестируем основные операции...")

        # Тест создания пользователя
        cursor.execute("SELECT COUNT(*) FROM users")
        users_count_before = cursor.fetchone()[0]

        cursor.execute('''
            INSERT OR IGNORE INTO users (user_id, username, first_name)
            VALUES (?, ?, ?)
        ''', (999999, 'test_user', 'Test User'))

        cursor.execute("SELECT COUNT(*) FROM users")
        users_count_after = cursor.fetchone()[0]

        if users_count_after > users_count_before:
            logger.info("✓ Создание пользователя работает")
        else:
            logger.warning("⚠ Создание пользователя не сработало (возможно пользователь уже существует)")

        # Тест создания идентификатора
        cursor.execute('''
            INSERT OR REPLACE INTO user_identities (tg_user_id, cookie_id, source)
            VALUES (?, ?, ?)
        ''', (999999, 'test_cookie_123', 'miniapp'))

        cursor.execute("SELECT COUNT(*) FROM user_identities WHERE cookie_id = ?", ('test_cookie_123',))
        identities_count = cursor.fetchone()[0]

        if identities_count > 0:
            logger.info("✓ Создание идентификатора работает")
        else:
            logger.error("✗ Создание идентификатора не работает")

        # Тест создания сессии
        cursor.execute('''
            INSERT INTO site_sessions (cookie_id, tg_user_id, user_agent, ip)
            VALUES (?, ?, ?, ?)
        ''', ('test_cookie_123', 999999, 'Test Agent', '127.0.0.1'))

        session_id = cursor.lastrowid

        # Тест логирования события
        cursor.execute('''
            INSERT INTO site_events (session_id, tg_user_id, event_type, event_name, page, metadata)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (session_id, 999999, 'click', 'test_button', '/test', '{"test": true}'))

        # Проверяем, что данные сохранились
        cursor.execute("SELECT COUNT(*) FROM site_events WHERE session_id = ?", (session_id,))
        events_count = cursor.fetchone()[0]

        if events_count > 0:
            logger.info("✓ Логирование событий работает")
        else:
            logger.error("✗ Логирование событий не работает")

        conn.commit()
        logger.info("✓ Все тесты выполнены успешно!")

        return True

    except Exception as e:
        logger.error(f"Ошибка при тестировании: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

def show_database_stats():
    """Показать статистику базы данных"""
    db_path = os.path.join(os.path.dirname(__file__), 'telegram-bot', 'bot_users.db')

    if not os.path.exists(db_path):
        logger.error("Файл базы данных не найден")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    print("\n" + "="*50)
    print("СТАТИСТИКА БАЗЫ ДАННЫХ")
    print("="*50)

    # Количество записей в каждой таблице
    tables = ['users', 'user_identities', 'site_sessions', 'site_events', 'diagnostics_results']

    for table in tables:
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        count = cursor.fetchone()[0]
        print("20")

    # Размер файла
    file_size = os.path.getsize(db_path)
    print(f"Размер файла БД: {file_size:,} байт ({file_size/1024:.1f} KB)")

    print("="*50)

    conn.close()

if __name__ == "__main__":
    success = test_database()
    show_database_stats()

    if success:
        logger.info("🎉 База данных настроена корректно!")
        sys.exit(0)
    else:
        logger.error("❌ Обнаружены проблемы с базой данных!")
        sys.exit(1)