import sqlite3
import logging
from datetime import datetime
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

class Database:
    def __init__(self, db_path: str = "bot_users.db"):
        self.db_path = db_path
        self.init_db()
    
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
