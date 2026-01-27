#!/usr/bin/env python3
"""
Create Postgres schema compatible with the application's SQLite migrations.

Usage:
  python scripts/create_pg_schema.py --pg postgresql://user:pass@host:5432/dbname

This script executes a set of CREATE TABLE statements and indexes in the
provided Postgres database. It is intended to be run before importing data
from the existing SQLite database.
"""
import argparse
import psycopg

SQL = '''
-- Users
CREATE TABLE IF NOT EXISTS users (
  user_id BIGINT PRIMARY KEY,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  has_started_diagnostics BOOLEAN DEFAULT FALSE,
  first_reminder_sent BOOLEAN DEFAULT FALSE,
  second_reminder_sent BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMP,
  diagnostics_started_at TIMESTAMP,
  diagnostics_completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- User identities
CREATE TABLE IF NOT EXISTS user_identities (
  id BIGSERIAL PRIMARY KEY,
  tg_user_id BIGINT,
  cookie_id TEXT,
  source TEXT NOT NULL CHECK (source IN ('telegram', 'site', 'miniapp')),
  linked_at TIMESTAMP DEFAULT now(),
  miniapp_id TEXT,
  UNIQUE (tg_user_id, cookie_id),
  CONSTRAINT fk_user FOREIGN KEY (tg_user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Site sessions
CREATE TABLE IF NOT EXISTS site_sessions (
  id BIGSERIAL PRIMARY KEY,
  cookie_id TEXT NOT NULL,
  tg_user_id BIGINT,
  session_start TIMESTAMP DEFAULT now(),
  session_end TIMESTAMP,
  user_agent TEXT,
  ip TEXT,
  source TEXT,
  utm_params JSONB,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  referrer TEXT,
  device_type TEXT,
  device_model TEXT,
  browser TEXT,
  os TEXT,
  screen_resolution TEXT,
  geo_country TEXT,
  geo_city TEXT,
  geo_region TEXT,
  page_id TEXT,
  entry_page TEXT,
  exit_page TEXT,
  session_duration INTEGER,
  page_views INTEGER DEFAULT 0,
  events_count INTEGER DEFAULT 0,
  CONSTRAINT fk_session_user FOREIGN KEY (tg_user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Site events
CREATE TABLE IF NOT EXISTS site_events (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL,
  tg_user_id BIGINT,
  event_type TEXT NOT NULL,
  event_name TEXT NOT NULL,
  page TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT now(),
  event_category TEXT,
  event_subtype TEXT,
  element_id TEXT,
  element_type TEXT,
  section TEXT,
  scroll_depth INTEGER,
  time_spent INTEGER,
  interaction_count INTEGER,
  previous_event_id BIGINT,
  step_number INTEGER,
  completion_rate REAL,
  error_message TEXT,
  custom_data JSONB,
  CONSTRAINT fk_event_session FOREIGN KEY (session_id) REFERENCES site_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_event_user FOREIGN KEY (tg_user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Diagnostics results
CREATE TABLE IF NOT EXISTS diagnostics_results (
  id BIGSERIAL PRIMARY KEY,
  tg_user_id BIGINT NOT NULL,
  cookie_id TEXT,
  result_json JSONB NOT NULL,
  completed_at TIMESTAMP DEFAULT now(),
  UNIQUE (tg_user_id, cookie_id),
  CONSTRAINT fk_diag_user FOREIGN KEY (tg_user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- AI interactions
CREATE TABLE IF NOT EXISTS ai_interactions (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL,
  tg_user_id BIGINT,
  cookie_id TEXT,
  messages_count INTEGER DEFAULT 0,
  topics JSONB,
  interaction_duration INTEGER,
  conversation_type TEXT,
  started_at TIMESTAMP DEFAULT now(),
  ended_at TIMESTAMP,
  CONSTRAINT fk_ai_session FOREIGN KEY (session_id) REFERENCES site_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_ai_user FOREIGN KEY (tg_user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- CTA clicks
CREATE TABLE IF NOT EXISTS cta_clicks (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL,
  tg_user_id BIGINT,
  cookie_id TEXT,
  cta_type TEXT NOT NULL,
  cta_text TEXT,
  cta_location TEXT,
  previous_step TEXT,
  step_duration INTEGER,
  created_at TIMESTAMP DEFAULT now(),
  CONSTRAINT fk_cta_session FOREIGN KEY (session_id) REFERENCES site_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_cta_user FOREIGN KEY (tg_user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Content views
CREATE TABLE IF NOT EXISTS content_views (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL,
  tg_user_id BIGINT,
  cookie_id TEXT,
  content_type TEXT NOT NULL,
  content_id TEXT NOT NULL,
  content_title TEXT,
  section TEXT,
  time_spent INTEGER,
  scroll_depth INTEGER,
  completion_rate REAL,
  viewed_at TIMESTAMP DEFAULT now(),
  CONSTRAINT fk_content_session FOREIGN KEY (session_id) REFERENCES site_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_content_user FOREIGN KEY (tg_user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Game actions
CREATE TABLE IF NOT EXISTS game_actions (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL,
  tg_user_id BIGINT,
  cookie_id TEXT,
  game_type TEXT NOT NULL,
  action_type TEXT NOT NULL,
  action_data JSONB,
  score INTEGER,
  achievement TEXT,
  duration INTEGER,
  created_at TIMESTAMP DEFAULT now(),
  CONSTRAINT fk_game_session FOREIGN KEY (session_id) REFERENCES site_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_game_user FOREIGN KEY (tg_user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_identities_tg_user ON user_identities(tg_user_id);
CREATE INDEX IF NOT EXISTS idx_user_identities_cookie ON user_identities(cookie_id);
CREATE INDEX IF NOT EXISTS idx_site_sessions_cookie ON site_sessions(cookie_id);
CREATE INDEX IF NOT EXISTS idx_site_sessions_tg_user ON site_sessions(tg_user_id);
CREATE INDEX IF NOT EXISTS idx_site_events_session ON site_events(session_id);
CREATE INDEX IF NOT EXISTS idx_site_events_tg_user ON site_events(tg_user_id);
CREATE INDEX IF NOT EXISTS idx_diagnostics_tg_user ON diagnostics_results(tg_user_id);

'''

def create_schema(pg_url: str):
    with psycopg.connect(pg_url) as conn:
        with conn.cursor() as cur:
            cur.execute(SQL)
            print('Postgres schema created/ensured')

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--pg', required=True, help='Postgres DATABASE_URL')
    args = parser.parse_args()
    create_schema(args.pg)

if __name__ == '__main__':
    main()
