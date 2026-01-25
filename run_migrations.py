#!/usr/bin/env python3
"""
Скрипт для запуска миграций базы данных
"""
import os
import sys
import logging

# Настраиваем логирование
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def main():
    """Главная функция"""
    # Переходим в директорию telegram-bot
    telegram_bot_dir = os.path.join(os.path.dirname(__file__), 'telegram-bot')

    if not os.path.exists(telegram_bot_dir):
        logger.error(f"Директория {telegram_bot_dir} не найдена")
        sys.exit(1)

    os.chdir(telegram_bot_dir)
    logger.info(f"Перешли в директорию: {os.getcwd()}")

    # Добавляем текущую директорию в sys.path для импорта migrations
    sys.path.insert(0, os.getcwd())

    # Создаем базовую таблицу users
    import sqlite3

    logger.info("Создаем базовую таблицу users...")
    conn = sqlite3.connect('bot_users.db')
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
    logger.info('Базовая таблица users создана')

    # Запускаем миграции
    logger.info("Запускаем миграции...")
    try:
        from migrations import run_database_migrations
        run_database_migrations()
        logger.info("Миграции выполнены успешно!")
    except Exception as e:
        logger.error(f"Ошибка при выполнении миграций: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()