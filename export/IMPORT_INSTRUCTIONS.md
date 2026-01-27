Руководство по импортy данных в Supabase (Postgres)

Кратко:
- В этой папке находятся CSV файлы: export/csv/*.csv
- Запустите создание схемы (scripts/create_pg_schema.py) в вашей среде, либо выполните SQL из scripts/create_pg_schema.py вручную
- Затем выполните команды psql \copy, чтобы загрузить CSV в таблицы Postgres

Шаги:

1) Установите psycopg (по необходимости) и/или убедитесь, что у вас есть psql.
   - Установка psycopg: python -m pip install "psycopg[binary]"
   - Установка psql см. документацию Postgres / Supabase

2) Создайте схему (один из вариантов):
   - Быстро: python scripts/create_pg_schema.py --pg "<YOUR_DATABASE_URL>"
   - Или через SQL: откройте scripts/create_pg_schema.py и выполните содержащиеся там CREATE TABLE в SQL editor Supabase

3) Импорт CSV через psql (рекомендую этот способ). Пример:

   psql "<YOUR_DATABASE_URL>" -c "\copy users FROM 'export/csv/users.csv' WITH (FORMAT csv, HEADER true)"

   Ниже приведён полный набор команд в файле export/pg_import.sql (использует psql \copy). Запустите их локально, заменив <YOUR_DATABASE_URL> на ваш.

4) После импорта проверьте примеры запросов:
   SELECT COUNT(*) FROM users;
   SELECT COUNT(*) FROM site_sessions;
   SELECT COUNT(*) FROM site_events LIMIT 5;

Замечания по несовместимостям:
- Поля JSON/metadata: в CSV они представлены в виде строк. В Postgres лучше хранить их в JSONB — в create_pg_schema.py мы объявили поля как JSONB для соответствующих колонок. \copy автоматически попытается вставить текст в JSONB (Postgres выполнит приведение), но если строки некорректны — предварительно проверьте/очистите.
- Булевы поля: в sqlite были 0/1 — Postgres корректно трактует 0/1 при вставке в boolean.
- AUTOINCREMENT в SQLite -> BIGSERIAL в Postgres. При импорте значений id из CSV можно пытаться сохранять идентичные id; если хотите использовать последовательности Postgres, можно не загружать id-колонки и позволить Postgres назначить их.

Безопасность:
- После тестирования рекомендую сбросить и пересоздать пароль Supabase, если вы временно публиковали DATABASE_URL в чатах.

Если хотите, я подготовлю файл export/pg_import.sql с командами \copy — я уже его сгенерировал в этой ветке.
