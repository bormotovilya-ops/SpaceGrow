import sqlite3
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_base_tables():
    """Создать базовую таблицу users перед миграциями"""
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

if __name__ == "__main__":
    init_base_tables()