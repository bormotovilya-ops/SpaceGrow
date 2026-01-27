-- Файл команд для psql: импорт CSV в Postgres
-- Замена: <YOUR_DATABASE_URL> на вашу строку подключения

-- Пример запуска:
-- psql "<YOUR_DATABASE_URL>" -f export/pg_import.sql

\echo 'Импорт users'
\copy users FROM 'export/csv/users.csv' WITH (FORMAT csv, HEADER true)

\echo 'Импорт user_identities'
\copy user_identities FROM 'export/csv/user_identities.csv' WITH (FORMAT csv, HEADER true)

\echo 'Импорт site_sessions'
\copy site_sessions FROM 'export/csv/site_sessions.csv' WITH (FORMAT csv, HEADER true)

\echo 'Импорт site_events'
\copy site_events FROM 'export/csv/site_events.csv' WITH (FORMAT csv, HEADER true)

\echo 'Импорт content_views'
\copy content_views FROM 'export/csv/content_views.csv' WITH (FORMAT csv, HEADER true)

\echo 'Импорт diagnostics_results (возможно пустой)'
\copy diagnostics_results FROM 'export/csv/diagnostics_results.csv' WITH (FORMAT csv, HEADER true)

\echo 'Импорт ai_interactions'
\copy ai_interactions FROM 'export/csv/ai_interactions.csv' WITH (FORMAT csv, HEADER true)

\echo 'Импорт cta_clicks'
\copy cta_clicks FROM 'export/csv/cta_clicks.csv' WITH (FORMAT csv, HEADER true)

\echo 'Импорт game_actions'
\copy game_actions FROM 'export/csv/game_actions.csv' WITH (FORMAT csv, HEADER true)

\echo 'Готово. Выполните проверки: SELECT COUNT(*) FROM users;'
