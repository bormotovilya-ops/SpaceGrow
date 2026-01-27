#!/usr/bin/env python3
"""
Import CSV files from export/csv into Postgres using psycopg (client-side COPY FROM STDIN).

Usage:
  python scripts/import_csv_to_pg.py --pg postgresql://user:pass@host:5432/dbname

The script expects CSV files in export/csv with names matching table names.
It will attempt COPY ... FROM STDIN WITH CSV HEADER for each file.
After import it prints row counts for each table.
"""
import argparse
import os
import psycopg

CSV_DIR = 'export/csv'
TABLES = [
    'users', 'user_identities', 'site_sessions', 'site_events',
    'content_views', 'diagnostics_results', 'ai_interactions',
    'cta_clicks', 'game_actions'
]


def import_table(conn, table):
    path = os.path.join(CSV_DIR, f"{table}.csv")
    if not os.path.exists(path):
        print(f"CSV for {table} not found at {path}, skipping")
        return

    with open(path, 'r', encoding='utf-8') as f:
        with conn.cursor() as cur:
            try:
                cur.copy(f"COPY {table} FROM STDIN WITH (FORMAT csv, HEADER true)", f)
                print(f"Imported {path} into {table}")
            except Exception as e:
                print(f"Error importing {path} into {table}: {e}")
                raise


def get_counts(conn):
    counts = {}
    with conn.cursor() as cur:
        for t in TABLES:
            try:
                cur.execute(f"SELECT COUNT(*) FROM {t}")
                counts[t] = cur.fetchone()[0]
            except Exception:
                counts[t] = None
    return counts


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--pg', required=True, help='Postgres DATABASE_URL')
    args = parser.parse_args()

    pg_url = args.pg

    print('Connecting to Postgres...')
    with psycopg.connect(pg_url, autocommit=True) as conn:
        print('Connected. Importing CSVs...')
        for t in TABLES:
            try:
                import_table(conn, t)
            except Exception:
                print(f"Failed to import table {t}, continuing with next")

        print('Import finished. Gathering counts:')
        counts = get_counts(conn)
        for t, c in counts.items():
            print(f"  {t}: {c}")


if __name__ == '__main__':
    main()
