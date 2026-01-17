#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт для просмотра содержимого базы данных бота
"""
import sqlite3
from datetime import datetime
import os
import sys

# Устанавливаем кодировку UTF-8 для вывода
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')

# Определяем путь к базе данных
import os
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(SCRIPT_DIR, "bot_users.db")

def view_database():
    """Показать содержимое базы данных"""
    
    if not os.path.exists(DB_PATH):
        print(f"[X] База данных {DB_PATH} не найдена!")
        print("   Запустите бота хотя бы один раз, чтобы создать БД.")
        return
    
    print(f"[*] Просмотр базы данных: {DB_PATH}\n")
    print("=" * 80)
    
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Получаем всех пользователей
        cursor.execute('''
            SELECT 
                user_id,
                username,
                first_name,
                last_name,
                has_started_diagnostics,
                first_reminder_sent,
                second_reminder_sent,
                started_at,
                diagnostics_started_at,
                created_at,
                updated_at
            FROM users
            ORDER BY created_at DESC
        ''')
        
        users = cursor.fetchall()
        
        if not users:
            print("[ ] База данных пуста. Пользователей нет.")
        else:
            print(f"[+] Найдено пользователей: {len(users)}\n")
            
            for idx, user in enumerate(users, 1):
                print(f"\n{'='*80}")
                print(f"Пользователь #{idx}")
                print(f"{'='*80}")
                print(f"ID: {user['user_id']}")
                print(f"Имя: {user['first_name'] or 'Не указано'}")
                print(f"Фамилия: {user['last_name'] or 'Не указано'}")
                print(f"Username: @{user['username'] or 'Не указан'}")
                print(f"\n[*] Статус:")
                print(f"  - Диагностика начата: {'ДА' if user['has_started_diagnostics'] else 'НЕТ'}")
                print(f"  - Первое напоминание отправлено: {'ДА' if user['first_reminder_sent'] else 'НЕТ'}")
                print(f"  - Второе напоминание отправлено: {'ДА' if user['second_reminder_sent'] else 'НЕТ'}")
                
                print(f"\n[*] Временные метки:")
                if user['started_at']:
                    print(f"  - Начало работы (/start): {user['started_at']}")
                    # Проверяем, прошла ли 1 минута
                    try:
                        from datetime import datetime
                        started = datetime.fromisoformat(user['started_at'].replace('Z', '+00:00').split('.')[0])
                        now = datetime.now()
                        delta = now - started.replace(tzinfo=None)
                        minutes = delta.total_seconds() / 60
                        print(f"    -> Прошло: {minutes:.1f} минут")
                        if minutes >= 1 and not user['has_started_diagnostics'] and not user['first_reminder_sent']:
                            print(f"    [!] ДОЛЖНО БЫТЬ ОТПРАВЛЕНО первое напоминание!")
                    except:
                        pass
                else:
                    print(f"  - Начало работы: НЕ УСТАНОВЛЕНО [!]")
                
                if user['diagnostics_started_at']:
                    print(f"  • Диагностика начата: {user['diagnostics_started_at']}")
                
                print(f"  • Создан: {user['created_at']}")
                print(f"  • Обновлен: {user['updated_at']}")
        
        # Статистика
        print(f"\n{'='*80}")
        print("[*] СТАТИСТИКА")
        print(f"{'='*80}")
        
        cursor.execute('SELECT COUNT(*) as total FROM users')
        total = cursor.fetchone()['total']
        
        cursor.execute('SELECT COUNT(*) as total FROM users WHERE has_started_diagnostics = 1')
        started = cursor.fetchone()['total']
        
        cursor.execute('SELECT COUNT(*) as total FROM users WHERE first_reminder_sent = 1')
        first_sent = cursor.fetchone()['total']
        
        cursor.execute('SELECT COUNT(*) as total FROM users WHERE second_reminder_sent = 1')
        second_sent = cursor.fetchone()['total']
        
        cursor.execute('''
            SELECT COUNT(*) as total 
            FROM users 
            WHERE has_started_diagnostics = 0 
            AND first_reminder_sent = 0
            AND started_at IS NOT NULL
            AND datetime(started_at, '+1 minute') <= datetime('now')
        ''')
        pending_first = cursor.fetchone()['total']
        
        print(f"Всего пользователей: {total}")
        print(f"Начали диагностику: {started}")
        print(f"Первое напоминание отправлено: {first_sent}")
        print(f"Второе напоминание отправлено: {second_sent}")
        print(f"Ожидают первого напоминания (прошла 1+ минута): {pending_first}")
        
        conn.close()
        
    except sqlite3.Error as e:
        print(f"[X] Ошибка при чтении базы данных: {e}")
    except Exception as e:
        print(f"[X] Неожиданная ошибка: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    view_database()
