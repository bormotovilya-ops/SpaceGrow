#!/usr/bin/env python3
import sqlite3
import csv
import os

SRC = 'telegram-bot/bot_users.db'
OUT_DIR = 'export/csv'

TABLES = [
    'users', 'user_identities', 'site_sessions', 'site_events',
    'content_views', 'diagnostics_results', 'ai_interactions',
    'cta_clicks', 'game_actions'
]

os.makedirs(OUT_DIR, exist_ok=True)

conn = sqlite3.connect(SRC)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

for table in TABLES:
    try:
        cur.execute(f'SELECT * FROM {table}')
    except Exception as e:
        print(f"Skipping {table}: {e}")
        continue

    rows = cur.fetchall()
    if not rows:
        print(f"Table {table}: no rows, creating empty CSV with headers")

    out_path = os.path.join(OUT_DIR, f"{table}.csv")
    with open(out_path, 'w', newline='', encoding='utf-8') as f:
        writer = None
        for r in rows:
            if writer is None:
                writer = csv.DictWriter(f, fieldnames=list(r.keys()))
                writer.writeheader()
            writer.writerow({k: ('' if r[k] is None else r[k]) for k in r.keys()})
        # If there were no rows, still try to get column names from pragma
        if writer is None:
            cur2 = conn.execute(f'PRAGMA table_info({table})')
            cols = [c[1] for c in cur2.fetchall()]
            writer = csv.DictWriter(f, fieldnames=cols)
            writer.writeheader()

    print(f"Wrote {out_path} ({len(rows)} rows)")

conn.close()
