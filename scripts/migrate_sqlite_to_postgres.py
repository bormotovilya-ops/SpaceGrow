#!/usr/bin/env python3
"""
Простой скрипт для миграции данных из локального sqlite (bot_users.db) в Postgres (DATABASE_URL).
Использует SQLAlchemy для подключения к Postgres. Схема создается простыми запросами INSERT/SELECT.

Usage:
  python scripts/migrate_sqlite_to_postgres.py --sqlite ./telegram-bot/bot_users.db --pg $DATABASE_URL

ВНИМАНИЕ: Скрипт не пытается полностью воспроизвести сложную схему миграций, он переносит данные из основных таблиц.
"""
import argparse
import sqlite3
import json
import psycopg
from psycopg import sql


def migrate(sqlite_path, pg_url):
    sconn = sqlite3.connect(sqlite_path)
    sconn.row_factory = sqlite3.Row
    scur = sconn.cursor()

    # Подключаемся к Postgres через psycopg (v3)
    with psycopg.connect(pg_url) as conn:
        with conn.cursor() as cur:
            # Предполагаем, что таблицы уже созданы в Postgres (рекомендую применить миграции вручную)
            # Перенос users
            scur.execute('SELECT * FROM users')
            rows = scur.fetchall()
            for r in rows:
                data = dict(r)
                # Преобразуем значения, чтобы соответствовать placeholders
                cur.execute(sql.SQL('''
                    INSERT INTO users (user_id, username, first_name, last_name, has_started_diagnostics,
                                       first_reminder_sent, second_reminder_sent, started_at, diagnostics_started_at,
                                       created_at, updated_at)
                    VALUES (%(user_id)s, %(username)s, %(first_name)s, %(last_name)s, %(has_started_diagnostics)s,
                            %(first_reminder_sent)s, %(second_reminder_sent)s, %(started_at)s, %(diagnostics_started_at)s,
                            %(created_at)s, %(updated_at)s)
                    ON CONFLICT (user_id) DO NOTHING
                '''), data)

            # Перенос user_identities
            scur.execute('SELECT * FROM user_identities')
            rows = scur.fetchall()
            for r in rows:
                data = dict(r)
                cur.execute(sql.SQL('''
                    INSERT INTO user_identities (id, tg_user_id, cookie_id, source, linked_at, miniapp_id)
                    VALUES (%(id)s, %(tg_user_id)s, %(cookie_id)s, %(source)s, %(linked_at)s, %(miniapp_id)s)
                    ON CONFLICT (id) DO NOTHING
                '''), data)

            # Перенос site_sessions
            scur.execute('SELECT * FROM site_sessions')
            rows = scur.fetchall()
            for r in rows:
                data = dict(r)
                cur.execute(sql.SQL('''
                    INSERT INTO site_sessions (id, cookie_id, tg_user_id, session_start, session_end, user_agent, ip,
                                               source, utm_params, utm_source, utm_medium, utm_campaign, utm_term,
                                               utm_content, referrer, device_type, device_model, browser, os,
                                               screen_resolution, geo_country, geo_city, geo_region, page_id,
                                               entry_page, exit_page, session_duration, page_views, events_count)
                    VALUES (%(id)s, %(cookie_id)s, %(tg_user_id)s, %(session_start)s, %(session_end)s, %(user_agent)s, %(ip)s,
                            %(source)s, %(utm_params)s, %(utm_source)s, %(utm_medium)s, %(utm_campaign)s, %(utm_term)s,
                            %(utm_content)s, %(referrer)s, %(device_type)s, %(device_model)s, %(browser)s, %(os)s,
                            %(screen_resolution)s, %(geo_country)s, %(geo_city)s, %(geo_region)s, %(page_id)s,
                            %(entry_page)s, %(exit_page)s, %(session_duration)s, %(page_views)s, %(events_count)s)
                    ON CONFLICT (id) DO NOTHING
                '''), data)

            # Перенос site_events (большие таблицы могут требовать батчевой загрузки)
            scur.execute('SELECT * FROM site_events')
            rows = scur.fetchall()
            for r in rows:
                data = dict(r)
                cur.execute(sql.SQL('''
                    INSERT INTO site_events (id, session_id, tg_user_id, event_type, event_name, page, metadata,
                                             created_at, event_category, event_subtype, element_id, element_type,
                                             section, scroll_depth, time_spent, interaction_count, previous_event_id,
                                             step_number, completion_rate, error_message, custom_data)
                    VALUES (%(id)s, %(session_id)s, %(tg_user_id)s, %(event_type)s, %(event_name)s, %(page)s, %(metadata)s,
                            %(created_at)s, %(event_category)s, %(event_subtype)s, %(element_id)s, %(element_type)s,
                            %(section)s, %(scroll_depth)s, %(time_spent)s, %(interaction_count)s, %(previous_event_id)s,
                            %(step_number)s, %(completion_rate)s, %(error_message)s, %(custom_data)s)
                    ON CONFLICT (id) DO NOTHING
                '''), data)

            conn.commit()

    sconn.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--sqlite', required=True, help='Path to sqlite db')
    parser.add_argument('--pg', required=True, help='Postgres DATABASE_URL')
    args = parser.parse_args()

    migrate(args.sqlite, args.pg)
